/**
 * 四宫格选择器组件
 * 复用原网页 FourGridSelector 样式
 * 实现四宫格图片选择和选中高亮效果
 */
const { getAssetUrl } = require('../../utils/oss-assets');

Component({
  properties: {
    // 图片URL数组
    images: {
      type: Array,
      value: []
    },
    // 当前选中的图片URL
    selectedImage: {
      type: String,
      value: ''
    },
    // 是否正在加载
    isLoading: {
      type: Boolean,
      value: false
    }
  },
  
  data: {
    // 图片加载状态
    imageLoadStates: [false, false, false, false],
    // 揭幕动画状态
    revealStates: [false, false, false, false],
    // 提示信息显示状态
    showHint: false,
    // OSS 资源 URL
    lanternUrl: getAssetUrl('lantern.png')
  },
  
  observers: {
    'images': function(images) {
      if (images && images.length > 0) {
        this.setData({
          imageLoadStates: [false, false, false, false],
          revealStates: [false, false, false, false]
        });
      }
    },
    'selectedImage': function(selectedImage) {
      if (selectedImage) {
        this.setData({ showHint: true });
        // 3秒后自动隐藏提示
        setTimeout(() => {
          this.setData({ showHint: false });
        }, 3000);
      }
    }
  },
  
  methods: {
    // 处理图片点击选择
    handleSelect(e) {
      const { url } = e.currentTarget.dataset;
      this.triggerEvent('select', { url });
      
      // 震动反馈
      wx.vibrateShort({ type: 'light' });
    },
    
    // 处理图片长按预览
    handlePreview(e) {
      const { url } = e.currentTarget.dataset;
      wx.previewImage({
        current: url,
        urls: this.data.images
      });
    },
    
    // 处理图片加载完成
    handleImageLoad(e) {
      const { index } = e.currentTarget.dataset;
      const imageLoadStates = [...this.data.imageLoadStates];
      imageLoadStates[index] = true;
      this.setData({ imageLoadStates });
      
      // 延迟启动揭幕动画
      setTimeout(() => {
        const revealStates = [...this.data.revealStates];
        revealStates[index] = true;
        this.setData({ revealStates });
      }, 100);
    },
    
    // 处理确认选择
    handleConfirm() {
      if (!this.data.selectedImage) {
        wx.showToast({
          title: '请先选择一张图片',
          icon: 'none'
        });
        return;
      }
      this.triggerEvent('confirm', { url: this.data.selectedImage });
    }
  }
});
