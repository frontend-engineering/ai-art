/**
 * 富贵变身模式启动页
 * Requirements: 2.3
 * 
 * 功能：
 * - 展示模式介绍和立即制作按钮
 * - 添加"我的记录"入口
 * - 复用原网页 TransformLaunchScreen 样式
 */

Page({
  data: {
    isElderMode: false,
    // 模式配置
    modeConfig: {
      name: '富贵变身',
      icon: '👑',
      slogan: '背景太土？一秒变豪门',
      description: '普通背景变身富贵豪门',
      uploadGuide: '上传一张全家福，AI将为您更换高端背景',
      buttonText: '立即变身豪门'
    }
  },

  onLoad() {
    const app = getApp();
    this.setData({
      isElderMode: app.globalData.isElderMode
    });
  },

  onShow() {
    // 页面显示时更新老年模式状态
    const app = getApp();
    this.setData({
      isElderMode: app.globalData.isElderMode
    });
  },

  /**
   * 开始制作 - 跳转到上传页
   * Requirements: 2.3
   */
  handleStart() {
    wx.navigateTo({
      url: '/pages/transform/upload/upload',
      fail: (err) => {
        console.error('跳转上传页失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 查看历史记录
   * Requirements: 11.1-11.4
   */
  handleHistory() {
    wx.navigateTo({
      url: '/pages/transform/history/history',
      fail: (err) => {
        console.error('跳转历史记录失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 返回首页
   */
  goBack() {
    wx.navigateBack({
      fail: () => {
        wx.redirectTo({
          url: '/pages/launch/launch'
        });
      }
    });
  },

  /**
   * 分享给好友
   * Requirements: 8.1
   */
  onShareAppMessage() {
    return {
      title: '富贵变身 - 一秒变豪门！',
      path: '/pages/transform/launch/launch',
      imageUrl: '/assets/images/share-transform.png'
    };
  },

  /**
   * 分享到朋友圈
   * Requirements: 8.1
   */
  onShareTimeline() {
    return {
      title: '富贵变身 - 背景太土？一秒变豪门',
      imageUrl: '/assets/images/share-transform.png'
    };
  },

  /**
   * 图片加载成功
   */
  onImageLoad(e) {
    console.log('[TransformLaunch] 图片加载成功:', e.detail);
  },

  /**
   * 图片加载失败
   */
  onImageError(e) {
    console.error('[TransformLaunch] 图片加载失败:', e.detail);
    wx.showToast({
      title: '图片加载失败',
      icon: 'none'
    });
  }
});
