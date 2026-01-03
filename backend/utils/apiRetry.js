/**
 * API重试工具模块
 * 
 * 实现自动重试逻辑，用于处理API调用失败的情况
 * 
 * 功能特性:
 * - 失败自动重试1次
 * - 超时时间30秒
 * - 支持Promise和async/await
 * - 详细的错误日志记录
 * 
 * Requirements: 11.1
 */

/**
 * 执行带重试的API调用
 * 
 * @param {Function} apiFunction - 要执行的API函数（必须返回Promise）
 * @param {Object} options - 配置选项
 * @param {number} options.maxRetries - 最大重试次数（默认1次）
 * @param {number} options.timeout - 超时时间（毫秒，默认30000ms）
 * @param {string} options.operationName - 操作名称（用于日志记录）
 * @param {Function} options.onRetry - 重试回调函数（可选）
 * @returns {Promise} API调用结果
 */
async function executeWithRetry(apiFunction, options = {}) {
  const {
    maxRetries = 1,
    timeout = 30000,
    operationName = 'API调用',
    onRetry = null
  } = options;

  let lastError = null;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      attempt++;
      
      console.log(`[API重试] ${operationName} - 第 ${attempt} 次尝试 (最多 ${maxRetries + 1} 次)`);

      // 创建超时Promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`${operationName}超时 (${timeout}ms)`));
        }, timeout);
      });

      // 执行API调用，带超时控制
      const result = await Promise.race([
        apiFunction(),
        timeoutPromise
      ]);

      console.log(`[API重试] ${operationName} - 第 ${attempt} 次尝试成功`);
      return result;

    } catch (error) {
      lastError = error;
      
      console.error(`[API重试] ${operationName} - 第 ${attempt} 次尝试失败:`, error.message);

      // 如果还有重试机会
      if (attempt <= maxRetries) {
        console.log(`[API重试] ${operationName} - 准备重试 (剩余 ${maxRetries - attempt + 1} 次机会)`);
        
        // 调用重试回调（如果提供）
        if (onRetry && typeof onRetry === 'function') {
          try {
            await onRetry(attempt, error);
          } catch (callbackError) {
            console.error(`[API重试] 重试回调执行失败:`, callbackError);
          }
        }

        // 等待一小段时间再重试（指数退避）
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[API重试] ${operationName} - 等待 ${delay}ms 后重试`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // 已达到最大重试次数
        console.error(`[API重试] ${operationName} - 已达到最大重试次数 (${maxRetries + 1} 次)，放弃重试`);
      }
    }
  }

  // 所有重试都失败，抛出最后一次的错误
  throw new Error(`${operationName}失败 (已重试 ${maxRetries} 次): ${lastError.message}`);
}

/**
 * 包装API函数，使其具有自动重试能力
 * 
 * @param {Function} apiFunction - 要包装的API函数
 * @param {Object} defaultOptions - 默认配置选项
 * @returns {Function} 包装后的函数
 */
function withRetry(apiFunction, defaultOptions = {}) {
  return async function(...args) {
    return executeWithRetry(
      () => apiFunction(...args),
      {
        ...defaultOptions,
        operationName: defaultOptions.operationName || apiFunction.name || 'API调用'
      }
    );
  };
}

/**
 * 判断错误是否可重试
 * 
 * @param {Error} error - 错误对象
 * @returns {boolean} 是否可重试
 */
function isRetryableError(error) {
  // 网络错误通常可重试
  if (error.code === 'ECONNRESET' || 
      error.code === 'ETIMEDOUT' || 
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED') {
    return true;
  }

  // 超时错误可重试
  if (error.message && error.message.includes('超时')) {
    return true;
  }

  // 5xx服务器错误可重试
  if (error.statusCode && error.statusCode >= 500 && error.statusCode < 600) {
    return true;
  }

  // 429 Too Many Requests 可重试
  if (error.statusCode === 429) {
    return true;
  }

  // 其他错误不重试（如4xx客户端错误）
  return false;
}

/**
 * 智能重试 - 只对可重试的错误进行重试
 * 
 * @param {Function} apiFunction - 要执行的API函数
 * @param {Object} options - 配置选项
 * @returns {Promise} API调用结果
 */
async function executeWithSmartRetry(apiFunction, options = {}) {
  const {
    maxRetries = 1,
    timeout = 30000,
    operationName = 'API调用',
    onRetry = null
  } = options;

  let lastError = null;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      attempt++;
      
      console.log(`[智能重试] ${operationName} - 第 ${attempt} 次尝试`);

      // 创建超时Promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`${operationName}超时 (${timeout}ms)`));
        }, timeout);
      });

      // 执行API调用
      const result = await Promise.race([
        apiFunction(),
        timeoutPromise
      ]);

      console.log(`[智能重试] ${operationName} - 成功`);
      return result;

    } catch (error) {
      lastError = error;
      
      console.error(`[智能重试] ${operationName} - 失败:`, error.message);

      // 检查是否可重试
      const canRetry = isRetryableError(error);
      
      if (!canRetry) {
        console.log(`[智能重试] ${operationName} - 错误不可重试，直接抛出`);
        throw error;
      }

      // 如果还有重试机会
      if (attempt <= maxRetries) {
        console.log(`[智能重试] ${operationName} - 错误可重试，准备重试`);
        
        if (onRetry && typeof onRetry === 'function') {
          try {
            await onRetry(attempt, error);
          } catch (callbackError) {
            console.error(`[智能重试] 重试回调执行失败:`, callbackError);
          }
        }

        // 指数退避
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[智能重试] ${operationName} - 等待 ${delay}ms 后重试`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`[智能重试] ${operationName} - 已达到最大重试次数`);
      }
    }
  }

  throw new Error(`${operationName}失败 (已重试 ${maxRetries} 次): ${lastError.message}`);
}

module.exports = {
  executeWithRetry,
  withRetry,
  isRetryableError,
  executeWithSmartRetry
};
