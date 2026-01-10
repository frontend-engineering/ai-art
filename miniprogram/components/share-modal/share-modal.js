/**
 * 分享弹窗组件
 * 支持分享好友、朋友圈、保存海报
 */
const { generateSharePoster, savePosterToAlbum } = require('../../utils/share');

Component({
  properties: {
    // 是否显示弹窗
    visible: {
      type: Boolean,
      value: false
    },
    // 要分享的图片URL
    imageUrl: {
      type: String,
      value: ''
    },
    // 分享标题
    shareTitle: {
      type: String,
      value: '看看我生成的AI全家福 🎊'
    },
    // 分享路径
    sharePath: {
      type: String,
      value: '/pages/launch/launch'
    }
  },
  
  data: {
    isGeneratingPoster: false,
    posterPath: ''
  },
  
  methods: {
    // 分享给好友（通过 button open-type="share" 触发）
    handleShareToFriend() {
      this.handleClose();
    },
    
    // 分享到朋友圈提示
    handleShareTimeline() {
      wx.showModal({
        title: '分享到朋友圈',
        content: '请点击右上角"..."按钮，选择"分享到朋友圈"',
        showCancel: false,
        confirmText: '知道了'
      });
    },
    
    // 生成并保存海报
    async handleSavePoster() {
      if (this.data.isGeneratingPoster) return;
      
      this.setData({ isGeneratingPoster: true });
      wx.showLoading({ title: '生成海报中...' });
      
      try {
        // 获取小程序码
        let qrCodeUrl = '';
        try {
          const { wechatAPI } = require('../../utils/api');
          const result = await wechatAPI.getQRCode('pages/launch/launch', 200);
          if (result.success && result.data) {
            qrCodeUrl = result.data.qrCodeUrl;
          }
        } catch (err) {
          console.warn('获取小程序码失败:', err);
        }
        
        // 生成海报
        const posterPath = await generateSharePoster({
          imageUrl: this.data.imageUrl,
          qrCodeUrl,
          canvasId: 'posterCanvas'
        });
        
        this.setData({ posterPath });
        
        // 保存到相册
        await savePosterToAlbum(posterPath);
        
        this.handleClose();
        
      } catch (err) {
        console.error('生成海报失败:', err);
        wx.showToast({
          title: '生成海报失败',
          icon: 'none'
        });
      } finally {
        this.setData({ isGeneratingPoster: false });
        wx.hideLoading();
      }
    },
    
    // 直接保存图片到相册
    async handleSaveImage() {
      if (!this.data.imageUrl) {
        wx.showToast({
          title: '图片地址无效',
          icon: 'none'
        });
        return;
      }
      
      wx.showLoading({ title: '保存中...' });
      
      try {
        // 先下载图片
        const downloadRes = await new Promise((resolve, reject) => {
          wx.downloadFile({
            url: this.data.imageUrl,
            success: resolve,
            fail: reject
          });
        });
        
        if (downloadRes.statusCode !== 200) {
          throw new Error('下载图片失败');
        }
        
        // 保存到相册
        await new Promise((resolve, reject) => {
          wx.saveImageToPhotosAlbum({
            filePath: downloadRes.tempFilePath,
            success: resolve,
            fail: reject
          });
        });
        
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        
        this.handleClose();
        
      } catch (err) {
        console.error('保存图片失败:', err);
        
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
            title: '保存失败',
            icon: 'none'
          });
        }
      } finally {
        wx.hideLoading();
      }
    },
    
    // 关闭弹窗
    handleClose() {
      this.triggerEvent('close');
    },
    
    // 阻止冒泡
    preventBubble() {}
  }
});
