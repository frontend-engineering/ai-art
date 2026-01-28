/**
 * 加载组件
 * 复用原网页灯笼旋转动画样式
 */
Component({
  properties: {
    // 加载提示文字
    text: {
      type: String,
      value: '加载中...'
    },
    // 尺寸: small, medium, large
    size: {
      type: String,
      value: 'medium'
    },
    // 是否显示文字
    showText: {
      type: Boolean,
      value: false
    }
  },
  
  data: {
    lanternSize: '80rpx'
  },
  
  lifetimes: {
    attached() {
      this.updateSize();
    }
  },
  
  observers: {
    'size': function(size) {
      this.updateSize();
    }
  },
  
  methods: {
    updateSize() {
      const sizeMap = {
        small: '50rpx',
        medium: '80rpx',
        large: '120rpx'
      };
      this.setData({
        lanternSize: sizeMap[this.data.size] || sizeMap.medium
      });
    }
  }
});
