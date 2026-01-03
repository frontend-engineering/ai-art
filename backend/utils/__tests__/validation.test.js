/**
 * 参数校验工具测试
 */

const {
  validateRequiredFields,
  validateStringLength,
  validateUrl,
  validateArrayLength,
  validateEnum,
  validateNumberRange,
  validateUUID,
  validatePhone,
  validateGenerateArtPhotoParams,
  validateCreatePaymentParams,
  validateWechatPaymentParams,
  validateUploadImageParams,
  validateExtractFacesParams,
  validateCreateProductOrderParams,
  validateGenerateVideoParams
} = require('../validation');

describe('基础校验函数', () => {
  describe('validateRequiredFields', () => {
    test('所有必需字段存在时返回valid=true', () => {
      const data = { name: 'test', age: 25, email: 'test@example.com' };
      const result = validateRequiredFields(data, ['name', 'age', 'email']);
      expect(result.valid).toBe(true);
      expect(result.missingFields).toEqual([]);
    });

    test('缺少必需字段时返回valid=false', () => {
      const data = { name: 'test' };
      const result = validateRequiredFields(data, ['name', 'age', 'email']);
      expect(result.valid).toBe(false);
      expect(result.missingFields).toEqual(['age', 'email']);
    });

    test('空字符串视为缺失', () => {
      const data = { name: '', age: 25 };
      const result = validateRequiredFields(data, ['name', 'age']);
      expect(result.valid).toBe(false);
      expect(result.missingFields).toEqual(['name']);
    });
  });

  describe('validateStringLength', () => {
    test('字符串长度在范围内返回true', () => {
      expect(validateStringLength('hello', 1, 10)).toBe(true);
    });

    test('字符串长度超出范围返回false', () => {
      expect(validateStringLength('hello', 10, 20)).toBe(false);
      expect(validateStringLength('hello world', 1, 5)).toBe(false);
    });

    test('非字符串返回false', () => {
      expect(validateStringLength(123, 1, 10)).toBe(false);
    });
  });

  describe('validateUrl', () => {
    test('有效URL返回true', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://example.com/path')).toBe(true);
    });

    test('无效URL返回false', () => {
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('ftp://example.com')).toBe(true); // ftp也是有效协议
    });

    test('非字符串返回false', () => {
      expect(validateUrl(123)).toBe(false);
    });
  });

  describe('validateArrayLength', () => {
    test('数组长度在范围内返回true', () => {
      expect(validateArrayLength([1, 2, 3], 1, 5)).toBe(true);
    });

    test('数组长度超出范围返回false', () => {
      expect(validateArrayLength([1, 2, 3], 5, 10)).toBe(false);
    });

    test('非数组返回false', () => {
      expect(validateArrayLength('not-array', 1, 5)).toBe(false);
    });
  });

  describe('validateEnum', () => {
    test('值在枚举列表中返回true', () => {
      expect(validateEnum('free', ['free', 'basic', 'premium'])).toBe(true);
    });

    test('值不在枚举列表中返回false', () => {
      expect(validateEnum('invalid', ['free', 'basic', 'premium'])).toBe(false);
    });
  });

  describe('validateNumberRange', () => {
    test('数字在范围内返回true', () => {
      expect(validateNumberRange(5, 1, 10)).toBe(true);
    });

    test('数字超出范围返回false', () => {
      expect(validateNumberRange(15, 1, 10)).toBe(false);
    });

    test('非数字返回false', () => {
      expect(validateNumberRange('5', 1, 10)).toBe(false);
    });
  });

  describe('validateUUID', () => {
    test('有效UUID返回true', () => {
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    test('无效UUID返回false', () => {
      expect(validateUUID('not-a-uuid')).toBe(false);
      expect(validateUUID('550e8400-e29b-41d4-a716')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    test('有效手机号返回true', () => {
      expect(validatePhone('13800138000')).toBe(true);
      expect(validatePhone('18912345678')).toBe(true);
    });

    test('无效手机号返回false', () => {
      expect(validatePhone('12345678901')).toBe(false);
      expect(validatePhone('1380013800')).toBe(false);
    });
  });
});

describe('业务校验函数', () => {
  describe('validateGenerateArtPhotoParams', () => {
    test('有效参数返回valid=true', () => {
      const params = {
        prompt: 'test prompt',
        imageUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
        userId: '550e8400-e29b-41d4-a716-446655440000'
      };
      const result = validateGenerateArtPhotoParams(params);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('缺少必需参数返回valid=false', () => {
      const params = {
        prompt: 'test prompt'
      };
      const result = validateGenerateArtPhotoParams(params);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('imageUrls超过最大数量返回错误', () => {
      const params = {
        prompt: 'test prompt',
        imageUrls: Array(15).fill('https://example.com/image.jpg'),
        userId: '550e8400-e29b-41d4-a716-446655440000'
      };
      const result = validateGenerateArtPhotoParams(params);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('imageUrls'))).toBe(true);
    });

    test('无效URL格式返回错误', () => {
      const params = {
        prompt: 'test prompt',
        imageUrls: ['not-a-url'],
        userId: '550e8400-e29b-41d4-a716-446655440000'
      };
      const result = validateGenerateArtPhotoParams(params);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('URL'))).toBe(true);
    });

    test('facePositions参数校验', () => {
      const params = {
        prompt: 'test prompt',
        imageUrls: ['https://example.com/image.jpg'],
        userId: '550e8400-e29b-41d4-a716-446655440000',
        facePositions: [
          { x: 100, y: 200, scale: 1.5, rotation: 45 }
        ]
      };
      const result = validateGenerateArtPhotoParams(params);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateCreatePaymentParams', () => {
    test('有效参数返回valid=true', () => {
      const params = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        packageType: 'basic'
      };
      const result = validateCreatePaymentParams(params);
      expect(result.valid).toBe(true);
    });

    test('无效packageType返回错误', () => {
      const params = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        packageType: 'invalid'
      };
      const result = validateCreatePaymentParams(params);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('packageType'))).toBe(true);
    });
  });

  describe('validateWechatPaymentParams', () => {
    test('有效参数返回valid=true', () => {
      const params = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        openid: 'oUpF8uMuAJO_M2pxb1Q9zNjWeS6o'
      };
      const result = validateWechatPaymentParams(params);
      expect(result.valid).toBe(true);
    });

    test('缺少必需参数返回错误', () => {
      const params = {
        orderId: '550e8400-e29b-41d4-a716-446655440000'
      };
      const result = validateWechatPaymentParams(params);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateUploadImageParams', () => {
    test('有效base64图片返回valid=true', () => {
      const params = {
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      };
      const result = validateUploadImageParams(params);
      expect(result.valid).toBe(true);
    });

    test('非base64格式返回错误', () => {
      const params = {
        image: 'not-base64'
      };
      const result = validateUploadImageParams(params);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateExtractFacesParams', () => {
    test('有效参数返回valid=true', () => {
      const params = {
        imageUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
      };
      const result = validateExtractFacesParams(params);
      expect(result.valid).toBe(true);
    });

    test('imageUrls超过最大数量返回错误', () => {
      const params = {
        imageUrls: Array(11).fill('https://example.com/image.jpg')
      };
      const result = validateExtractFacesParams(params);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateCreateProductOrderParams', () => {
    test('有效参数返回valid=true', () => {
      const params = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        generationId: '550e8400-e29b-41d4-a716-446655440001',
        productType: 'crystal',
        productPrice: 99.9,
        shippingName: '张三',
        shippingPhone: '13800138000',
        shippingAddress: '北京市朝阳区xxx街道xxx号',
        imageUrl: 'https://example.com/image.jpg'
      };
      const result = validateCreateProductOrderParams(params);
      expect(result.valid).toBe(true);
    });

    test('无效手机号返回错误', () => {
      const params = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        generationId: '550e8400-e29b-41d4-a716-446655440001',
        productType: 'crystal',
        productPrice: 99.9,
        shippingName: '张三',
        shippingPhone: '12345678901',
        shippingAddress: '北京市朝阳区xxx街道xxx号',
        imageUrl: 'https://example.com/image.jpg'
      };
      const result = validateCreateProductOrderParams(params);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('shippingPhone'))).toBe(true);
    });
  });

  describe('validateGenerateVideoParams', () => {
    test('有效参数返回valid=true', () => {
      const params = {
        imageUrl: 'https://example.com/image.jpg',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        motionBucketId: 10,
        fps: 10,
        videoLength: 5,
        dynamicType: 'festival'
      };
      const result = validateGenerateVideoParams(params);
      expect(result.valid).toBe(true);
    });

    test('无效dynamicType返回错误', () => {
      const params = {
        imageUrl: 'https://example.com/image.jpg',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        dynamicType: 'invalid'
      };
      const result = validateGenerateVideoParams(params);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('dynamicType'))).toBe(true);
    });
  });
});

describe('Express中间件', () => {
  test('validateRequest中间件在参数有效时调用next', () => {
    const { validateRequest } = require('../validation');
    const mockValidator = jest.fn(() => ({ valid: true, errors: [] }));
    const middleware = validateRequest(mockValidator);
    
    const req = { body: { test: 'data' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    
    middleware(req, res, next);
    
    expect(mockValidator).toHaveBeenCalledWith(req.body);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('validateRequest中间件在参数无效时返回400错误', () => {
    const { validateRequest } = require('../validation');
    const mockValidator = jest.fn(() => ({ 
      valid: false, 
      errors: ['参数错误1', '参数错误2'] 
    }));
    const middleware = validateRequest(mockValidator);
    
    const req = { body: { test: 'data' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    
    middleware(req, res, next);
    
    expect(mockValidator).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: '参数校验失败',
      details: ['参数错误1', '参数错误2']
    });
    expect(next).not.toHaveBeenCalled();
  });
});
