/**
 * 时空拼图模式结果页
 * Requirements: 2.2, 8.1-8.4
 * 
 * 功能：
 * - 复用原网页 ResultPage 样式
 * - 实现保存图片、生成贺卡、定制产品、分享功能
 * - Live Photo 微动态功能（尊享包用户）
 * - 付费下载功能
 */

const { getShareAppMessage, getShareTimeline, savePosterToAlbum } = require('../../../utils/share');
const { saveHistory } = require('../../../utils/storage');
const { videoAPI } = require('../../../utils/api');
const cloudbasePayment = require('../../../utils/cloudbase-payment');

Page({
  data: {
    isElderMode: false,
    selectedImage: '',
    imageLoaded: false,
    showShareModal: false,
    showProductModal: false,
    showPaymentModal: false,
    isSaving: false,
    // Live Photo 相关
    hasLivePhoto: false,
    isPlayingLivePhoto: false,
    livePhotoUrl: '',
    videoTaskId: '',
    isGeneratingVideo: false,
    videoProgress: 0,
    videoProgressText: '',
    isPremiumUser: false,
    // 付费状态
    paymentStatus: 'free',
    generationId: ''
  },

  videoPollingTimer: null,

  onLoad(options) {
    const app = getApp();
    const paymentStatus = wx.getStorageSync('paymentStatus') || 'free';
    
    this.setData({
      isElderMode: app.globalData.isElderMode,
      isPremiumUser: paymentStatus === 'premium' || paymentStatus === 'basic',
      paymentStatus: paymentStatus,
      hasLivePhoto: options.hasLivePhoto === 'true',
      generationId: options.generationId || Date.now().toString()
    });
    
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
    
    if (options.livePhotoUrl) {
      this.setData({ 
        livePhotoUrl: decodeURIComponent(options.livePhotoUrl),
        hasLivePhoto: true 
      });
      this.autoPlayLivePhoto();
    }
  },

  onShow() {
    const app = getApp();
    const paymentStatus = wx.getStorageSync('paymentStatus') || 'free';
    this.setData({
      isElderMode: app.globalData.isElderMode,
      isPremiumUser: paymentStatus === 'premium' || paymentStatus === 'basic',
      paymentStatus: paymentStatus
    });
  },

  onUnload() {
    if (this.videoPollingTimer) {
      clearInterval(this.videoPollingTimer);
      this.videoPollingTimer = null;
    }
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

  autoPlayLivePhoto() {
    if (!this.data.hasLivePhoto || !this.data.livePhotoUrl) return;
    
    setTimeout(() => {
      this.setData({ isPlayingLivePhoto: true });
      setTimeout(() => {
        this.setData({ isPlayingLivePhoto: false });
      }, 5000);
    }, 500);
  },

  toggleLivePhoto() {
    if (!this.data.hasLivePhoto || !this.data.livePhotoUrl) return;
    this.setData({ isPlayingLivePhoto: !this.data.isPlayingLivePhoto });
    wx.vibrateShort({ type: 'light' });
  },

  async handleGenerateLivePhoto() {
    const { selectedImage, isGeneratingVideo, isPremiumUser } = this.data;
    
    if (isGeneratingVideo) return;
    
    if (!isPremiumUser) {
      wx.showModal({
        title: '尊享功能',
        content: '微动态功能仅对尊享包用户开放，是否升级套餐？',
        confirmText: '立即升级',
        cancelText: '暂不需要',
        success: (res) => {
          if (res.confirm) {
            this.triggerEvent('showPayment');
          }
        }
      });
      return;
    }
    
    const userId = wx.getStorageSync('userId');
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    this.setData({
      isGeneratingVideo: true,
      videoProgress: 0,
      videoProgressText: '创建任务中...'
    });
    
    try {
      console.log('[LivePhoto] 开始生成微动态');
      
      const result = await videoAPI.generateVideo({
        imageUrl: selectedImage,
        userId: userId,
        motionBucketId: 10,
        fps: 10,
        videoLength: 5,
        dynamicType: 'festival'
      });
      
      if (!result.success || !result.data?.taskId) {
        throw new Error(result.message || '创建任务失败');
      }
      
      const taskId = result.data.taskId;
      console.log('[LivePhoto] 任务创建成功:', taskId);
      
      this.setData({
        videoTaskId: taskId,
        videoProgressText: '生成中...'
      });
      
      this.startVideoPolling(taskId);
      
    } catch (err) {
      console.error('[LivePhoto] 生成失败:', err);
      this.setData({
        isGeneratingVideo: false,
        videoProgress: 0,
        videoProgressText: ''
      });
      
      wx.showToast({
        title: err.message || '生成失败，请重试',
        icon: 'none'
      });
    }
  },

  startVideoPolling(taskId) {
    if (this.videoPollingTimer) {
      clearInterval(this.videoPollingTimer);
    }
    
    let pollCount = 0;
    const maxPolls = 60;
    
    this.videoPollingTimer = setInterval(async () => {
      pollCount++;
      
      if (pollCount > maxPolls) {
        clearInterval(this.videoPollingTimer);
        this.videoPollingTimer = null;
        this.setData({
          isGeneratingVideo: false,
          videoProgressText: ''
        });
        wx.showToast({ title: '生成超时，请重试', icon: 'none' });
        return;
      }
      
      try {
        const result = await videoAPI.getVideoTaskStatus(taskId);
        
        if (!result.success) {
          console.log('[LivePhoto] 查询状态失败，继续轮询');
          return;
        }
        
        const taskData = result.data?.Result?.data || {};
        const status = taskData.status;
        
        if (status === 'running') {
          const progress = Math.min(90, pollCount * 3);
          this.setData({
            videoProgress: progress,
            videoProgressText: `生成中 ${progress}%`
          });
        }
        
        if (status === 'done' && taskData.video_url) {
          clearInterval(this.videoPollingTimer);
          this.videoPollingTimer = null;
          
          console.log('[LivePhoto] 视频生成完成:', taskData.video_url);
          
          this.setData({
            videoProgress: 100,
            videoProgressText: '转换中...'
          });
          
          await this.convertToLivePhoto(taskData.video_url);
        }
        
        if (status === 'failed') {
          clearInterval(this.videoPollingTimer);
          this.videoPollingTimer = null;
          
          this.setData({
            isGeneratingVideo: false,
            videoProgress: 0,
            videoProgressText: ''
          });
          
          wx.showToast({ title: '生成失败，请重试', icon: 'none' });
        }
        
      } catch (err) {
        console.error('[LivePhoto] 轮询出错:', err);
      }
    }, 2000);
  },

  async convertToLivePhoto(videoUrl) {
    const userId = wx.getStorageSync('userId');
    
    try {
      const result = await videoAPI.convertToLivePhoto(videoUrl, userId);
      
      if (!result.success || !result.data?.livePhotoUrl) {
        throw new Error(result.message || '转换失败');
      }
      
      console.log('[LivePhoto] 转换成功:', result.data.livePhotoUrl);
      
      this.setData({
        isGeneratingVideo: false,
        hasLivePhoto: true,
        livePhotoUrl: result.data.livePhotoUrl,
        videoProgress: 0,
        videoProgressText: ''
      });
      
      wx.showToast({ title: '微动态生成成功', icon: 'success' });
      this.autoPlayLivePhoto();
      
    } catch (err) {
      console.error('[LivePhoto] 转换失败:', err);
      this.setData({
        isGeneratingVideo: false,
        videoProgress: 0,
        videoProgressText: ''
      });
      
      wx.showToast({ title: err.message || '转换失败', icon: 'none' });
    }
  },

  async handleSaveImage() {
    const { selectedImage, isSaving, paymentStatus } = this.data;
    if (!selectedImage || isSaving) return;
    
    // 未付费用户显示支付弹窗
    if (paymentStatus === 'free') {
      this.setData({ showPaymentModal: true });
      return;
    }
    
    // 已付费，直接保存
    await this.doSaveImage();
  },

  showUpgradeModal() {
    const { paymentStatus } = this.data;
    if (paymentStatus !== 'premium') {
      this.setData({ showPaymentModal: true });
    }
  },

  async doSaveImage() {
    const { selectedImage } = this.data;
    
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

  onPaymentComplete(e) {
    const { packageType } = e.detail;
    console.log('[PuzzleResult] 支付完成:', packageType);
    
    const newPaymentStatus = packageType;
    wx.setStorageSync('paymentStatus', newPaymentStatus);
    
    this.setData({
      showPaymentModal: false,
      paymentStatus: newPaymentStatus,
      isPremiumUser: newPaymentStatus === 'premium' || newPaymentStatus === 'basic'
    });
    
    // 支付/选择完成后自动保存图片
    setTimeout(() => {
      this.doSaveImage();
    }, 500);
  },

  closePaymentModal() {
    this.setData({ showPaymentModal: false });
  },

  async handleSaveLivePhoto() {
    const { livePhotoUrl, isSaving } = this.data;
    if (!livePhotoUrl || isSaving) return;
    
    this.setData({ isSaving: true });
    
    try {
      wx.showLoading({ title: '保存中...', mask: true });
      
      const downloadRes = await new Promise((resolve, reject) => {
        wx.downloadFile({ url: livePhotoUrl, success: resolve, fail: reject });
      });
      
      if (downloadRes.statusCode !== 200) throw new Error('下载视频失败');
      
      await new Promise((resolve, reject) => {
        wx.saveVideoToPhotosAlbum({
          filePath: downloadRes.tempFilePath,
          success: resolve,
          fail: reject
        });
      });
      
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      
    } catch (err) {
      console.error('[PuzzleResult] 保存Live Photo失败:', err);
      wx.hideLoading();
      
      if (err.errMsg && err.errMsg.includes('auth deny')) {
        wx.showModal({
          title: '提示',
          content: '需要您授权保存视频到相册',
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
