/**
 * 统一的API配置文件
 * 确保所有API调用使用相同的Base URL
 */

// API Base URL配置
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// API端点配置
export const API_ENDPOINTS = {
  // 用户管理
  USER_INIT: '/api/user/init',
  USER_GET: (userId: string) => `/api/user/${userId}`,
  USER_UPDATE_PAYMENT: (userId: string) => `/api/user/${userId}/payment-status`,
  
  // 图片处理
  UPLOAD_IMAGE: '/api/upload-image',
  EXTRACT_FACES: '/api/extract-faces',
  ADD_WATERMARK: '/api/add-watermark',
  UNLOCK_WATERMARK: '/api/unlock-watermark',
  
  // AI生成
  GENERATE_ART_PHOTO: '/api/generate-art-photo',
  TASK_STATUS: (taskId: string) => `/api/task-status/${taskId}`,
  TASK_STATUS_STREAM: (taskId: string) => `/api/task-status-stream/${taskId}`,
  
  // 历史记录
  HISTORY_USER: (userId: string, limit?: number) => 
    `/api/history/user/${userId}${limit ? `?limit=${limit}` : ''}`,
  HISTORY_GET: (recordId: string) => `/api/history/${recordId}`,
  HISTORY_TASK: (taskId: string) => `/api/history/task/${taskId}`,
  
  // 支付系统
  PAYMENT_CREATE: '/api/payment/create',
  PAYMENT_WECHAT_JSAPI: '/api/payment/wechat/jsapi',
  PAYMENT_ORDER_GET: (orderId: string) => `/api/payment/order/${orderId}`,
  PAYMENT_ORDER_UPDATE: (orderId: string) => `/api/payment/order/${orderId}/status`,
  PAYMENT_ORDER_RETRY: (orderId: string) => `/api/payment/order/${orderId}/retry`,
  
  // 微动态视频
  GENERATE_VIDEO: '/api/generate-video',
  VIDEO_TASK_STATUS: (taskId: string) => `/api/video-task-status/${taskId}`,
  CONVERT_TO_LIVE_PHOTO: '/api/convert-to-live-photo',
  
  // 实体产品订单
  PRODUCT_ORDER_CREATE: '/api/product-order/create',
  PRODUCT_ORDER_GET: (orderId: string) => `/api/product-order/${orderId}`,
  PRODUCT_ORDER_USER: (userId: string, limit?: number) => 
    `/api/product-order/user/${userId}${limit ? `?limit=${limit}` : ''}`,
  PRODUCT_ORDER_UPDATE: (orderId: string) => `/api/product-order/${orderId}/status`,
  PRODUCT_ORDER_EXPORT: '/api/product-order/export-excel',
  
  // 模板管理 (待实现)
  TEMPLATES_LIST: '/api/templates',
  TEMPLATE_GET: (templateId: string) => `/api/templates/${templateId}`,
  
  // 贺卡管理 (待实现)
  GREETING_CARD_CREATE: '/api/greeting-card/create',
  GREETING_CARD_GET: (cardId: string) => `/api/greeting-card/${cardId}`,
  GREETING_CARD_USER: (userId: string) => `/api/greeting-card/user/${userId}`,
  
  // 管理员
  ADMIN_CLEANUP: '/api/admin/cleanup',
} as const;

/**
 * 构建完整的API URL
 */
export function buildApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}

/**
 * API请求配置
 */
export const API_CONFIG = {
  timeout: 30000, // 30秒超时
  retryAttempts: 1, // 失败重试1次
  retryDelay: 1000, // 重试延迟1秒
} as const;

/**
 * 通用的fetch包装器，带错误处理和重试
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  const url = buildApiUrl(endpoint);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // 如果是超时或网络错误，且还有重试次数，则重试
    if (retryCount < API_CONFIG.retryAttempts) {
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
      return apiFetch<T>(endpoint, options, retryCount + 1);
    }
    
    throw error;
  }
}
