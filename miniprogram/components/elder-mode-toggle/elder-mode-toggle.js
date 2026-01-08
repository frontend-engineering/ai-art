/**
 * 老年模式切换组件
 * 实现老年模式切换按钮（字体放大、按钮放大）
 */
Component({
  properties: {
    // 位置: bottom-right, bottom-left, top-right, top-left
    position: {
      type: String,
      value: 'top-right'
    }
  },
  
  data: {
    isElderMode: false
  },
  
  lifetimes: {
    attached() {
      const app = getApp();
      this.setData({
        isElderMode: app.globalData.isElderMode
      });
    }
  },
  
  methods: {
    // 切换老年模式
    toggleElderMode() {
      const app = getApp();
      app.toggleElderMode();
      
      this.setData({
        isElderMode: app.globalData.isElderMode
      });
      
      // 震动反馈
      wx.vibrateShort({ type: 'medium' });
      
      // 提示用户
      wx.showToast({
        title: app.globalData.isElderMode ? '已开启大字模式' : '已关闭大字模式',
        icon: 'none',
        duration: 1500
      });
      
      // 触发事件通知页面
      this.triggerEvent('change', { isElderMode: app.globalData.isElderMode });
    }
  }
});
