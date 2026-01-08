/**
 * 富贵变身模式结果页
 * Requirements: 2.3, 8.1-8.4
 * 
 * 功能：
 * - 复用 puzzle/result 页面逻辑
 * - 实现保存图片、生成贺卡、定制产品、分享功能
 */

const { getShareAppMessage, getShareTimeline, savePosterToAlbum } = require('../../../utils/share');
const { saveHistory } = require('../../../utils/storage');

Page({
  data: {
    isElderMode: false,
    selectedImage: '',
    imageLoaded: false,
    showShareModal: false,
    showProductModal: false,
    isSaving: false
  },

  onLoad(options) {
    const app = getApp();
    this.setData({
      isElderMode: app.globalData.isElderMode
    });
    
    // 获取图片URL
    let imageUrl = '';
    if (options.image) {
      imageUrl = decodeURIComponent(options.image);
    } else {
      // 从全局数据获取
      const transformData = app.globalData.transformData || {};
      if (transformData.generatedImages && transformData.generatedImages.length > 0) {
        imageUrl = transformData.generatedImages[0];
      }
    }
    
    if (!imageUrl) {
      wx.showToast({
        title: '没有找到图片',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    console.log('[TransformResult] 加载图片:', imageUrl);
    this.setData({ selectedImage: imageUrl });
    
    // 保存到历史记录
    this.saveToHistory(imageUrl);
  },

  onShow() {
    const app = getApp();
    this.setData({
      isElderMode: app.globalData.isElderMode
    });
  },

  /**
   * 保存到历史记录
   */
  saveToHistory(imageUrl) {
    const app = getApp();
    const transformData = app.globalData.transformData || {};
    
    const historyItem = {
      id: transformData.taskId || Date.now().toString(),
      originalImages: transformData.uploadedImages || [],
      generatedImage: imageUrl,
      createdAt: new Date().toISOString(),
      isPaid: false,
      mode: 'transform'
    };
    
    saveHistory(historyItem);
    console.log('[TransformResult] 已保存到历史记录');
  },

  /**
   * 图片加载完成
   */
  onImageLoad() {
    this.setData({ imageLoaded: true });
  },

  /**
   * 保存图片到相册
   * Requirements: 8.1
   */
  async handleSaveImage() {
    const { selectedImage, isSaving } = this.data;
    if (!selectedImage || isSaving) return;
    
    this.setData({ isSaving: true });
    
    try {
      // 先下载图片到临时文件
      wx.showLoading({ title: '保存中...', mask: true });
      
      const downloadRes = await new Promise((resolve, reject) => {
        wx.downloadFile({
          url: selectedImage,
          success: resolve,
          fail: reject
        });
      });
      
      if (downloadRes.statusCode !== 200) {
        throw new Error('下载图片失败');
      }
      
      // 保存到相册
      await savePosterToAlbum(downloadRes.tempFilePath);
      
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      
    } catch (err) {
      console.error('[TransformResult] 保存失败:', err);
      wx.hideLoading();
      
      if (err.errMsg && err.errMsg.includes('auth deny')) {
        // 权限被拒绝，引导用户开启
        wx.showModal({
          title: '提示',
          content: '需要您授权保存图片到相册',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      } else {
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        });
      }
    } finally {
      this.setData({ isSaving: false });
    }
  },

  /**
   * 生成拜年贺卡
   * Requirements: 13.1
   */
  handleGenerateCard() {
    const { selectedImage } = this.data;
    wx.navigateTo({
      url: `/pages/card-editor/card-editor?image=${encodeURIComponent(selectedImage)}`,
      fail: (err) => {
        console.error('[TransformResult] 跳转贺卡编辑失败:', err);
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 定制产品
   * Requirements: 16.1-16.4
   */
  handleOrderProduct() {
    this.setData({ showProductModal: true });
  },

  /**
   * 关闭产品弹窗
   */
  closeProductModal() {
    this.setData({ showProductModal: false });
  },

  /**
   * 显示分享弹窗
   * Requirements: 8.1-8.4
   */
  handleShare() {
    this.setData({ showShareModal: true });
  },

  /**
   * 关闭分享弹窗
   */
  closeShareModal() {
    this.setData({ showShareModal: false });
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack({
      fail: () => {
        wx.redirectTo({
          url: '/pages/transform/launch/launch'
        });
      }
    });
  },

  /**
   * 返回首页
   */
  goHome() {
    wx.redirectTo({
      url: '/pages/launch/launch'
    });
  },

  /**
   * 分享给好友
   * Requirements: 8.1
   */
  onShareAppMessage() {
    return getShareAppMessage({
      title: '看看我的富贵变身效果！🎊',
      imageUrl: this.data.selectedImage,
      path: '/pages/transform/launch/launch'
    });
  },

  /**
   * 分享到朋友圈
   * Requirements: 8.1
   */
  onShareTimeline() {
    return getShareTimeline({
      title: '富贵变身 - 一秒变豪门！',
      imageUrl: this.data.selectedImage
    });
  }
});
