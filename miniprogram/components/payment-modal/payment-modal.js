/**
 * 支付弹窗组件
 * 复用原网页 PaymentModal 样式
 * 实现套餐选择和微信支付集成
 */
const { paymentAPI } = require('../../utils/api');

Component({
  properties: {
    // 是否显示弹窗
    visible: {
      type: Boolean,
      value: false
    },
    // 生成记录ID
    generationId: {
      type: String,
      value: ''
    }
  },
  
  data: {
    // 选中的套餐
    selectedPackage: 'free',
    // 套餐列表
    packages: [
      {
        id: 'free',
        name: '免费版',
        price: 0,
        features: ['标清图片', '可直接保存', '基础功能']
      },
      {
        id: 'basic',
        name: '9.9元尝鲜包',
        price: 9.9,
        features: ['高清无水印', '3-5人合成', '热门模板']
      },
      {
        id: 'premium',
        name: '29.9元尊享包',
        price: 29.9,
        features: ['4K原图', '微动态', '贺卡', '全模板', '优先队列'],
        recommended: true
      }
    ],
    // 支付状态
    isPaying: false,
    paymentStatus: 'idle', // idle, processing, success, failed
    error: null,
    orderId: null
  },
  
  methods: {
    // 选择套餐
    selectPackage(e) {
      const { id } = e.currentTarget.dataset;
      this.setData({
        selectedPackage: id,
        error: null
      });
    },
    
    // 处理支付
    async handlePay() {
      if (this.data.isPaying) return;
      
      const app = getApp();
      const { selectedPackage } = this.data;
      
      // 免费版直接完成
      if (selectedPackage === 'free') {
        this.setData({ paymentStatus: 'success' });
        setTimeout(() => {
          this.triggerEvent('complete', { packageType: 'free' });
        }, 800);
        return;
      }
      
      this.setData({
        isPaying: true,
        paymentStatus: 'processing',
        error: null
      });
      
      try {
        // 创建订单
        const orderResult = await paymentAPI.createOrder({
          userId: app.globalData.userId,
          generationId: this.data.generationId,
          packageType: selectedPackage
        });
        
        if (!orderResult.success || !orderResult.data?.orderId) {
          throw new Error('创建支付订单失败');
        }
        
        const orderId = orderResult.data.orderId;
        this.setData({ orderId });
        
        // 获取支付参数
        const payParams = await paymentAPI.getWeChatPayParams(
          orderId,
          app.globalData.openid
        );
        
        if (!payParams.success) {
          throw new Error('获取支付参数失败');
        }
        
        // 发起微信支付
        await this.requestPayment(payParams.data);
        
        // 支付成功
        wx.showToast({ title: '支付成功', icon: 'success' });
        this.setData({
          isPaying: false,
          paymentStatus: 'success'
        });
        
        setTimeout(() => {
          this.triggerEvent('complete', { packageType: selectedPackage });
        }, 1000);
        
      } catch (err) {
        console.error('支付失败:', err);
        
        // 用户取消支付不显示错误
        if (err.errMsg && err.errMsg.includes('cancel')) {
          this.setData({
            isPaying: false,
            paymentStatus: 'idle'
          });
          return;
        }
        
        this.setData({
          isPaying: false,
          paymentStatus: 'failed',
          error: err.message || '支付失败，请重试'
        });
      }
    },
    
    // 调用微信支付
    requestPayment(params) {
      return new Promise((resolve, reject) => {
        wx.requestPayment({
          timeStamp: params.timeStamp,
          nonceStr: params.nonceStr,
          package: params.package,
          signType: params.signType || 'MD5',
          paySign: params.paySign,
          success: resolve,
          fail: reject
        });
      });
    },
    
    // 重试支付
    handleRetry() {
      this.setData({
        error: null,
        paymentStatus: 'idle'
      });
      this.handlePay();
    },
    
    // 关闭弹窗
    handleClose() {
      if (this.data.isPaying) return;
      this.triggerEvent('close');
    },
    
    // 阻止冒泡
    preventBubble() {}
  }
});
