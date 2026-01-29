/**
 * 开发者模式测试页面
 * 用于测试和演示开发者模式功能
 */

Page({
  data: {
    devModeActive: false,
    usageCount: 0,
    statusBarHeight: 0,
    navBarHeight: 0,
    menuRight: 0,
    showDevPanel: false
  },

  onLoad() {
    const app = getApp();
    
    // 获取导航栏信息
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      menuRight: app.globalData.menuButtonInfo?.right || 0,
      usageCount: app.globalData.usageCount
    });

    // 初始化开发者模式
    this.initDevMode();
  },

  /**
   * 初始化开发者模式
   */
  initDevMode() {
    const app = getApp();
    const devMode = app.globalData.devModeUtil;
    
    if (devMode) {
      console.log('[DevTest] 开发者模式工具已加载');
      this.setData({
        devModeActive: devMode.isDevModeActive()
      });
    }
  },

  /**
   * 快速激活开发者模式（点击5次）
   */
  handleStatusBarTap() {
    const app = getApp();
    const devMode = app.globalData.devModeUtil;
    
    if (devMode) {
      devMode.handleTap(() => {
        this.setData({ devModeActive: true });
        this.showDevPanel();
      });
    }
  },

  /**
   * 显示开发者面板
   */
  showDevPanel() {
    this.setData({ showDevPanel: true });
  },

  /**
   * 关闭开发者面板
   */
  closeDevPanel() {
    this.setData({ showDevPanel: false });
  },

  /**
   * 处理开发者面板的更新事件
   */
  onDevPanelUpdate(e) {
    const { usageCount } = e.detail;
    this.setData({ usageCount });
    
    // 同时更新全局数据
    const app = getApp();
    app.globalData.usageCount = usageCount;
  }
});
