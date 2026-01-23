/**
 * 时空拼图模式上传页
 * Requirements: 2.2, 6.1-6.5
 * 
 * 功能：
 * - 与富贵变身保持一致的 UI 样式
 * - 实现多图上传（最多5张）
 * - 实现人脸检测
 */

const { chooseImage, uploadImage } = require('../../../utils/upload');
const { faceAPI } = require('../../../utils/api');
const pageMixin = require('../../../utils/page-mixin');

Page({
  data: {
    isElderMode: false,
    isUploading: false,
    statusText: '',
    errorMessage: '',
    uploadProgress: 0
  },

  onLoad() {
    pageMixin.onLoad.call(this);
  },

  onShow() {
    pageMixin.onShow.call(this);
  },

  onElderModeChange(isElderMode) {
    pageMixin.onElderModeChange.call(this, isElderMode);
  },

  /**
   * 点击上传区域
   * Requirements: 6.1
   */
  async handleUploadClick() {
    if (this.data.isUploading) return;
    
    console.log('[PuzzleUpload] 用户点击上传区域');
    this.setData({ errorMessage: '' });
    
    try {
      // 选择图片（最多5张）
      const tempFiles = await chooseImage(5);
      if (!tempFiles || tempFiles.length === 0) {
        console.log('[PuzzleUpload] 用户取消选择');
        return;
      }
      
      console.log('[PuzzleUpload] 选择的文件数量:', tempFiles.length);
      
      // 检查文件大小
      for (const file of tempFiles) {
        if (file.size > 10 * 1024 * 1024) {
          this.setData({
            errorMessage: '图片文件过大，请上传小于10MB的图片'
          });
          return;
        }
      }
      
      // 开始上传流程
      await this.processUpload(tempFiles);
      
    } catch (err) {
      console.error('[PuzzleUpload] 选择图片失败:', err);
      if (err.errMsg && err.errMsg.includes('cancel')) {
        return;
      }
      this.setData({
        errorMessage: '选择图片失败，请重试'
      });
    }
  },

  /**
   * 处理上传流程
   * Requirements: 6.2-6.5
   */
  async processUpload(tempFiles) {
    this.setData({
      isUploading: true,
      statusText: '正在上传图片...',
      uploadProgress: 0,
      errorMessage: ''
    });
    
    try {
      // 1. 上传所有图片
      const uploadedUrls = [];
      for (let i = 0; i < tempFiles.length; i++) {
        const file = tempFiles[i];
        this.setData({
          statusText: `正在上传第 ${i + 1}/${tempFiles.length} 张...`,
          uploadProgress: Math.round((i / tempFiles.length) * 50)
        });
        
        const url = await uploadImage(file.path);
        uploadedUrls.push(url);
      }
      
      console.log('[PuzzleUpload] 所有图片上传成功:', uploadedUrls.length);
      
      // 2. 人脸检测
      this.setData({
        statusText: '正在检测人脸...',
        uploadProgress: 75
      });
      
      const result = await faceAPI.extractFaces(uploadedUrls);
      console.log('[PuzzleUpload] 人脸检测结果:', {
        success: result.success,
        faceCount: result.data?.faces?.length || 0
      });
      
      if (!result.success || !result.data?.faces || result.data.faces.length === 0) {
        this.setData({
          isUploading: false,
          statusText: '',
          errorMessage: result.message || '未检测到人脸，请上传包含清晰人脸的照片'
        });
        return;
      }
      
      // 3. 检测成功，跳转到模板选择页
      this.setData({
        statusText: '检测成功，正在跳转...',
        uploadProgress: 100
      });
      
      // 存储数据到全局
      const app = getApp();
      app.globalData.puzzleData = {
        mode: 'puzzle',
        uploadedImages: uploadedUrls,
        faces: result.data.faces
      };
      
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/puzzle/template/template',
          fail: (err) => {
            console.error('[PuzzleUpload] 跳转失败:', err);
            this.setData({
              isUploading: false,
              statusText: '',
              errorMessage: '页面跳转失败，请重试'
            });
          }
        });
      }, 300);
      
    } catch (err) {
      console.error('[PuzzleUpload] 上传处理失败:', err);
      this.setData({
        isUploading: false,
        statusText: '',
        errorMessage: err.message || '上传失败，请重试'
      });
    }
  },

  /**
   * 清除错误
   */
  clearError() {
    this.setData({ errorMessage: '' });
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack({
      fail: () => {
        wx.redirectTo({
          url: '/pages/puzzle/launch/launch'
        });
      }
    });
  },

  /**
   * 分享给好友
   */
  onShareAppMessage() {
    return {
      title: '时空拼图 - 穿越时空的全家福！',
      path: '/pages/puzzle/launch/launch',
      imageUrl: '/assets/images/share-puzzle.png'
    };
  }
});
