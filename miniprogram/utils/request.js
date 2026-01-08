/**
 * HTTP 请求封装模块
 * 封装 wx.request，配置 BASE_URL，实现请求拦截器和错误处理
 */

// API 基础地址 - 根据环境配置
const BASE_URL = 'https://art.webinfra.cloud';

// 错误消息映射
const ERROR_MESSAGES = {
  'network': '网络不给力，请检查网络连接',
  'timeout': '请求超时，请稍后重试',
  'server': '服务器开小差了，请稍后重试',
  'auth': '登录已过期，请重新登录',
  'default': '操作失败，请稍后重试'
};

/**
 * 显示错误提示
 * @param {string} message 错误消息
 */
const showError = (message) => {
  wx.showToast({
    title: message,
    icon: 'none',
    duration: 2500
  });
};

/**
 * 获取错误消息
 * @param {Object} error 错误对象
 * @param {number} statusCode HTTP状态码
 * @returns {string} 错误消息
 */
const getErrorMessage = (error, statusCode) => {
  if (error && error.errMsg && error.errMsg.includes('timeout')) {
    return ERROR_MESSAGES.timeout;
  }
  if (error && error.errMsg && error.errMsg.includes('fail')) {
    return ERROR_MESSAGES.network;
  }
  if (statusCode === 401 || statusCode === 403) {
    return ERROR_MESSAGES.auth;
  }
  if (statusCode >= 500) {
    return ERROR_MESSAGES.server;
  }
  return ERROR_MESSAGES.default;
};

/**
 * 发起 HTTP 请求
 * @param {Object} options 请求配置
 * @param {string} options.url 请求路径（不含 BASE_URL）
 * @param {string} [options.method='GET'] 请求方法
 * @param {Object} [options.data] 请求数据
 * @param {Object} [options.header] 自定义请求头
 * @param {boolean} [options.showLoading=false] 是否显示加载提示
 * @param {string} [options.loadingText='加载中...'] 加载提示文字
 * @param {boolean} [options.showError=true] 是否显示错误提示
 * @param {number} [options.timeout=30000] 超时时间（毫秒）
 * @returns {Promise<Object>} 响应数据
 */
const request = (options) => {
  return new Promise((resolve, reject) => {
    const {
      url,
      method = 'GET',
      data,
      header = {},
      showLoading = false,
      loadingText = '加载中...',
      showError: shouldShowError = true,
      timeout = 30000
    } = options;

    // 获取本地存储的 token
    const token = wx.getStorageSync('token');

    // 显示加载提示
    if (showLoading) {
      wx.showLoading({
        title: loadingText,
        mask: true
      });
    }

    // 构建请求头
    const requestHeader = {
      'Content-Type': 'application/json',
      ...header
    };

    // 自动携带 token
    if (token) {
      requestHeader['Authorization'] = `Bearer ${token}`;
    }

    // 发起请求
    wx.request({
      url: BASE_URL + url,
      method,
      data,
      header: requestHeader,
      timeout,
      success: (res) => {
        // 隐藏加载提示
        if (showLoading) {
          wx.hideLoading();
        }

        const { statusCode, data: responseData } = res;

        // 处理成功响应
        if (statusCode >= 200 && statusCode < 300) {
          resolve(responseData);
          return;
        }

        // 处理认证失败
        if (statusCode === 401 || statusCode === 403) {
          // 清除本地登录信息
          wx.removeStorageSync('token');
          wx.removeStorageSync('userId');
          wx.removeStorageSync('openid');

          if (shouldShowError) {
            showError(ERROR_MESSAGES.auth);
          }

          // 尝试重新登录
          const app = getApp();
          if (app && app.login) {
            app.login();
          }

          reject({
            code: statusCode,
            message: ERROR_MESSAGES.auth,
            data: responseData
          });
          return;
        }

        // 处理其他错误
        const errorMessage = responseData?.message || getErrorMessage(null, statusCode);
        if (shouldShowError) {
          showError(errorMessage);
        }

        reject({
          code: statusCode,
          message: errorMessage,
          data: responseData
        });
      },
      fail: (error) => {
        // 隐藏加载提示
        if (showLoading) {
          wx.hideLoading();
        }

        const errorMessage = getErrorMessage(error, 0);
        if (shouldShowError) {
          showError(errorMessage);
        }

        reject({
          code: 0,
          message: errorMessage,
          error
        });
      }
    });
  });
};

/**
 * GET 请求快捷方法
 * @param {string} url 请求路径
 * @param {Object} [data] 请求参数
 * @param {Object} [options] 其他配置
 * @returns {Promise<Object>} 响应数据
 */
const get = (url, data, options = {}) => {
  return request({
    url,
    method: 'GET',
    data,
    ...options
  });
};

/**
 * POST 请求快捷方法
 * @param {string} url 请求路径
 * @param {Object} [data] 请求数据
 * @param {Object} [options] 其他配置
 * @returns {Promise<Object>} 响应数据
 */
const post = (url, data, options = {}) => {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  });
};

/**
 * PUT 请求快捷方法
 * @param {string} url 请求路径
 * @param {Object} [data] 请求数据
 * @param {Object} [options] 其他配置
 * @returns {Promise<Object>} 响应数据
 */
const put = (url, data, options = {}) => {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  });
};

/**
 * DELETE 请求快捷方法
 * @param {string} url 请求路径
 * @param {Object} [data] 请求数据
 * @param {Object} [options] 其他配置
 * @returns {Promise<Object>} 响应数据
 */
const del = (url, data, options = {}) => {
  return request({
    url,
    method: 'DELETE',
    data,
    ...options
  });
};

module.exports = {
  BASE_URL,
  request,
  get,
  post,
  put,
  del,
  showError,
  ERROR_MESSAGES
};
