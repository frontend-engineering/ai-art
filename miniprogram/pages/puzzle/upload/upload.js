/**
 * 时空拼图模式上传页
 * Requirements: 2.2, 6.1-6.5
 * 
 * 功能：
 * - 复用原网页 UploadPage 样式
 * - 实现多图选择（最多5张）
 * - 实现人脸检测和上传
 */

const { chooseImage, uploadImage } = require('../../../utils/upload');
const { faceAPI } = require('../../../utils/api');

Page({
  data: {
    isElderMode: false,
    isUploading: false,
    statusText: '',
    errorMessage: '',
    uploadProgress: 0,
    selectedImages: [], // 已选择的图片列表
    maxImages: 5
  },

  onLoad() {
    const app = getApp();
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
    
    const { selectedImages, maxImages } = this.data;
    const remainingCount = maxImages - selectedImages.length;
    
    if (remainingCount <= 0) {
      wx.showToast({
        title: `最多选择${maxImages}张图片`,
        icon: 'none'
      });
      return;
    }
    
    console.log('[PuzzleUpload] 用户点击上传区域');
    this.setData({ errorMessage: '' });
    
    try {
      // 选择图片（多张）
      const tempFiles = await chooseImage(remainingCount);
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
      
      // 添加到已选择列表
      const newImages = tempFiles.map(f => ({
        tempPath: f.path,
        size: f.size,
        uploaded: false,
        url: ''
      }));
      
      this.setData({
        selectedImages: [...selectedImages, ...newImages]
      });
      
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
   * 删除已选择的图片
   */
  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const { selectedImages } = this.data;
    selectedImages.splice(index, 1);
    this.setData({ selectedImages });
  },

  /**
   * 开始处理上传
   * Requirements: 6.2-6.5
   */
  async startProcess() {
    const { selectedImages } = this.data;
    
    if (selectedImages.length === 0) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      isUploading: true,
      statusText: '正在上传图片...',
      uploadProgress: 0,
      errorMessage: ''
    });
    
    try {
      // 1. 上传所有图片
      const uploadedUrls = [];
      for (let i = 0; i < selectedImages.length; i++) {
        const img = selectedImages[i];
        this.setData({
          statusText: `正在上传第 ${i + 1}/${selectedImages.length} 张...`,
          uploadProgress: Math.round((i / selectedImages.length) * 50)
        });
        
        const url = await uploadImage(img.tempPath);
        uploadedUrls.push(url);
        
        // 更新状态
        selectedImages[i].uploaded = true;
        selectedImages[i].url = url;
        this.setData({ selectedImages });
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
