/**
 * CloudBase 云托管请求封装模块
 * 使用 wx.cloud.callContainer 调用云托管服务
 */

// 云托管配置
const CLOUDBASE_CONFIG = {
  env: '', // 云开发环境 ID，在 app.js 中初始化时设置
  serviceName: 'express', // 云托管服务名称
};

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  retryableErrors: ['NETWORK_TIMEOUT', 'SYS_CLOUD_ERROR']
};

// 错误消息映射
const ERROR_MESSAGES = {
  'network': '网络不给力，请检查网络连接',
  'timeout': '请求超时，请稍后重试',
  'server': '服务器开小差了，请稍后重试',
  'auth': '登录已过期，请重新登录',
  'default': '操作失败，请稍后重试'
};

// 错误码定义
const ERROR_CODES = {
  NETWORK_TIMEOUT: { code: 'NETWORK_TIMEOUT', message: '网络超时，请检查网络后重试', retryable: true },
  NETWORK_OFFLINE: { code: 'NETWORK_OFFLINE', message: '网络不可用，请检查网络连接', retryable: false },
  AUTH_EXPIRED: { code: 'AUTH_EXPIRED', message: '登录已过期，请重新登录', retryable: false },
  AUTH_FAILED: { code: 'AUTH_FAILED', message: '登录失败，请重试', retryable: false },
  SYS_CLOUD_ERROR: { code: 'SYS_CLOUD_ERROR', message: '云服务异常', retryable: true },
  SYS_UNKNOWN: { code: 'SYS_UNKNOWN', message: '系统错误，请稍后重试', retryable: false }
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
 * @returns {Object} 错误信息对象
 */
const getErrorInfo = (error, statusCode) => {
  if (error && error.errMsg && error.errMsg.includes('timeout')) {
    return ERROR_CODES.NETWORK_TIMEOUT;
  }
  if (error && error.errMsg && error.errMsg.includes('fail')) {
    return ERROR_CODES.NETWORK_OFFLINE;
  }
  if (statusCode === 401 || statusCode === 403) {
    return ERROR_CODES.AUTH_EXPIRED;
  }
  if (statusCode >= 500) {
    return ERROR_CODES.SYS_CLOUD_ERROR;
  }
  return ERROR_CODES.SYS_UNKNOWN;
};

/**
 * 获取错误消息（兼容旧方法）
 * @param {Object} error 错误对象
 * @param {number} statusCode HTTP状态码
 * @returns {string} 错误消息
 */
const getErrorMessage = (error, statusCode) => {
  return getErrorInfo(error, statusCode).message;
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
 * @param {number} [options.retryCount=0] 当前重试次数（内部使用）
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
      showError: shouldShowError = true,
      retryCount = 0
    } = options;

    // 检查是否已初始化
    if (!CLOUDBASE_CONFIG.env) {
      const errorMsg = '云开发环境未初始化，请在 app.js 中调用 wx.cloud.init()';
      console.error('[CloudBase Request]', errorMsg);
      if (shouldShowError) {
        showError(errorMsg);
      }
      reject({ code: -1, message: errorMsg, errorCode: 'SYS_UNKNOWN' });
      return;
    }

    // 获取本地存储的 token
    const token = wx.getStorageSync('token');

    // 显示加载提示（仅首次请求显示）
    if (showLoading && retryCount === 0) {
      wx.showLoading({
        title: loadingText,
        mask: true
      });
    }

    // 构建请求头 - 确保包含 X-WX-SERVICE
    const requestHeader = {
      'Content-Type': 'application/json',
      'X-WX-SERVICE': CLOUDBASE_CONFIG.serviceName,
      ...header
    };

    // 自动携带 token
    if (token) {
      requestHeader['Authorization'] = `Bearer ${token}`;
    }

    console.log('[CloudBase Request]', method, path, { env: CLOUDBASE_CONFIG.env, service: CLOUDBASE_CONFIG.serviceName });

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
          showError(ERROR_CODES.AUTH_EXPIRED.message);
        }

        // 尝试重新登录
        const app = getApp();
        if (app && app.login) {
          app.login();
        }

        reject({
          code: statusCode,
          message: ERROR_CODES.AUTH_EXPIRED.message,
          errorCode: 'AUTH_EXPIRED',
          data: responseData
        });
        return;
      }

      // 处理其他错误
      const errorInfo = getErrorInfo(null, statusCode);
      const errorMessage = responseData?.message || errorInfo.message;
      
      // 检查是否可重试
      if (errorInfo.retryable && retryCount < RETRY_CONFIG.maxRetries) {
        const delay = RETRY_CONFIG.exponentialBackoff 
          ? RETRY_CONFIG.retryDelay * Math.pow(2, retryCount)
          : RETRY_CONFIG.retryDelay;
        
        console.log(`[CloudBase Request] 请求失败，${delay}ms 后重试 (${retryCount + 1}/${RETRY_CONFIG.maxRetries})`);
        
        setTimeout(() => {
          cloudRequest({ ...options, retryCount: retryCount + 1 })
            .then(resolve)
            .catch(reject);
        }, delay);
        return;
      }
      
      if (shouldShowError) {
        showError(errorMessage);
      }

      reject({
        code: statusCode,
        message: errorMessage,
        errorCode: errorInfo.code,
        data: responseData
      });
    }).catch(error => {
      // 隐藏加载提示
      if (showLoading) {
        wx.hideLoading();
      }

      const errorInfo = getErrorInfo(error, 0);
      
      // 检查是否可重试
      if (errorInfo.retryable && retryCount < RETRY_CONFIG.maxRetries) {
        const delay = RETRY_CONFIG.exponentialBackoff 
          ? RETRY_CONFIG.retryDelay * Math.pow(2, retryCount)
          : RETRY_CONFIG.retryDelay;
        
        console.log(`[CloudBase Request] 请求失败，${delay}ms 后重试 (${retryCount + 1}/${RETRY_CONFIG.maxRetries})`);
        
        setTimeout(() => {
          cloudRequest({ ...options, retryCount: retryCount + 1 })
            .then(resolve)
            .catch(reject);
        }, delay);
        return;
      }
      
      if (shouldShowError) {
        showError(errorInfo.message);
      }

      reject({
        code: 0,
        message: errorInfo.message,
        errorCode: errorInfo.code,
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
  ERROR_MESSAGES,
  ERROR_CODES,
  RETRY_CONFIG,
  getErrorInfo,
  getErrorMessage
};
