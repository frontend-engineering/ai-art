/**
 * API客户端
 * 负责与后端API通信
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * 用户相关API
 */
export const userAPI = {
  /**
   * 初始化用户 (创建或获取用户)
   * @param userId 用户ID
   * @returns 用户对象
   */
  async initUser(userId: string) {
    const response = await fetch(`${API_BASE_URL}/api/user/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '初始化用户失败');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * 获取用户信息
   * @param userId 用户ID
   * @returns 用户对象
   */
  async getUser(userId: string) {
    const response = await fetch(`${API_BASE_URL}/api/user/${userId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '获取用户信息失败');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * 更新用户付费状态
   * @param userId 用户ID
   * @param paymentStatus 付费状态
   * @returns 更新后的用户对象
   */
  async updatePaymentStatus(userId: string, paymentStatus: 'free' | 'basic' | 'premium') {
    const response = await fetch(`${API_BASE_URL}/api/user/${userId}/payment-status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentStatus }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '更新用户付费状态失败');
    }

    const result = await response.json();
    return result.data;
  },
};

/**
 * 用户类型定义
 */
export interface User {
  id: string;
  created_at: string;
  updated_at: string;
  payment_status: 'free' | 'basic' | 'premium';
  regenerate_count: number;
}

/**
 * 人脸提取相关API
 */
export const faceAPI = {
  /**
   * 提取人脸
   * @param imageUrls 图片URL数组
   * @returns 人脸提取结果
   */
  async extractFaces(imageUrls: string[]) {
    const response = await fetch(`${API_BASE_URL}/api/extract-faces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrls }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '人脸提取失败');
    }

    const result = await response.json();
    return result.data;
  },
};

/**
 * 水印相关API
 */
export const watermarkAPI = {
  /**
   * 添加水印
   * @param imageUrl 图片URL
   * @param userId 用户ID
   * @returns 添加水印后的图片URL
   */
  async addWatermark(imageUrl: string, userId?: string) {
    const response = await fetch(`${API_BASE_URL}/api/add-watermark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl, userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '添加水印失败');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * 解锁无水印图片
   * @param taskId 任务ID
   * @param userId 用户ID
   * @returns 无水印图片URL列表
   */
  async unlockWatermark(taskId: string, userId: string) {
    const response = await fetch(`${API_BASE_URL}/api/unlock-watermark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId, userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '解锁无水印图片失败');
    }

    const result = await response.json();
    return result.data;
  },
};

/**
 * 人脸数据类型定义
 */
export interface FaceData {
  image_base64: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  source_image: string;
}

export interface ExtractFacesResult {
  success: boolean;
  faces: FaceData[];
  message: string;
}

/**
 * 支付相关API
 */
export const paymentAPI = {
  /**
   * 创建支付订单
   * @param userId 用户ID
   * @param generationId 生成记录ID
   * @param packageType 套餐类型
   * @returns 订单信息
   */
  async createOrder(userId: string, generationId: string, packageType: 'free' | 'basic' | 'premium') {
    const response = await fetch(`${API_BASE_URL}/api/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, generationId, packageType }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '创建支付订单失败');
    }

    return await response.json();
  },

  /**
   * 发起微信支付
   * @param orderId 订单ID
   * @param openid 微信openid
   * @returns 支付参数
   */
  async initiateWeChatPayment(orderId: string, openid: string) {
    const response = await fetch(`${API_BASE_URL}/api/payment/wechat/jsapi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderId, openid }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '发起微信支付失败');
    }

    return await response.json();
  },

  /**
   * 查询支付订单状态
   * @param orderId 订单ID
   * @returns 订单信息
   */
  async getOrderStatus(orderId: string) {
    const response = await fetch(`${API_BASE_URL}/api/payment/order/${orderId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '查询支付订单失败');
    }

    return await response.json();
  },

  /**
   * 重试支付
   * @param orderId 订单ID
   * @param openid 微信openid
   * @returns 支付参数
   */
  async retryPayment(orderId: string, openid: string) {
    const response = await fetch(`${API_BASE_URL}/api/payment/order/${orderId}/retry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ openid }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '重试支付失败');
    }

    return await response.json();
  },
};

/**
 * 支付订单类型定义
 */
export interface PaymentOrder {
  orderId: string;
  userId: string;
  generationId: string;
  amount: number;
  packageType: 'free' | 'basic' | 'premium';
  paymentMethod: string;
  transactionId?: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: string;
  updatedAt: string;
}

/**
 * 生成相关API
 */
export const generationAPI = {
  /**
   * 生成艺术照
   * @param prompt 提示词
   * @param imageUrls 图片URL数组
   * @param userId 用户ID
   * @param templateUrl 模板URL
   * @param facePositions 人脸位置信息(可选)
   * @returns 任务ID
   */
  async generateArtPhoto(
    prompt: string,
    imageUrls: string[],
    userId: string,
    templateUrl: string,
    facePositions?: Array<{ x: number; y: number; scale: number; rotation: number }>
  ) {
    const response = await fetch(`${API_BASE_URL}/api/generate-art-photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        imageUrls,
        userId,
        templateUrl,
        facePositions,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '生成艺术照失败');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * 查询任务状态
   * @param taskId 任务ID
   * @returns 任务状态信息
   */
  async getTaskStatus(taskId: string) {
    const response = await fetch(`${API_BASE_URL}/api/task-status/${taskId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '查询任务状态失败');
    }

    const result = await response.json();
    return result.data;
  },
};

/**
 * 任务状态类型定义
 */
export interface TaskStatus {
  Result: {
    data: {
      status: 'pending' | 'processing' | 'done' | 'failed';
      uploaded_image_urls?: string[];
      reason?: string;
    };
  };
}

// 导出便捷函数
export const createPaymentOrder = paymentAPI.createOrder;
export const initiateWeChatPayment = paymentAPI.initiateWeChatPayment;
export const getPaymentOrderStatus = paymentAPI.getOrderStatus;
export const retryPayment = paymentAPI.retryPayment;
export const generateArtPhoto = generationAPI.generateArtPhoto;
export const getTaskStatus = generationAPI.getTaskStatus;
