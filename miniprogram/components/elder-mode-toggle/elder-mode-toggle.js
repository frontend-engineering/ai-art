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
      console.log('[ElderModeToggle] attached - 老年模式状态:', app.globalData.isElderMode);
    }
  },
  
  pageLifetimes: {
    show() {
      const app = getApp();
      this.setData({
        isElderMode: app.globalData.isElderMode
      });
      console.log('[ElderModeToggle] show - 老年模式状态:', app.globalData.isElderMode);
    }
  },
  
  methods: {
    // 切换老年模式
    toggleElderMode() {
      const app = getApp();
      console.log('[ElderModeToggle] 切换前状态:', app.globalData.isElderMode);
      
      app.toggleElderMode();
      
      console.log('[ElderModeToggle] 切换后状态:', app.globalData.isElderMode);
      
      this.setData({
        isElderMode: app.globalData.isElderMode
      });
      
      // 震动反馈
      wx.vibrateShort({ type: 'medium' });
      
      // 提示用户
      wx.showToast({
        title: app.globalData.isElderMode ? '已开启大字模式' : '已关闭大字模式',
        icon: 'none',
        duration: 1000
      });
      
      // 触发事件通知页面
      this.triggerEvent('change', { isElderMode: app.globalData.isElderMode });
      
      // 通知所有页面刷新（通过发布订阅模式）
      const pages = getCurrentPages();
      console.log('[ElderModeToggle] 通知页面数量:', pages.length);
      pages.forEach((page, index) => {
        if (page.onElderModeChange && typeof page.onElderModeChange === 'function') {
          console.log('[ElderModeToggle] 通知页面', index, ':', page.route);
          page.onElderModeChange(app.globalData.isElderMode);
        } else {
          console.log('[ElderModeToggle] 页面', index, '未实现 onElderModeChange:', page.route);
        }
      });
      
      // 延迟刷新当前页面，确保样式立即生效
      setTimeout(() => {
        const currentPages = getCurrentPages();
        const currentPage = currentPages[currentPages.length - 1];
        if (currentPage && currentPage.onShow) {
          console.log('[ElderModeToggle] 刷新当前页面');
          currentPage.onShow();
        }
      }, 100);
    }
  }
});
