/**
 * 时空拼图模式启动页
 * Requirements: 2.2
 * 
 * 功能：
 * - 展示模式介绍和立即制作按钮
 * - 复用原网页 PuzzleLaunchScreen 样式
 */

Page({
  data: {
    isElderMode: false,
    // 模式配置
    modeConfig: {
      name: '时空拼图',
      icon: '🧩',
      slogan: '跨越时空，团圆相聚',
      description: '多张照片 → AI合成全家福',
      uploadGuide: '上传2-5张家人照片，AI将为您合成一张完美全家福',
      buttonText: '立即制作全家福'
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
   * Requirements: 2.2
   */
  handleStart() {
    wx.navigateTo({
      url: '/pages/puzzle/upload/upload',
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
  viewHistory() {
    wx.navigateTo({
      url: '/pages/puzzle/history/history',
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
      title: '时空拼图 - 跨越时空，团圆相聚！',
      path: '/pages/puzzle/launch/launch',
      imageUrl: '/assets/images/share-puzzle.png'
    };
  },

  /**
   * 分享到朋友圈
   * Requirements: 8.1
   */
  onShareTimeline() {
    return {
      title: '时空拼图 - 多人合成全家福',
      imageUrl: '/assets/images/share-puzzle.png'
    };
  }
});
