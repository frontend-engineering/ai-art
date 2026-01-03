/**
 * API重试工具测试
 * 
 * 测试API重试逻辑的正确性
 */

const { executeWithRetry, withRetry, isRetryableError, executeWithSmartRetry } = require('../apiRetry');

describe('API重试工具测试', () => {
  
  describe('executeWithRetry', () => {
    
    test('成功的API调用不应重试', async () => {
      let callCount = 0;
      const mockApi = jest.fn(async () => {
        callCount++;
        return { success: true, data: 'test' };
      });

      const result = await executeWithRetry(mockApi, {
        maxRetries: 1,
        timeout: 5000,
        operationName: '测试API'
      });

      expect(callCount).toBe(1);
      expect(mockApi).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true, data: 'test' });
    });

    test('失败的API调用应重试1次', async () => {
      let callCount = 0;
      const mockApi = jest.fn(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('第一次调用失败');
        }
        return { success: true, data: 'test' };
      });

      const result = await executeWithRetry(mockApi, {
        maxRetries: 1,
        timeout: 5000,
        operationName: '测试API'
      });

      expect(callCount).toBe(2);
      expect(mockApi).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true, data: 'test' });
    });

    test('连续失败应抛出错误', async () => {
      let callCount = 0;
      const mockApi = jest.fn(async () => {
        callCount++;
        throw new Error('API调用失败');
      });

      await expect(
        executeWithRetry(mockApi, {
          maxRetries: 1,
          timeout: 5000,
          operationName: '测试API'
        })
      ).rejects.toThrow('测试API失败');

      expect(callCount).toBe(2); // 初始调用 + 1次重试
      expect(mockApi).toHaveBeenCalledTimes(2);
    });

    test('超时应触发重试', async () => {
      let callCount = 0;
      const mockApi = jest.fn(async () => {
        callCount++;
        if (callCount === 1) {
          // 第一次调用超时
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        return { success: true, data: 'test' };
      });

      const result = await executeWithRetry(mockApi, {
        maxRetries: 1,
        timeout: 1000, // 1秒超时
        operationName: '测试API'
      });

      expect(callCount).toBe(2);
      expect(result).toEqual({ success: true, data: 'test' });
    });

    test('重试回调应被调用', async () => {
      let callCount = 0;
      let retryCallbackCalled = false;
      
      const mockApi = jest.fn(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('第一次调用失败');
        }
        return { success: true, data: 'test' };
      });

      const onRetry = jest.fn((attempt, error) => {
        retryCallbackCalled = true;
        expect(attempt).toBe(1);
        expect(error.message).toBe('第一次调用失败');
      });

      await executeWithRetry(mockApi, {
        maxRetries: 1,
        timeout: 5000,
        operationName: '测试API',
        onRetry
      });

      expect(retryCallbackCalled).toBe(true);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('withRetry', () => {
    
    test('包装后的函数应具有重试能力', async () => {
      let callCount = 0;
      const mockApi = async (param) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('第一次调用失败');
        }
        return { success: true, param };
      };

      const wrappedApi = withRetry(mockApi, {
        maxRetries: 1,
        timeout: 5000,
        operationName: '包装API'
      });

      const result = await wrappedApi('test-param');

      expect(callCount).toBe(2);
      expect(result).toEqual({ success: true, param: 'test-param' });
    });
  });

  describe('isRetryableError', () => {
    
    test('网络错误应可重试', () => {
      const errors = [
        { code: 'ECONNRESET' },
        { code: 'ETIMEDOUT' },
        { code: 'ENOTFOUND' },
        { code: 'ECONNREFUSED' }
      ];

      errors.forEach(error => {
        expect(isRetryableError(error)).toBe(true);
      });
    });

    test('5xx服务器错误应可重试', () => {
      const errors = [
        { statusCode: 500 },
        { statusCode: 502 },
        { statusCode: 503 },
        { statusCode: 504 }
      ];

      errors.forEach(error => {
        expect(isRetryableError(error)).toBe(true);
      });
    });

    test('429错误应可重试', () => {
      const error = { statusCode: 429 };
      expect(isRetryableError(error)).toBe(true);
    });

    test('4xx客户端错误不应重试', () => {
      const errors = [
        { statusCode: 400 },
        { statusCode: 401 },
        { statusCode: 403 },
        { statusCode: 404 }
      ];

      errors.forEach(error => {
        expect(isRetryableError(error)).toBe(false);
      });
    });

    test('超时错误应可重试', () => {
      const error = { message: 'API调用超时' };
      expect(isRetryableError(error)).toBe(true);
    });
  });

  describe('executeWithSmartRetry', () => {
    
    test('可重试错误应触发重试', async () => {
      let callCount = 0;
      const mockApi = jest.fn(async () => {
        callCount++;
        if (callCount === 1) {
          const error = new Error('网络错误');
          error.code = 'ECONNRESET';
          throw error;
        }
        return { success: true, data: 'test' };
      });

      const result = await executeWithSmartRetry(mockApi, {
        maxRetries: 1,
        timeout: 5000,
        operationName: '智能重试API'
      });

      expect(callCount).toBe(2);
      expect(result).toEqual({ success: true, data: 'test' });
    });

    test('不可重试错误应直接抛出', async () => {
      let callCount = 0;
      const mockApi = jest.fn(async () => {
        callCount++;
        const error = new Error('参数错误');
        error.statusCode = 400;
        throw error;
      });

      await expect(
        executeWithSmartRetry(mockApi, {
          maxRetries: 1,
          timeout: 5000,
          operationName: '智能重试API'
        })
      ).rejects.toThrow('参数错误');

      expect(callCount).toBe(1); // 不应重试
    });
  });
});
