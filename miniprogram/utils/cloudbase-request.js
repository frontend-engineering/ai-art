/**
 * CloudBase 云托管请求封装模块
 * 使用 wx.cloud.callContainer 调用云托管服务
 */

// 云托管配置
const CLOUDBASE_CONFIG = {
  env: '', // 云开发环境 ID，在 app.js 中初始化时设置
  serviceName: 'ai-family-photo-api', // 云托管服务名称
};

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
 * 设置云开发环境 ID
 * @param {string} envId 云开发环境 ID
 */
const setEnvId = (envId) => {
  CLOUDBASE_CONFIG.env = envId;
};

/**
 * 发起云托管请求
 * @param {Object} options 请求配置
 * @param {string} options.path 请求路径（如 /api/user/init）
 * @param {string} [options.method='GET'] 请求方法
 * @param {Object} [options.data] 请求数据
 * @param {Object} [options.header] 自定义请求头
 * @param {boolean} [options.showLoading=false] 是否显示加载提示
 * @param {string} [options.loadingText='加载中...'] 加载提示文字
 * @param {boolean} [options.showError=true] 是否显示错误提示
 * @returns {Promise<Object>} 响应数据
 */
const cloudRequest = (options) => {
  return new Promise((resolve, reject) => {
    const {
      path,
      method = 'GET',
      data,
      header = {},
      showLoading = false,
      loadingText = '加载中...',
      showError: shouldShowError = true
    } = options;

    // 检查是否已初始化
    if (!CLOUDBASE_CONFIG.env) {
      const errorMsg = '云开发环境未初始化，请在 app.js 中调用 wx.cloud.init()';
      console.error(errorMsg);
      if (shouldShowError) {
        showError(errorMsg);
      }
      reject({ code: -1, message: errorMsg });
      return;
    }

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
      'X-WX-SERVICE': CLOUDBASE_CONFIG.serviceName,
      ...header
    };

    // 自动携带 token
    if (token) {
      requestHeader['Authorization'] = `Bearer ${token}`;
    }

    // 发起云托管请求
    wx.cloud.callContainer({
      config: {
        env: CLOUDBASE_CONFIG.env
      },
      path: path,
      method: method,
      header: requestHeader,
      data: data,
      dataType: 'json'
    }).then(res => {
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
    }).catch(error => {
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
    });
  });
};

/**
 * GET 请求快捷方法
 * @param {string} path 请求路径
 * @param {Object} [data] 请求参数
 * @param {Object} [options] 其他配置
 * @returns {Promise<Object>} 响应数据
 */
const get = (path, data, options = {}) => {
  return cloudRequest({
    path,
    method: 'GET',
    data,
    ...options
  });
};

/**
 * POST 请求快捷方法
 * @param {string} path 请求路径
 * @param {Object} [data] 请求数据
 * @param {Object} [options] 其他配置
 * @returns {Promise<Object>} 响应数据
 */
const post = (path, data, options = {}) => {
  return cloudRequest({
    path,
    method: 'POST',
    data,
    ...options
  });
};

/**
 * PUT 请求快捷方法
 * @param {string} path 请求路径
 * @param {Object} [data] 请求数据
 * @param {Object} [options] 其他配置
 * @returns {Promise<Object>} 响应数据
 */
const put = (path, data, options = {}) => {
  return cloudRequest({
    path,
    method: 'PUT',
    data,
    ...options
  });
};

/**
 * DELETE 请求快捷方法
 * @param {string} path 请求路径
 * @param {Object} [data] 请求数据
 * @param {Object} [options] 其他配置
 * @returns {Promise<Object>} 响应数据
 */
const del = (path, data, options = {}) => {
  return cloudRequest({
    path,
    method: 'DELETE',
    data,
    ...options
  });
};

module.exports = {
  setEnvId,
  cloudRequest,
  get,
  post,
  put,
  del,
  showError,
  ERROR_MESSAGES
};
