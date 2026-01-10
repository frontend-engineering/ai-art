/**
 * 错误处理模块
 * 统一管理错误码、错误提示和日志记录
 */

// 错误码定义
const ERROR_CODES = {
  // 网络错误 (1xxx)
  NETWORK_ERROR: { code: 1001, message: '网络连接失败，请检查网络' },
  NETWORK_TIMEOUT: { code: 1002, message: '请求超时，请重试' },
  SERVER_ERROR: { code: 1003, message: '服务器繁忙，请稍后重试' },
  
  // 认证错误 (2xxx)
  AUTH_FAILED: { code: 2001, message: '登录失败，请重试' },
  AUTH_EXPIRED: { code: 2002, message: '登录已过期，请重新登录' },
  AUTH_INVALID: { code: 2003, message: '登录状态无效' },
  AUTH_REFRESH_FAILED: { code: 2004, message: '刷新登录状态失败' },
  
  // 支付错误 (3xxx)
  PAY_CREATE_FAILED: { code: 3001, message: '创建订单失败' },
  PAY_CANCELLED: { code: 3002, message: '支付已取消' },
  PAY_FAILED: { code: 3003, message: '支付失败，请重试' },
  PAY_QUERY_FAILED: { code: 3004, message: '查询订单失败' },
  PAY_REFUND_FAILED: { code: 3005, message: '退款申请失败' },
  PAY_INVALID_PACKAGE: { code: 3006, message: '无效的套餐类型' },
  PAY_AMOUNT_ERROR: { code: 3007, message: '金额错误' },
  
  // 业务错误 (4xxx)
  PARAM_INVALID: { code: 4001, message: '参数错误' },
  DATA_NOT_FOUND: { code: 4002, message: '数据不存在' },
  OPERATION_FAILED: { code: 4003, message: '操作失败' },
  PERMISSION_DENIED: { code: 4004, message: '没有权限' },
  
  // 系统错误 (5xxx)
  SYSTEM_ERROR: { code: 5001, message: '系统错误，请稍后重试' },
  CLOUD_FUNCTION_ERROR: { code: 5002, message: '云函数调用失败' },
  DATABASE_ERROR: { code: 5003, message: '数据库操作失败' }
};

// 日志级别
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// 当前日志级别 (生产环境设为 WARN)
let currentLogLevel = LOG_LEVELS.INFO;

/**
 * 设置日志级别
 */
const setLogLevel = (level) => {
  if (LOG_LEVELS[level] !== undefined) {
    currentLogLevel = LOG_LEVELS[level];
  }
};

/**
 * 日志输出
 */
const log = {
  debug: (tag, message, data) => {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      console.debug(`[${tag}]`, message, data || '');
    }
  },
  info: (tag, message, data) => {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      console.log(`[${tag}]`, message, data || '');
    }
  },
  warn: (tag, message, data) => {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      console.warn(`[${tag}]`, message, data || '');
    }
  },
  error: (tag, message, data) => {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      console.error(`[${tag}]`, message, data || '');
    }
  }
};

/**
 * 创建标准错误对象
 */
const createError = (errorType, customMessage, originalError) => {
  const errorDef = ERROR_CODES[errorType] || ERROR_CODES.SYSTEM_ERROR;
  return {
    code: errorDef.code,
    type: errorType,
    message: customMessage || errorDef.message,
    originalError: originalError || null,
    timestamp: Date.now()
  };
};

/**
 * 解析错误类型
 */
const parseErrorType = (error) => {
  if (!error) return 'SYSTEM_ERROR';
  
  const errMsg = error.errMsg || error.message || String(error);
  
  // 网络错误
  if (errMsg.includes('timeout') || errMsg.includes('超时')) return 'NETWORK_TIMEOUT';
  if (errMsg.includes('network') || errMsg.includes('网络')) return 'NETWORK_ERROR';
  if (errMsg.includes('fail') && errMsg.includes('request')) return 'NETWORK_ERROR';
  
  // 认证错误
  if (errMsg.includes('auth') || errMsg.includes('login') || errMsg.includes('登录')) {
    if (errMsg.includes('expired') || errMsg.includes('过期')) return 'AUTH_EXPIRED';
    return 'AUTH_FAILED';
  }
  
  // 支付错误
  if (errMsg.includes('cancel') || errMsg.includes('取消')) return 'PAY_CANCELLED';
  if (errMsg.includes('pay') || errMsg.includes('支付')) return 'PAY_FAILED';
  
  // 云函数错误
  if (errMsg.includes('cloud') || errMsg.includes('function')) return 'CLOUD_FUNCTION_ERROR';
  
  return 'SYSTEM_ERROR';
};

/**
 * 处理错误并返回友好提示
 */
const handleError = (error, tag = 'Error') => {
  const errorType = parseErrorType(error);
  const standardError = createError(errorType, null, error);
  
  log.error(tag, standardError.message, { type: errorType, original: error });
  
  return standardError;
};

/**
 * 显示错误提示
 */
const showError = (error, duration = 2000) => {
  const message = typeof error === 'string' ? error : (error.message || '操作失败');
  wx.showToast({
    title: message,
    icon: 'none',
    duration
  });
};

/**
 * 上报错误到后端
 */
const reportError = async (error, context = {}) => {
  try {
    const app = getApp();
    const errorData = {
      ...error,
      context,
      userId: app?.globalData?.userId,
      deviceInfo: wx.getDeviceInfo?.() || {},
      timestamp: Date.now()
    };
    
    // 通过云函数上报 (可选实现)
    log.info('ErrorReport', '错误已记录', errorData);
  } catch (e) {
    log.warn('ErrorReport', '上报错误失败', e);
  }
};

module.exports = {
  ERROR_CODES,
  LOG_LEVELS,
  setLogLevel,
  log,
  createError,
  parseErrorType,
  handleError,
  showError,
  reportError
};
