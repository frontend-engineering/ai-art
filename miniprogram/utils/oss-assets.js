/**
 * 小程序静态资源 OSS URL 映射
 * 自动生成，请勿手动修改
 * 生成时间: 2026-01-08T14:43:15.224Z
 */

const OSS_ASSETS = {
  // 背景角落图片
  "images/bg-corners/bottom-left.png": "https://wms.webinfra.cloud/miniprogram-assets/images/bg-corners/bottom-left.png",
  "images/bg-corners/bottom-right.png": "https://wms.webinfra.cloud/miniprogram-assets/images/bg-corners/bottom-right.png",
  "images/bg-corners/top-left.png": "https://wms.webinfra.cloud/miniprogram-assets/images/bg-corners/top-left.png",
  "images/bg-corners/top-right.png": "https://wms.webinfra.cloud/miniprogram-assets/images/bg-corners/top-right.png",
  // 通用图片
  "images/common-bg.jpg": "https://wms.webinfra.cloud/miniprogram-assets/images/common-bg.jpg",
  "images/festive_template_select.png": "https://wms.webinfra.cloud/miniprogram-assets/images/festive_template_select.png",
  "images/launch-bg.png": "https://wms.webinfra.cloud/miniprogram-assets/images/launch-bg.png",
  "images/launch-bg2.png": "https://wms.webinfra.cloud/miniprogram-assets/images/launch-bg2.png",
  "images/transform-upload-bg.png": "https://wms.webinfra.cloud/miniprogram-assets/images/transform-upload-bg.png",
  "images/transform-upload.png": "https://wms.webinfra.cloud/miniprogram-assets/images/transform-upload.png",
  "images/video-frame.png": "https://wms.webinfra.cloud/miniprogram-assets/images/video-frame.png",
  // 按钮和文字图片
  "images/button-frame.png": "https://wms.webinfra.cloud/miniprogram-assets/images/button-frame.png",
  "images/button-text.png": "https://wms.webinfra.cloud/miniprogram-assets/images/button-text.png",
  "images/slogan-text.png": "https://wms.webinfra.cloud/miniprogram-assets/images/slogan-text.png",
  "images/stats-text.png": "https://wms.webinfra.cloud/miniprogram-assets/images/stats-text.png",
  "images/subtitle-text.png": "https://wms.webinfra.cloud/miniprogram-assets/images/subtitle-text.png",
  "images/title-text.png": "https://wms.webinfra.cloud/miniprogram-assets/images/title-text.png",
  // 富贵变身模板
  "templates/transform/classical-palace.jpg": "https://wms.webinfra.cloud/miniprogram-assets/templates/transform/classical-palace.jpg",
  "templates/transform/fHPyN0b67.jpg": "https://wms.webinfra.cloud/miniprogram-assets/templates/transform/fHPyN0b67.jpg",
  "templates/transform/fHPym5Te7.jpg": "https://wms.webinfra.cloud/miniprogram-assets/templates/transform/fHPym5Te7.jpg",
  "templates/transform/fHPyoUXXv.jpg": "https://wms.webinfra.cloud/miniprogram-assets/templates/transform/fHPyoUXXv.jpg",
  "templates/transform/luxury-chinese.jpg": "https://wms.webinfra.cloud/miniprogram-assets/templates/transform/luxury-chinese.jpg",
  "templates/transform/luxury-european.jpg": "https://wms.webinfra.cloud/miniprogram-assets/templates/transform/luxury-european.jpg",
  "templates/transform/modern-luxury.jpg": "https://wms.webinfra.cloud/miniprogram-assets/templates/transform/modern-luxury.jpg"
};

/**
 * 获取 OSS 资源 URL
 * @param {string} localPath - 本地相对路径，如 'images/launch-bg.png'
 * @returns {string} OSS URL
 */
function getAssetUrl(localPath) {
  return OSS_ASSETS[localPath] || '/assets/' + localPath;
}

module.exports = {
  OSS_ASSETS,
  getAssetUrl,
};
