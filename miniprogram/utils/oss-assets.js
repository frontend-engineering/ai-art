/**
 * 小程序静态资源 OSS URL 映射
 * 自动生成，请勿手动修改
 * 生成时间: 2026-01-29T09:51:59.502Z
 */

const OSS_ASSETS = {
  "bg-corners/bottom-left.png": "https://wms.webinfra.cloud/miniprogram-assets/bg-corners/bottom-left.png",
  "bg-corners/bottom-right.png": "https://wms.webinfra.cloud/miniprogram-assets/bg-corners/bottom-right.png",
  "bg-corners/top-left.png": "https://wms.webinfra.cloud/miniprogram-assets/bg-corners/top-left.png",
  "bg-corners/top-right.png": "https://wms.webinfra.cloud/miniprogram-assets/bg-corners/top-right.png",
  "common-bg.jpg": "https://wms.webinfra.cloud/miniprogram-assets/common-bg.jpg",
  "lantern.png": "https://wms.webinfra.cloud/miniprogram-assets/lantern.png",
  "preview-after.jpg": "https://wms.webinfra.cloud/miniprogram-assets/preview-after.jpg",
  "preview-before.jpg": "https://wms.webinfra.cloud/miniprogram-assets/preview-before.jpg",
  "wealth-icon.png": "https://wms.webinfra.cloud/miniprogram-assets/wealth-icon.png"
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
