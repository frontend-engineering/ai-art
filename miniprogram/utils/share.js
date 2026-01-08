/**
 * 分享工具模块
 * 实现分享给好友、分享到朋友圈、生成海报等功能
 */

const { wechatAPI } = require('./api');

/**
 * 默认分享配置
 */
const shareConfig = {
  title: 'AI全家福·团圆照相馆',
  desc: '这个春节，让爱没有距离！看看我生成的AI全家福 🎊',
  path: '/pages/launch/launch',
  imageUrl: '/assets/images/share-default.png'
};

/**
 * 海报配置
 */
const posterConfig = {
  width: 750,
  height: 1334,
  backgroundColor: '#FFF8F0',
  headerColor: '#D4302B',
  titleColor: '#FFD700',
  textColor: '#8B4513',
  borderColor: '#FFD700'
};

/**
 * 生成分享给好友的配置
 * @param {Object} options 分享配置
 * @param {string} [options.title] 分享标题
 * @param {string} [options.path] 分享路径
 * @param {string} [options.imageUrl] 分享图片
 * @returns {Object} 分享配置对象
 */
const getShareAppMessage = (options = {}) => {
  const { title, path, imageUrl } = options;

  return {
    title: title || shareConfig.title,
    path: path || shareConfig.path,
    imageUrl: imageUrl || shareConfig.imageUrl
  };
};

/**
 * 生成分享到朋友圈的配置
 * @param {Object} options 分享配置
 * @param {string} [options.title] 分享标题
 * @param {string} [options.imageUrl] 分享图片
 * @returns {Object} 分享配置对象
 */
const getShareTimeline = (options = {}) => {
  const { title, imageUrl } = options;

  return {
    title: title || shareConfig.title,
    imageUrl: imageUrl || shareConfig.imageUrl
  };
};

/**
 * 下载网络图片到本地
 * @param {string} url 图片URL
 * @returns {Promise<string>} 本地临时路径
 */
const downloadImage = (url) => {
  return new Promise((resolve, reject) => {
    // 如果是本地路径，直接返回
    if (url.startsWith('/') || url.startsWith('wxfile://')) {
      resolve(url);
      return;
    }

    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.tempFilePath);
        } else {
          reject(new Error('下载图片失败'));
        }
      },
      fail: reject
    });
  });
};

/**
 * 生成分享海报
 * @param {Object} options 海报配置
 * @param {string} options.imageUrl 生成的图片URL
 * @param {string} [options.qrCodeUrl] 小程序码URL
 * @param {string} options.canvasId Canvas ID
 * @param {Object} [options.component] 组件实例（用于组件内的canvas）
 * @returns {Promise<string>} 海报临时文件路径
 */
const generateSharePoster = async (options) => {
  const { imageUrl, qrCodeUrl, canvasId, component } = options;
  const { width, height, backgroundColor, headerColor, titleColor, textColor, borderColor } = posterConfig;

  // 下载图片到本地
  let localImagePath;
  let localQrCodePath;

  try {
    localImagePath = await downloadImage(imageUrl);
    if (qrCodeUrl) {
      localQrCodePath = await downloadImage(qrCodeUrl);
    }
  } catch (err) {
    console.error('[Share] 下载图片失败:', err);
    throw new Error('下载图片失败');
  }

  return new Promise((resolve, reject) => {
    // 获取 canvas 上下文
    const ctx = component 
      ? wx.createCanvasContext(canvasId, component)
      : wx.createCanvasContext(canvasId);

    // 绘制背景
    ctx.setFillStyle(backgroundColor);
    ctx.fillRect(0, 0, width, height);

    // 绘制顶部装饰条
    ctx.setFillStyle(headerColor);
    ctx.fillRect(0, 0, width, 120);

    // 绘制标题
    ctx.setFillStyle(titleColor);
    ctx.setFontSize(48);
    ctx.setTextAlign('center');
    ctx.fillText('AI全家福·团圆照相馆', width / 2, 80);

    // 绘制生成的图片
    const imageX = 50;
    const imageY = 150;
    const imageWidth = 650;
    const imageHeight = 650;

    ctx.drawImage(localImagePath, imageX, imageY, imageWidth, imageHeight);

    // 绘制金色边框
    ctx.setStrokeStyle(borderColor);
    ctx.setLineWidth(8);
    ctx.strokeRect(imageX - 4, imageY - 4, imageWidth + 8, imageHeight + 8);

    // 绘制底部文案
    ctx.setFillStyle(textColor);
    ctx.setFontSize(36);
    ctx.setTextAlign('center');
    ctx.fillText('这个春节，让爱没有距离', width / 2, 880);

    // 绘制小程序码
    if (localQrCodePath) {
      const qrSize = 200;
      const qrX = (width - qrSize) / 2;
      const qrY = 920;
      ctx.drawImage(localQrCodePath, qrX, qrY, qrSize, qrSize);
    }

    // 绘制扫码提示
    ctx.setFillStyle('#666666');
    ctx.setFontSize(28);
    ctx.fillText('长按识别小程序码', width / 2, 1180);
    ctx.fillText('制作你的AI全家福', width / 2, 1220);

    // 绘制底部装饰
    ctx.setFillStyle(headerColor);
    ctx.fillRect(0, height - 40, width, 40);

    // 执行绘制
    ctx.draw(false, () => {
      // 延迟导出，确保绘制完成
      setTimeout(() => {
        wx.canvasToTempFilePath({
          canvasId,
          success: (res) => {
            console.log('[Share] 海报生成成功');
            resolve(res.tempFilePath);
          },
          fail: (err) => {
            console.error('[Share] 导出海报失败:', err);
            reject(err);
          }
        }, component);
      }, 300);
    });
  });
};

/**
 * 保存海报到相册
 * @param {string} tempFilePath 海报临时文件路径
 * @returns {Promise<void>}
 */
const savePosterToAlbum = (tempFilePath) => {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath: tempFilePath,
      success: () => {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        console.log('[Share] 海报保存成功');
        resolve();
      },
      fail: (err) => {
        console.error('[Share] 保存海报失败:', err);
        
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          // 用户拒绝授权，引导开启
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
  });
};

/**
 * 获取小程序码
 * @param {string} [path='pages/launch/launch'] 小程序页面路径
 * @param {number} [width=200] 小程序码宽度
 * @returns {Promise<string>} 小程序码URL
 */
const getQRCode = async (path = 'pages/launch/launch', width = 200) => {
  try {
    const result = await wechatAPI.getQRCode(path, width);
    if (result.success && result.data && result.data.qrCodeUrl) {
      return result.data.qrCodeUrl;
    }
    throw new Error('获取小程序码失败');
  } catch (err) {
    console.error('[Share] 获取小程序码失败:', err);
    throw err;
  }
};

/**
 * 一站式生成并保存海报
 * @param {Object} options 配置
 * @param {string} options.imageUrl 生成的图片URL
 * @param {string} options.canvasId Canvas ID
 * @param {Object} [options.component] 组件实例
 * @param {boolean} [options.withQRCode=true] 是否包含小程序码
 * @returns {Promise<void>}
 */
const generateAndSavePoster = async (options) => {
  const { imageUrl, canvasId, component, withQRCode = true } = options;

  wx.showLoading({ title: '生成海报中...', mask: true });

  try {
    // 获取小程序码
    let qrCodeUrl = null;
    if (withQRCode) {
      try {
        qrCodeUrl = await getQRCode();
      } catch (err) {
        console.warn('[Share] 获取小程序码失败，将不包含小程序码');
      }
    }

    // 生成海报
    const posterPath = await generateSharePoster({
      imageUrl,
      qrCodeUrl,
      canvasId,
      component
    });

    wx.hideLoading();

    // 保存到相册
    await savePosterToAlbum(posterPath);

  } catch (err) {
    wx.hideLoading();
    console.error('[Share] 生成海报失败:', err);
    wx.showToast({
      title: '生成海报失败',
      icon: 'none'
    });
    throw err;
  }
};

/**
 * 复制链接到剪贴板
 * @param {string} text 要复制的文本
 * @returns {Promise<void>}
 */
const copyToClipboard = (text) => {
  return new Promise((resolve, reject) => {
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        });
        resolve();
      },
      fail: reject
    });
  });
};

/**
 * 显示分享菜单
 * 注意：小程序中需要在页面配置中启用分享
 */
const showShareMenu = () => {
  wx.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline']
  });
};

/**
 * 隐藏分享菜单
 */
const hideShareMenu = () => {
  wx.hideShareMenu();
};

module.exports = {
  shareConfig,
  posterConfig,
  getShareAppMessage,
  getShareTimeline,
  downloadImage,
  generateSharePoster,
  savePosterToAlbum,
  getQRCode,
  generateAndSavePoster,
  copyToClipboard,
  showShareMenu,
  hideShareMenu
};
