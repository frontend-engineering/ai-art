/**
 * 产品推荐组件
 * 复用原网页 ProductRecommendation 样式
 * 实现晶瓷画、卷轴等产品推荐展示
 */
Component({
  properties: {
    // 是否显示弹窗
    visible: {
      type: Boolean,
      value: false
    },
    // 选中的图片URL
    selectedImage: {
      type: String,
      value: ''
    }
  },
  
  data: {
    // 选中的产品类型
    selectedProduct: null,
    // 是否显示订单表单
    showOrderForm: false,
    // 是否显示预览
    showPreview: false,
    // 收货信息
    shippingInfo: {
      name: '',
      phone: '',
      address: ''
    },
    // 是否正在提交
    isSubmitting: false,
    // 产品列表
    products: [
      {
        type: 'crystal',
        name: '晶瓷画',
        price: 199,
        description: '高端晶瓷材质，色彩鲜艳，永不褪色',
        features: ['30x40cm尺寸', '晶瓷材质', '防水防潮', '赠送挂钩']
      },
      {
        type: 'scroll',
        name: '卷轴',
        price: 149,
        description: '传统卷轴工艺，古典雅致，适合中式装修',
        features: ['40x60cm尺寸', '绸缎材质', '实木轴头', '赠送挂绳']
      }
    ]
  },
  
  methods: {
    // 选择产品
    handleSelectProduct(e) {
      const { type } = e.currentTarget.dataset;
      this.setData({ selectedProduct: type });
    },
    
    // 预览产品效果
    handlePreview() {
      if (!this.data.selectedProduct) {
        wx.showToast({
          title: '请先选择一个产品',
          icon: 'none'
        });
        return;
      }
      this.setData({ showPreview: true });
    },
    
    // 进入订单表单
    handleOrder() {
      if (!this.data.selectedProduct) {
        wx.showToast({
          title: '请先选择一个产品',
          icon: 'none'
        });
        return;
      }
      this.setData({
        showPreview: false,
        showOrderForm: true
      });
    },
    
    // 返回上一步
    handleBack() {
      if (this.data.showPreview) {
        this.setData({ showPreview: false });
      } else {
        this.setData({
          showOrderForm: false,
          selectedProduct: null
        });
      }
    },
    
    // 更新收货信息
    onInputName(e) {
      this.setData({ 'shippingInfo.name': e.detail.value });
    },
    
    onInputPhone(e) {
      this.setData({ 'shippingInfo.phone': e.detail.value });
    },
    
    onInputAddress(e) {
      this.setData({ 'shippingInfo.address': e.detail.value });
    },
    
    // 提交订单
    async handleSubmitOrder() {
      const { selectedProduct, shippingInfo } = this.data;
      
      if (!selectedProduct) return;
      
      // 验证表单
      if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
        wx.showToast({
          title: '请填写完整的收货信息',
          icon: 'none'
        });
        return;
      }
      
      // 验证手机号
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(shippingInfo.phone)) {
        wx.showToast({
          title: '请输入正确的手机号',
          icon: 'none'
        });
        return;
      }
      
      this.setData({ isSubmitting: true });
      
      try {
        this.triggerEvent('order', {
          productType: selectedProduct,
          shippingInfo
        });
        
        // 重置表单
        this.setData({
          shippingInfo: { name: '', phone: '', address: '' },
          showOrderForm: false,
          selectedProduct: null
        });
        
      } catch (error) {
        console.error('提交订单失败:', error);
        wx.showToast({
          title: '提交失败，请重试',
          icon: 'none'
        });
      } finally {
        this.setData({ isSubmitting: false });
      }
    },
    
    // 暂不购买
    handleSkip() {
      this.triggerEvent('skip');
    },
    
    // 关闭弹窗
    handleClose() {
      this.triggerEvent('close');
    },
    
    // 获取选中的产品信息
    getSelectedProductInfo() {
      return this.data.products.find(p => p.type === this.data.selectedProduct);
    },
    
    // 阻止冒泡
    preventBubble() {}
  }
});
