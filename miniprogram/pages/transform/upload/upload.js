/**
 * 富贵变身模式上传页
 * Requirements: 2.3, 6.1-6.5
 * 
 * 功能：
 * - 复用原网页 TransformUploadPage 样式
 * - 实现单图上传
 * - 实现人脸检测
 */

const { chooseImage, uploadImage } = require('../../../utils/upload');
const { faceAPI } = require('../../../utils/api');
const { initNavigation } = require('../../../utils/navigation-helper');
const { getAssetUrl } = require('../../../utils/oss-assets');

Page({
  data: {
    isElderMode: false,
    statusBarHeight: 0,
    navBarHeight: 44,
    menuRight: 0,
    isUploading: false,
    statusText: '',
    errorMessage: '',
    uploadProgress: 0,
    // OSS 资源
    cameraUploadUrl: getAssetUrl('camera-upload.png'),
    commonBgUrl: getAssetUrl('common-bg.jpg')
  },

  onLoad() {
    const app = getApp();
    
    initNavigation(this);
    
    this.setData({
      isElderMode: app.globalData.isElderMode
    });
  },

  onShow() {
    const app = getApp();
    this.setData({
      isElderMode: app.globalData.isElderMode
    });
  },

  /**
   * 点击上传区域
   * Requirements: 6.1
   */
  async handleUploadClick() {
    if (this.data.isUploading) return;
    
    console.log('[TransformUpload] 用户点击上传区域');
    this.setData({ errorMessage: '' });
    
    try {
      // 选择图片（单张）
      const tempFiles = await chooseImage(1);
      if (!tempFiles || tempFiles.length === 0) {
        console.log('[TransformUpload] 用户取消选择');
        return;
      }
      
      const file = tempFiles[0];
      console.log('[TransformUpload] 选择的文件:', {
        path: file.path,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
      });
      
      // 检查文件大小（最大10MB）
      if (file.size > 10 * 1024 * 1024) {
        console.log('[TransformUpload] 文件过大');
        this.setData({
          errorMessage: '图片文件过大，请上传小于10MB的图片'
        });
        return;
      }
      
      // 开始上传流程
      await this.processUpload(file.path);
      
    } catch (err) {
      console.error('[TransformUpload] 选择图片失败:', err);
      if (err.errMsg && err.errMsg.includes('cancel')) {
        // 用户取消，不显示错误
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
  async processUpload(filePath) {
    this.setData({
      isUploading: true,
      statusText: '正在上传图片...',
      uploadProgress: 0,
      errorMessage: ''
    });
    
    try {
      // 1. 上传图片到服务器
      console.log('[TransformUpload] 开始上传图片');
      const imageUrl = await uploadImage(filePath, (progress) => {
        this.setData({ uploadProgress: progress });
      });
      console.log('[TransformUpload] 图片上传成功:', imageUrl);
      
      // 2. 人脸检测
      this.setData({
        statusText: '正在检测人脸...',
        uploadProgress: 100
      });
      console.log('[TransformUpload] 开始人脸检测');
      
      const result = await faceAPI.extractFaces([imageUrl]);
      console.log('[TransformUpload] 人脸检测结果:', {
        success: result.success,
        faceCount: result.data?.faces?.length || 0
      });
      
      if (!result.success || !result.data?.faces || result.data.faces.length === 0) {
        console.log('[TransformUpload] 未检测到人脸');
        this.setData({
          isUploading: false,
          statusText: '',
          errorMessage: result.message || '照片里人脸太小啦，选一张正面大头像吧'
        });
        return;
      }
      
      // 3. 检测成功，跳转到模板选择页
      this.setData({ statusText: '检测成功，正在跳转...' });
      console.log('[TransformUpload] 人脸检测成功，准备跳转');
      
      // 存储数据到全局
      const app = getApp();
      app.globalData.transformData = {
        mode: 'transform',
        uploadedImages: [imageUrl],
        faces: result.data.faces
      };
      
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/transform/template/template',
          fail: (err) => {
            console.error('[TransformUpload] 跳转失败:', err);
            this.setData({
              isUploading: false,
              statusText: '',
              errorMessage: '页面跳转失败，请重试'
            });
          }
        });
      }, 300);
      
    } catch (err) {
      console.error('[TransformUpload] 上传处理失败:', err);
      this.setData({
        isUploading: false,
        statusText: '',
        errorMessage: err.message || '上传失败，请重试'
      });
    }
  },

  /**
   * 清除错误，重新上传
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
          url: '/pages/transform/launch/launch'
        });
      }
    });
  },

  /**
   * 分享给好友
   */
  onShareAppMessage() {
    return {
      title: '富贵变身 - 一秒变豪门！',
      path: '/pages/transform/launch/launch',
      imageUrl: '/assets/images/share-transform.png'
    };
  }
});
