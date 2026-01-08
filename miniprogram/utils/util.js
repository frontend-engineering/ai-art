/**
 * 通用工具函数模块
 */

/**
 * 格式化时间
 * @param {Date|number|string} date 日期对象、时间戳或日期字符串
 * @param {string} [format='YYYY-MM-DD HH:mm:ss'] 格式化模板
 * @returns {string} 格式化后的时间字符串
 */
const formatTime = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  const d = date instanceof Date ? date : new Date(date);
  
  if (isNaN(d.getTime())) {
    return '';
  }

  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();
  const minute = d.getMinutes();
  const second = d.getSeconds();

  const pad = (n) => n.toString().padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', pad(month))
    .replace('DD', pad(day))
    .replace('HH', pad(hour))
    .replace('mm', pad(minute))
    .replace('ss', pad(second));
};

/**
 * 格式化相对时间
 * @param {Date|number|string} date 日期
 * @returns {string} 相对时间描述
 */
const formatRelativeTime = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;

  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  } else if (diff < week) {
    return `${Math.floor(diff / day)}天前`;
  } else if (diff < month) {
    return `${Math.floor(diff / week)}周前`;
  } else {
    return formatTime(d, 'MM-DD');
  }
};

/**
 * 生成唯一ID
 * @param {string} [prefix=''] 前缀
 * @returns {string} 唯一ID
 */
const generateId = (prefix = '') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
};

/**
 * 防抖函数
 * @param {Function} fn 要执行的函数
 * @param {number} [delay=300] 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
const debounce = (fn, delay = 300) => {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

/**
 * 节流函数
 * @param {Function} fn 要执行的函数
 * @param {number} [interval=300] 间隔时间（毫秒）
 * @returns {Function} 节流后的函数
 */
const throttle = (fn, interval = 300) => {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
};

/**
 * 延迟执行
 * @param {number} ms 延迟时间（毫秒）
 * @returns {Promise<void>}
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 深拷贝
 * @param {any} obj 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }
  
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 * @returns {string} 格式化后的大小
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
};

/**
 * 格式化价格
 * @param {number} price 价格（元）
 * @param {string} [symbol='¥'] 货币符号
 * @returns {string} 格式化后的价格
 */
const formatPrice = (price, symbol = '¥') => {
  if (typeof price !== 'number' || isNaN(price)) {
    return `${symbol}0.00`;
  }
  return `${symbol}${price.toFixed(2)}`;
};

/**
 * 检查是否为空
 * @param {any} value 要检查的值
 * @returns {boolean} 是否为空
 */
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * 获取系统信息
 * @returns {Object} 系统信息
 */
const getSystemInfo = () => {
  try {
    return wx.getSystemInfoSync();
  } catch (err) {
    console.error('[Util] 获取系统信息失败:', err);
    return {};
  }
};

/**
 * 检查是否为 iOS 系统
 * @returns {boolean}
 */
const isIOS = () => {
  const systemInfo = getSystemInfo();
  return systemInfo.platform === 'ios';
};

/**
 * 检查是否为 Android 系统
 * @returns {boolean}
 */
const isAndroid = () => {
  const systemInfo = getSystemInfo();
  return systemInfo.platform === 'android';
};

/**
 * 获取安全区域信息
 * @returns {Object} 安全区域信息
 */
const getSafeArea = () => {
  const systemInfo = getSystemInfo();
  return systemInfo.safeArea || {
    top: 0,
    bottom: systemInfo.windowHeight || 0,
    left: 0,
    right: systemInfo.windowWidth || 0,
    width: systemInfo.windowWidth || 0,
    height: systemInfo.windowHeight || 0
  };
};

/**
 * rpx 转 px
 * @param {number} rpx rpx 值
 * @returns {number} px 值
 */
const rpxToPx = (rpx) => {
  const systemInfo = getSystemInfo();
  const windowWidth = systemInfo.windowWidth || 375;
  return rpx * windowWidth / 750;
};

/**
 * px 转 rpx
 * @param {number} px px 值
 * @returns {number} rpx 值
 */
const pxToRpx = (px) => {
  const systemInfo = getSystemInfo();
  const windowWidth = systemInfo.windowWidth || 375;
  return px * 750 / windowWidth;
};

/**
 * 震动反馈
 * @param {string} [type='light'] 震动类型 ('light' | 'medium' | 'heavy')
 */
const vibrate = (type = 'light') => {
  wx.vibrateShort({ type });
};

/**
 * 显示确认对话框
 * @param {Object} options 配置
 * @param {string} options.title 标题
 * @param {string} options.content 内容
 * @param {string} [options.confirmText='确定'] 确认按钮文字
 * @param {string} [options.cancelText='取消'] 取消按钮文字
 * @returns {Promise<boolean>} 是否确认
 */
const showConfirm = (options) => {
  return new Promise((resolve) => {
    wx.showModal({
      title: options.title,
      content: options.content,
      confirmText: options.confirmText || '确定',
      cancelText: options.cancelText || '取消',
      success: (res) => {
        resolve(res.confirm);
      },
      fail: () => {
        resolve(false);
      }
    });
  });
};

/**
 * 显示提示
 * @param {string} title 提示内容
 * @param {string} [icon='none'] 图标类型
 * @param {number} [duration=2000] 显示时长
 */
const showToast = (title, icon = 'none', duration = 2000) => {
  wx.showToast({
    title,
    icon,
    duration
  });
};

/**
 * 显示加载中
 * @param {string} [title='加载中...'] 提示文字
 */
const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title,
    mask: true
  });
};

/**
 * 隐藏加载中
 */
const hideLoading = () => {
  wx.hideLoading();
};

module.exports = {
  formatTime,
  formatRelativeTime,
  generateId,
  debounce,
  throttle,
  sleep,
  deepClone,
  formatFileSize,
  formatPrice,
  isEmpty,
  getSystemInfo,
  isIOS,
  isAndroid,
  getSafeArea,
  rpxToPx,
  pxToRpx,
  vibrate,
  showConfirm,
  showToast,
  showLoading,
  hideLoading
};
