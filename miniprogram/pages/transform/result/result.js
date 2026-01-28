/**
 * 富贵变身模式结果页
 * Requirements: 2.3, 8.1-8.4
 * 
 * 功能：
 * - 复用 puzzle/result 页面逻辑
 * - 实现保存图片、生成贺卡、定制产品、分享功能
 * - Live Photo 微动态功能（尊享包用户）
 * - 付费下载功能
 */

const { getShareAppMessage, getShareTimeline, savePosterToAlbum } = require('../../../utils/share');
const { saveHistory } = require('../../../utils/storage');
const { videoAPI } = require('../../../utils/api');
const cloudbasePayment = require('../../../utils/cloudbase-payment');
const { checkAndShowModal } = require('../../../utils/usageModal');

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
    generationId: '',
    // 使用次数模态框
    showUsageModal: false,
    usageModalType: '',
    usageCount: 0
  },

  // 视频轮询定时器
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
    
    // 如果有 Live Photo，自动播放5秒
    if (options.livePhotoUrl) {
      this.setData({ 
        livePhotoUrl: decodeURIComponent(options.livePhotoUrl),
        hasLivePhoto: true 
      });
      this.autoPlayLivePhoto();
    }
  },

  async onShow() {
    const app = getApp();
    const paymentStatus = wx.getStorageSync('paymentStatus') || 'free';
    this.setData({
      isElderMode: app.globalData.isElderMode,
      isPremiumUser: paymentStatus === 'premium' || paymentStatus === 'basic',
      paymentStatus: paymentStatus
    });
    
    // 加载使用次数
    await this.loadUsageCount();
    
    // 检查并显示使用次数提醒模态框
    this.checkUsageModal();
  },

  /**
   * 加载使用次数
   */
  async loadUsageCount() {
    try {
      const app = getApp();
      const result = await app.updateUsageCount();
      
      if (result) {
        this.setData({
          usageCount: result.usageCount,
          userType: result.userType,
          paymentStatus: result.paymentStatus || 'free'
        });
      }
    } catch (err) {
      console.error('[TransformResult] 加载使用次数失败:', err);
    }
  },

  onUnload() {
    // 清理定时器
    if (this.videoPollingTimer) {
      clearInterval(this.videoPollingTimer);
      this.videoPollingTimer = null;
    }
  },

  /**
   * 使用次数更新回调（由app.js调用）
   */
  onUsageCountUpdate(data) {
    console.log('[TransformResult] 使用次数已更新:', data);
    this.setData({
      usageCount: data.usageCount,
      userType: data.userType,
      paymentStatus: data.paymentStatus || 'free'
    });
  },

  /**
   * 检查并显示使用次数提醒模态框
   */
  async checkUsageModal() {
    const userId = wx.getStorageSync('userId');
    if (!userId) return;
    
    const modalConfig = await checkAndShowModal(userId, 'result');
    if (modalConfig) {
      this.setData({
        showUsageModal: true,
        usageModalType: modalConfig.modalType,
        usageCount: modalConfig.usageCount
      });
    }
  },

  /**
   * 关闭使用次数模态框
   */
  onUsageModalClose() {
    this.setData({ showUsageModal: false });
  },

  /**
   * 使用次数模态框 - 分享按钮
   */
  onUsageModalShare() {
    this.setData({ showUsageModal: false });
    // 跳转到邀请页面
    wx.navigateTo({
      url: '/pages/invite/invite'
    });
  },

  /**
   * 使用次数模态框 - 购买按钮
   */
  onUsageModalPayment() {
    this.setData({ 
      showUsageModal: false,
      showPaymentModal: true 
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
   * 自动播放 Live Photo（5秒）
   */
  autoPlayLivePhoto() {
    if (!this.data.hasLivePhoto || !this.data.livePhotoUrl) return;
    
    setTimeout(() => {
      this.setData({ isPlayingLivePhoto: true });
      
      // 5秒后停止播放
      setTimeout(() => {
        this.setData({ isPlayingLivePhoto: false });
      }, 5000);
    }, 500);
  },

  /**
   * 点击播放/暂停 Live Photo
   */
  toggleLivePhoto() {
    if (!this.data.hasLivePhoto || !this.data.livePhotoUrl) return;
    
    this.setData({ 
      isPlayingLivePhoto: !this.data.isPlayingLivePhoto 
    });
    
    // 震动反馈
    wx.vibrateShort({ type: 'light' });
  },

  /**
   * 生成微动态视频
   * 仅尊享包用户可用
   */
  async handleGenerateLivePhoto() {
    const { selectedImage, isGeneratingVideo, isPremiumUser } = this.data;
    
    if (isGeneratingVideo) return;
    
    // 检查用户权限
    if (!isPremiumUser) {
      wx.showModal({
        title: '尊享功能',
        content: '微动态功能仅对尊享包用户开放，是否升级套餐？',
        confirmText: '立即升级',
        cancelText: '暂不需要',
        success: (res) => {
          if (res.confirm) {
            // 显示支付弹窗
            this.triggerEvent('showPayment');
          }
        }
      });
      return;
    }
    
    const userId = wx.getStorageSync('userId');
    if (!userId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      isGeneratingVideo: true,
      videoProgress: 0,
      videoProgressText: '创建任务中...'
    });
    
    try {
      console.log('[LivePhoto] 开始生成微动态');
      
      // 调用生成视频API
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
      
      // 开始轮询任务状态
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

  /**
   * 轮询视频生成任务状态
   */
  startVideoPolling(taskId) {
    // 清除之前的定时器
    if (this.videoPollingTimer) {
      clearInterval(this.videoPollingTimer);
    }
    
    let pollCount = 0;
    const maxPolls = 60; // 最多轮询60次（2分钟）
    
    this.videoPollingTimer = setInterval(async () => {
      pollCount++;
      
      if (pollCount > maxPolls) {
        clearInterval(this.videoPollingTimer);
        this.videoPollingTimer = null;
        this.setData({
          isGeneratingVideo: false,
          videoProgressText: ''
        });
        wx.showToast({
          title: '生成超时，请重试',
          icon: 'none'
        });
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
        
        // 更新进度
        if (status === 'running') {
          const progress = Math.min(90, pollCount * 3);
          this.setData({
            videoProgress: progress,
            videoProgressText: `生成中 ${progress}%`
          });
        }
        
        // 任务完成
        if (status === 'done' && taskData.video_url) {
          clearInterval(this.videoPollingTimer);
          this.videoPollingTimer = null;
          
          console.log('[LivePhoto] 视频生成完成:', taskData.video_url);
          
          this.setData({
            videoProgress: 100,
            videoProgressText: '转换中...'
          });
          
          // 转换为 Live Photo 格式
          await this.convertToLivePhoto(taskData.video_url);
        }
        
        // 任务失败
        if (status === 'failed') {
          clearInterval(this.videoPollingTimer);
          this.videoPollingTimer = null;
          
          this.setData({
            isGeneratingVideo: false,
            videoProgress: 0,
            videoProgressText: ''
          });
          
          wx.showToast({
            title: '生成失败，请重试',
            icon: 'none'
          });
        }
        
      } catch (err) {
        console.error('[LivePhoto] 轮询出错:', err);
      }
    }, 2000);
  },

  /**
   * 转换视频为 Live Photo 格式
   */
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
      
      wx.showToast({
        title: '微动态生成成功',
        icon: 'success'
      });
      
      // 自动播放
      this.autoPlayLivePhoto();
      
    } catch (err) {
      console.error('[LivePhoto] 转换失败:', err);
      this.setData({
        isGeneratingVideo: false,
        videoProgress: 0,
        videoProgressText: ''
      });
      
      wx.showToast({
        title: err.message || '转换失败',
        icon: 'none'
      });
    }
  },

  /**
   * 保存图片到相册
   * Requirements: 8.1
   * 需要付费才能保存高清无水印图片
   */
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

  /**
   * 显示升级弹窗（已付费用户可升级到更高套餐）
   */
  showUpgradeModal() {
    const { paymentStatus } = this.data;
    // 只有非尊享用户可以升级
    if (paymentStatus !== 'premium') {
      this.setData({ showPaymentModal: true });
    }
  },

  /**
   * 执行保存图片
   */
  async doSaveImage() {
    const { selectedImage, generationId } = this.data;
    
    this.setData({ isSaving: true });
    
    try {
      wx.showLoading({ title: '保存中...', mask: true });
      
      // 下载图片到本地
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
      
      // 直接保存到相册，不使用 savePosterToAlbum
      await new Promise((resolve, reject) => {
        wx.saveImageToPhotosAlbum({
          filePath: downloadRes.tempFilePath,
          success: () => {
            wx.hideLoading();
            wx.showToast({
              title: '保存成功',
              icon: 'success'
            });
            resolve();
          },
          fail: reject
        });
      });
      
    } catch (err) {
      console.error('[TransformResult] 保存失败:', err);
      wx.hideLoading();
      
      if (err.errMsg && err.errMsg.includes('auth deny')) {
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
   * 支付完成回调
   */
  onPaymentComplete(e) {
    const { packageType } = e.detail;
    console.log('[TransformResult] 支付完成:', packageType);
    
    // 更新付费状态
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

  /**
   * 关闭支付弹窗
   */
  closePaymentModal() {
    this.setData({ showPaymentModal: false });
  },

  /**
   * 保存 Live Photo 视频到相册
   */
  async handleSaveLivePhoto() {
    const { livePhotoUrl, isSaving } = this.data;
    if (!livePhotoUrl || isSaving) return;
    
    this.setData({ isSaving: true });
    
    try {
      wx.showLoading({ title: '保存中...', mask: true });
      
      const downloadRes = await new Promise((resolve, reject) => {
        wx.downloadFile({
          url: livePhotoUrl,
          success: resolve,
          fail: reject
        });
      });
      
      if (downloadRes.statusCode !== 200) {
        throw new Error('下载视频失败');
      }
      
      // 保存视频到相册
      await new Promise((resolve, reject) => {
        wx.saveVideoToPhotosAlbum({
          filePath: downloadRes.tempFilePath,
          success: resolve,
          fail: reject
        });
      });
      
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      
    } catch (err) {
      console.error('[TransformResult] 保存Live Photo失败:', err);
      wx.hideLoading();
      
      if (err.errMsg && err.errMsg.includes('auth deny')) {
        wx.showModal({
          title: '提示',
          content: '需要您授权保存视频到相册',
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
    // 手动触发 Launch 页面刷新使用次数
    const pages = getCurrentPages();
    if (pages.length >= 2) {
      const prevPage = pages[pages.length - 2];
      // 检查上一个页面是否是 Launch 页面
      if (prevPage && prevPage.route && prevPage.route.includes('launch')) {
        console.log('[TransformResult] 触发 Launch 页面刷新');
        // 延迟执行，确保页面切换完成后再刷新
        setTimeout(() => {
          if (typeof prevPage.loadUsageCount === 'function') {
            prevPage.loadUsageCount();
          }
        }, 300);
      }
    }
    
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
   */
  onShareTimeline() {
    return getShareTimeline({
      title: '富贵变身 - 一秒变豪门！',
      imageUrl: this.data.selectedImage
    });
  }
});
