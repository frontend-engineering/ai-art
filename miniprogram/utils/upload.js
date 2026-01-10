/**
 * 图片上传工具模块
 * 实现图片选择、压缩、上传等功能
 */

// 不再需要 BASE_URL，使用云托管请求

/**
 * 图片压缩质量配置
 */
const COMPRESS_CONFIG = {
  maxWidth: 1920,      // 最大宽度
  maxHeight: 1920,     // 最大高度
  quality: 80          // 压缩质量 (0-100)
};

/**
 * 选择图片
 * @param {Object} options 选择配置
 * @param {number} [options.count=1] 最多选择数量
 * @param {string[]} [options.sourceType=['album', 'camera']] 来源类型
 * @param {string[]} [options.sizeType=['compressed']] 尺寸类型
 * @returns {Promise<Object[]>} 选择的图片列表
 */
const chooseImage = (options = {}) => {
  const {
    count = 1,
    sourceType = ['album', 'camera'],
    sizeType = ['compressed']
  } = options;

  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count,
      mediaType: ['image'],
      sourceType,
      sizeType,
      success: (res) => {
        const files = res.tempFiles.map(file => ({
          path: file.tempFilePath,
          size: file.size,
          width: file.width,
          height: file.height
        }));
        console.log('[Upload] 选择图片成功:', files.length, '张');
        resolve(files);
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) {
          // 用户取消选择
          reject({ cancelled: true, message: '用户取消选择' });
        } else {
          console.error('[Upload] 选择图片失败:', err);
          reject(err);
        }
      }
    });
  });
};

/**
 * 选择单张图片
 * @param {Object} options 选择配置
 * @returns {Promise<Object>} 选择的图片
 */
const chooseOneImage = async (options = {}) => {
  const files = await chooseImage({ ...options, count: 1 });
  return files[0];
};

/**
 * 选择多张图片（时空拼图模式，最多5张）
 * @param {number} [maxCount=5] 最大数量
 * @returns {Promise<Object[]>} 选择的图片列表
 */
const chooseMultipleImages = (maxCount = 5) => {
  return chooseImage({ count: maxCount });
};

/**
 * 压缩图片
 * @param {string} filePath 图片路径
 * @param {Object} [options] 压缩配置
 * @param {number} [options.quality=80] 压缩质量
 * @returns {Promise<string>} 压缩后的图片路径
 */
const compressImage = (filePath, options = {}) => {
  const { quality = COMPRESS_CONFIG.quality } = options;

  return new Promise((resolve, reject) => {
    wx.compressImage({
      src: filePath,
      quality,
      success: (res) => {
        console.log('[Upload] 图片压缩成功');
        resolve(res.tempFilePath);
      },
      fail: (err) => {
        console.error('[Upload] 图片压缩失败:', err);
        // 压缩失败时返回原图
        resolve(filePath);
      }
    });
  });
};

/**
 * 获取图片信息
 * @param {string} filePath 图片路径
 * @returns {Promise<Object>} 图片信息
 */
const getImageInfo = (filePath) => {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src: filePath,
      success: (res) => {
        resolve({
          width: res.width,
          height: res.height,
          path: res.path,
          orientation: res.orientation,
          type: res.type
        });
      },
      fail: reject
    });
  });
};

/**
 * 将图片转换为 Base64
 * @param {string} filePath 图片路径
 * @returns {Promise<string>} Base64 字符串
 */
const imageToBase64 = (filePath) => {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager();
    fs.readFile({
      filePath,
      encoding: 'base64',
      success: (res) => {
        // 获取图片类型
        const ext = filePath.split('.').pop().toLowerCase();
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        const base64 = `data:${mimeType};base64,${res.data}`;
        resolve(base64);
      },
      fail: reject
    });
  });
};

/**
 * 上传图片到 OSS（使用 wx.uploadFile）
 * 注意：后端 /api/upload-image 接口期望 Base64 格式，此方法使用 multipart/form-data
 * 建议使用 uploadImageBase64 方法以确保兼容性
 * @param {string} filePath 图片路径
 * @param {Function} [onProgress] 进度回调
 * @returns {Promise<string>} 上传后的图片 URL
 */
const uploadImage = (filePath, onProgress) => {
  // 使用 Base64 方式上传以确保与后端接口兼容
  return uploadImageBase64(filePath, onProgress);
};

/**
 * 上传图片到 OSS（使用 Base64 方式）
 * @param {string} filePath 图片路径
 * @param {Function} [onProgress] 进度回调
 * @returns {Promise<string>} 上传后的图片 URL
 */
const uploadImageBase64 = async (filePath, onProgress) => {
  const { uploadAPI } = require('./api');

  // 先压缩图片
  if (onProgress) onProgress(10);
  const compressedPath = await compressImage(filePath);

  // 转换为 Base64
  if (onProgress) onProgress(30);
  const base64 = await imageToBase64(compressedPath);

  // 上传
  if (onProgress) onProgress(50);
  const result = await uploadAPI.uploadImage(base64);

  if (result.success && result.data && result.data.imageUrl) {
    if (onProgress) onProgress(100);
    console.log('[Upload] Base64 上传成功:', result.data.imageUrl);
    return result.data.imageUrl;
  }

  throw new Error(result.message || '上传失败');
};

/**
 * 批量上传图片
 * @param {string[]} filePaths 图片路径数组
 * @param {Function} [onProgress] 进度回调 (current, total, percent)
 * @returns {Promise<string[]>} 上传后的图片 URL 数组
 */
const uploadImages = async (filePaths, onProgress) => {
  const urls = [];
  const total = filePaths.length;

  for (let i = 0; i < total; i++) {
    const filePath = filePaths[i];
    
    try {
      const url = await uploadImageBase64(filePath, (percent) => {
        if (onProgress) {
          const overallPercent = Math.floor(((i + percent / 100) / total) * 100);
          onProgress(i + 1, total, overallPercent);
        }
      });
      urls.push(url);
    } catch (err) {
      console.error(`[Upload] 第 ${i + 1} 张图片上传失败:`, err);
      throw new Error(`第 ${i + 1} 张图片上传失败`);
    }
  }

  return urls;
};

/**
 * 选择并上传图片（一站式）
 * @param {Object} options 配置
 * @param {number} [options.count=1] 选择数量
 * @param {Function} [options.onProgress] 进度回调
 * @returns {Promise<string[]>} 上传后的图片 URL 数组
 */
const chooseAndUpload = async (options = {}) => {
  const { count = 1, onProgress } = options;

  // 选择图片
  const files = await chooseImage({ count });
  const filePaths = files.map(f => f.path);

  // 上传图片
  return await uploadImages(filePaths, onProgress);
};

/**
 * 预览图片
 * @param {string} current 当前图片 URL
 * @param {string[]} urls 所有图片 URL 数组
 */
const previewImage = (current, urls) => {
  wx.previewImage({
    current,
    urls
  });
};

/**
 * 保存图片到相册
 * @param {string} url 图片 URL
 * @returns {Promise<void>}
 */
const saveImageToAlbum = (url) => {
  return new Promise((resolve, reject) => {
    // 先下载图片
    wx.downloadFile({
      url,
      success: (downloadRes) => {
        if (downloadRes.statusCode === 200) {
          // 保存到相册
          wx.saveImageToPhotosAlbum({
            filePath: downloadRes.tempFilePath,
            success: () => {
              wx.showToast({
                title: '保存成功',
                icon: 'success'
              });
              resolve();
            },
            fail: (err) => {
              if (err.errMsg && err.errMsg.includes('auth deny')) {
                // 用户拒绝授权
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
              reject(err);
            }
          });
        } else {
          reject(new Error('下载图片失败'));
        }
      },
      fail: reject
    });
  });
};

/**
 * 检查相册权限
 * @returns {Promise<boolean>} 是否有权限
 */
const checkAlbumPermission = () => {
  return new Promise((resolve) => {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.writePhotosAlbum']) {
          resolve(true);
        } else if (res.authSetting['scope.writePhotosAlbum'] === false) {
          // 用户之前拒绝过
          resolve(false);
        } else {
          // 未请求过权限
          resolve(true);
        }
      },
      fail: () => resolve(false)
    });
  });
};

/**
 * 请求相册权限
 * @returns {Promise<boolean>} 是否授权成功
 */
const requestAlbumPermission = () => {
  return new Promise((resolve) => {
    wx.authorize({
      scope: 'scope.writePhotosAlbum',
      success: () => resolve(true),
      fail: () => {
        // 引导用户去设置页开启权限
        wx.showModal({
          title: '提示',
          content: '需要您授权保存图片到相册，请在设置中开启',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting({
                success: (settingRes) => {
                  resolve(!!settingRes.authSetting['scope.writePhotosAlbum']);
                },
                fail: () => resolve(false)
              });
            } else {
              resolve(false);
            }
          }
        });
      }
    });
  });
};

module.exports = {
  COMPRESS_CONFIG,
  chooseImage,
  chooseOneImage,
  chooseMultipleImages,
  compressImage,
  getImageInfo,
  imageToBase64,
  uploadImage,
  uploadImageBase64,
  uploadImages,
  chooseAndUpload,
  previewImage,
  saveImageToAlbum,
  checkAlbumPermission,
  requestAlbumPermission
};
