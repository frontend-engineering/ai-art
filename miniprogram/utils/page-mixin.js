/**
 * 页面通用 Mixin
 * 提供老年模式等通用功能
 */

module.exports = {
  /**
   * 页面加载时初始化老年模式
   */
  onLoad() {
    const app = getApp();
    // 从 app 读取老年模式状态
    const isElderMode = app.globalData.isElderMode;
    console.log('[PageMixin] onLoad - 老年模式状态:', isElderMode);
    this.setData({
      isElderMode: isElderMode
    });
  },

  /**
   * 页面显示时同步老年模式状态
   */
  onShow() {
    const app = getApp();
    // 每次显示页面时都同步状态
    const isElderMode = app.globalData.isElderMode;
    console.log('[PageMixin] onShow - 老年模式状态:', isElderMode);
    this.setData({
      isElderMode: isElderMode
    });
  },

  /**
   * 老年模式变化回调
   * 由 elder-mode-toggle 组件触发
   * @param {boolean} isElderMode 是否开启老年模式
   */
  onElderModeChange(isElderMode) {
    console.log('[PageMixin] onElderModeChange - 新状态:', isElderMode);
    
    // 立即更新状态，触发视图重新渲染
    this.setData({
      isElderMode: isElderMode
    }, () => {
      console.log('[PageMixin] setData 完成，当前状态:', this.data.isElderMode);
      
      // 强制触发页面重绘
      wx.nextTick(() => {
        console.log('[PageMixin] 页面重绘完成');
      });
    });
  }
};
