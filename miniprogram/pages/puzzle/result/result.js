/**
 * 时空拼图模式结果页
 * Requirements: 2.2, 8.1-8.4
 * 
 * 功能：
 * - 复用原网页 ResultPage 样式
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
      const puzzleData = app.globalData.puzzleData || {};
      if (puzzleData.generatedImages && puzzleData.generatedImages.length > 0) {
        imageUrl = puzzleData.generatedImages[0];
      }
    }
    
    if (!imageUrl) {
      wx.showToast({ title: '没有找到图片', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    
    console.log('[PuzzleResult] 加载图片:', imageUrl);
    this.setData({ selectedImage: imageUrl });
    this.saveToHistory(imageUrl);
  },

  onShow() {
    const app = getApp();
    this.setData({ isElderMode: app.globalData.isElderMode });
  },

  saveToHistory(imageUrl) {
    const app = getApp();
    const puzzleData = app.globalData.puzzleData || {};
    
    const historyItem = {
      id: puzzleData.taskId || Date.now().toString(),
      originalImages: puzzleData.uploadedImages || [],
      generatedImage: imageUrl,
      createdAt: new Date().toISOString(),
      isPaid: false,
      mode: 'puzzle'
    };
    
    saveHistory(historyItem);
    console.log('[PuzzleResult] 已保存到历史记录');
  },

  onImageLoad() {
    this.setData({ imageLoaded: true });
  },

  async handleSaveImage() {
    const { selectedImage, isSaving } = this.data;
    if (!selectedImage || isSaving) return;
    
    this.setData({ isSaving: true });
    
    try {
      wx.showLoading({ title: '保存中...', mask: true });
      
      const downloadRes = await new Promise((resolve, reject) => {
        wx.downloadFile({ url: selectedImage, success: resolve, fail: reject });
      });
      
      if (downloadRes.statusCode !== 200) throw new Error('下载图片失败');
      
      await savePosterToAlbum(downloadRes.tempFilePath);
      
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      
    } catch (err) {
      console.error('[PuzzleResult] 保存失败:', err);
      wx.hideLoading();
      
      if (err.errMsg && err.errMsg.includes('auth deny')) {
        wx.showModal({
          title: '提示',
          content: '需要您授权保存图片到相册',
          confirmText: '去设置',
          success: (res) => { if (res.confirm) wx.openSetting(); }
        });
      } else {
        wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      }
    } finally {
      this.setData({ isSaving: false });
    }
  },

  handleGenerateCard() {
    const { selectedImage } = this.data;
    wx.navigateTo({
      url: `/pages/card-editor/card-editor?image=${encodeURIComponent(selectedImage)}`,
      fail: (err) => {
        console.error('[PuzzleResult] 跳转贺卡编辑失败:', err);
        wx.showToast({ title: '功能开发中', icon: 'none' });
      }
    });
  },

  handleOrderProduct() {
    this.setData({ showProductModal: true });
  },

  closeProductModal() {
    this.setData({ showProductModal: false });
  },

  handleShare() {
    this.setData({ showShareModal: true });
  },

  closeShareModal() {
    this.setData({ showShareModal: false });
  },

  goBack() {
    wx.navigateBack({
      fail: () => wx.redirectTo({ url: '/pages/puzzle/launch/launch' })
    });
  },

  goHome() {
    wx.redirectTo({ url: '/pages/launch/launch' });
  },

  onShareAppMessage() {
    return getShareAppMessage({
      title: '看看我的AI全家福！🎊',
      imageUrl: this.data.selectedImage,
      path: '/pages/puzzle/launch/launch'
    });
  },

  onShareTimeline() {
    return getShareTimeline({
      title: '时空拼图 - AI全家福一键生成！',
      imageUrl: this.data.selectedImage
    });
  }
});
