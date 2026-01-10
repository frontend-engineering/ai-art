/**
 * 支付弹窗组件
 * 复用原网页 PaymentModal 样式
 * 实现套餐选择和微信支付集成
 * 
 * 使用 CloudBase 云函数实现支付
 */
const cloudbasePayment = require('../../utils/cloudbase-payment');

// 套餐价格等级映射
const PACKAGE_LEVEL = {
  'free': 0,
  'basic': 1,
  'premium': 2
};

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
    },
    // 当前付费状态
    currentPaymentStatus: {
      type: String,
      value: 'free'
    }
  },
  
  data: {
    // 选中的套餐
    selectedPackage: 'free',
    // 套餐列表 - 从 cloudbase-payment 模块获取
    packages: [],
    allPackages: Object.values(cloudbasePayment.PACKAGES),
    // 支付状态
    isPaying: false,
    paymentStatus: 'idle', // idle, processing, success, failed
    error: null,
    outTradeNo: null
  },

  observers: {
    'visible, currentPaymentStatus': function(visible, currentPaymentStatus) {
      if (visible) {
        this.filterPackages(currentPaymentStatus);
      }
    }
  },
  
  methods: {
    // 根据当前付费状态过滤可选套餐
    filterPackages(currentStatus) {
      const currentLevel = PACKAGE_LEVEL[currentStatus] || 0;
      const allPackages = Object.values(cloudbasePayment.PACKAGES);
      
      // 只显示比当前等级更高或相等的套餐
      const filteredPackages = allPackages.filter(pkg => {
        const pkgLevel = PACKAGE_LEVEL[pkg.id] || 0;
        return pkgLevel >= currentLevel;
      });
      
      // 默认选中第一个可用套餐
      const defaultSelected = filteredPackages.length > 0 ? filteredPackages[0].id : 'free';
      
      this.setData({
        packages: filteredPackages,
        selectedPackage: defaultSelected,
        paymentStatus: 'idle',
        error: null
      });
    },

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
        // 使用 cloudbase-payment 模块完成支付流程
        const result = await cloudbasePayment.pay({
          packageType: selectedPackage,
          generationId: this.data.generationId,
          userId: app.globalData.userId
        });
        
        if (result.success) {
          // 支付成功
          wx.showToast({ title: '支付成功', icon: 'success' });
          this.setData({
            isPaying: false,
            paymentStatus: 'success',
            outTradeNo: result.data.outTradeNo
          });
          
          setTimeout(() => {
            this.triggerEvent('complete', { 
              packageType: selectedPackage,
              outTradeNo: result.data.outTradeNo
            });
          }, 1000);
        } else if (result.cancelled) {
          // 用户取消支付
          this.setData({
            isPaying: false,
            paymentStatus: 'idle'
          });
        } else {
          throw new Error(result.message || '支付失败');
        }
        
      } catch (err) {
        console.error('支付失败:', err);
        
        // 用户取消支付不显示错误
        if (err.cancelled || (err.errMsg && err.errMsg.includes('cancel'))) {
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
    
    // 查询订单状态
    async queryOrderStatus() {
      const { outTradeNo } = this.data;
      if (!outTradeNo) return null;
      
      try {
        const result = await cloudbasePayment.queryOrder(outTradeNo);
        return result;
      } catch (err) {
        console.error('查询订单失败:', err);
        return null;
      }
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
