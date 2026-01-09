/**
 * API 接口定义模块
 * 定义所有后端 API 接口
 * 支持云托管和传统 HTTP 两种方式
 */

// 动态选择请求模块
const getRequestModule = () => {
  const app = getApp();
  if (app && app.globalData && app.globalData.useCloudBase) {
    return require('./cloudbase-request');
  }
  return require('./request');
};

// 获取请求方法
const getRequestMethods = () => {
  const module = getRequestModule();
  return {
    request: module.request || module.cloudRequest,
    get: module.get,
    post: module.post,
    put: module.put
  };
};

// 导出请求方法（延迟获取）
const request = (...args) => getRequestMethods().request(...args);
const get = (...args) => getRequestMethods().get(...args);
const post = (...args) => getRequestMethods().post(...args);
const put = (...args) => getRequestMethods().put(...args);

/**
 * 用户相关 API
 */
const userAPI = {
  /**
   * 初始化用户
   * @param {string} userId 用户ID
   * @returns {Promise<Object>} 用户信息
   */
  initUser: (userId) => post('/api/user/init', { userId }),

  /**
   * 获取用户信息
   * @param {string} userId 用户ID
   * @returns {Promise<Object>} 用户信息
   */
  getUser: (userId) => get(`/api/user/${userId}`),

  /**
   * 更新用户付费状态
   * @param {string} userId 用户ID
   * @param {string} paymentStatus 付费状态 ('free' | 'basic' | 'premium')
   * @returns {Promise<Object>} 更新后的用户信息
   */
  updatePaymentStatus: (userId, paymentStatus) => 
    put(`/api/user/${userId}/payment-status`, { paymentStatus })
};

/**
 * 人脸提取 API
 */
const faceAPI = {
  /**
   * 提取人脸
   * @param {string[]} imageUrls 图片URL数组
   * @returns {Promise<Object>} 人脸提取结果
   */
  extractFaces: (imageUrls) => post('/api/extract-faces', { imageUrls }, {
    showLoading: true,
    loadingText: '检测人脸中...',
    timeout: 60000
  })
};

/**
 * 生成相关 API
 */
const generationAPI = {
  /**
   * 生成艺术照
   * @param {Object} data 生成参数
   * @param {string[]} data.imageUrls 用户照片URL数组
   * @param {Object[]} [data.facePositions] 人脸位置信息
   * @param {string} data.userId 用户ID
   * @param {string} data.templateId 模板ID
   * @param {string} [data.mode='puzzle'] 模式 ('puzzle' | 'transform')
   * @returns {Promise<Object>} 任务信息
   */
  generateArtPhoto: (data) => post('/api/generate-art-photo', data, {
    showLoading: true,
    loadingText: '提交生成任务...',
    timeout: 60000
  }),

  /**
   * 获取任务状态（新版）
   * @param {string} taskId 任务ID
   * @returns {Promise<Object>} 任务状态
   */
  getTask: (taskId) => get(`/api/task/${taskId}`, null, {
    showError: false
  }),

  /**
   * 获取任务状态（旧版兼容）
   * @param {string} taskId 任务ID
   * @returns {Promise<Object>} 任务状态
   */
  getTaskStatus: (taskId) => get(`/api/task-status/${taskId}`, null, {
    showError: false
  }),

  /**
   * 重试失败的任务
   * @param {string} taskId 任务ID
   * @returns {Promise<Object>} 重试结果
   */
  retryTask: (taskId) => post(`/api/task/${taskId}/retry`, null, {
    showLoading: true,
    loadingText: '重新生成中...'
  }),

  /**
   * 取消任务
   * @param {string} taskId 任务ID
   * @returns {Promise<Object>} 取消结果
   */
  cancelTask: (taskId) => post(`/api/task/${taskId}/cancel`),

  /**
   * 获取用户的所有任务
   * @param {string} userId 用户ID
   * @returns {Promise<Object>} 任务列表
   */
  getUserTasks: (userId) => get(`/api/tasks/user/${userId}`)
};

/**
 * 支付相关 API
 */
const paymentAPI = {
  /**
   * 创建支付订单
   * @param {Object} data 订单参数
   * @param {string} data.userId 用户ID
   * @param {string} data.generationId 生成任务ID
   * @param {string} data.packageType 套餐类型 ('free' | 'basic' | 'premium')
   * @returns {Promise<Object>} 订单信息
   */
  createOrder: (data) => post('/api/payment/create', data, {
    showLoading: true,
    loadingText: '创建订单中...'
  }),

  /**
   * 获取微信支付参数
   * @param {string} orderId 订单ID
   * @param {string} openid 用户openid
   * @returns {Promise<Object>} 微信支付参数
   */
  getWeChatPayParams: (orderId, openid) => 
    post('/api/payment/wechat/jsapi', { orderId, openid }, {
      showLoading: true,
      loadingText: '获取支付参数...'
    }),

  /**
   * 查询支付订单状态
   * @param {string} orderId 订单ID
   * @returns {Promise<Object>} 订单状态
   */
  getOrderStatus: (orderId) => get(`/api/payment/order/${orderId}`),

  /**
   * 重试支付
   * @param {string} orderId 订单ID
   * @param {string} openid 用户openid
   * @returns {Promise<Object>} 支付参数
   */
  retryPayment: (orderId, openid) => 
    post(`/api/payment/order/${orderId}/retry`, { openid }, {
      showLoading: true,
      loadingText: '重新发起支付...'
    })
};

/**
 * 上传相关 API
 */
const uploadAPI = {
  /**
   * 上传图片到 OSS
   * @param {string} image Base64 图片数据
   * @returns {Promise<Object>} 上传结果
   */
  uploadImage: (image) => post('/api/upload-image', { image }, {
    showLoading: true,
    loadingText: '上传图片中...',
    timeout: 120000
  }),

  /**
   * 添加水印
   * @param {string} imageUrl 图片URL
   * @param {string} [userId] 用户ID
   * @returns {Promise<Object>} 水印图片URL
   */
  addWatermark: (imageUrl, userId) => 
    post('/api/add-watermark', { imageUrl, userId }),

  /**
   * 解锁无水印图片
   * @param {string} taskId 任务ID
   * @param {string} userId 用户ID
   * @returns {Promise<Object>} 无水印图片URL
   */
  unlockWatermark: (taskId, userId) => 
    post('/api/unlock-watermark', { taskId, userId })
};

/**
 * 历史记录 API
 */
const historyAPI = {
  /**
   * 获取用户历史记录
   * @param {string} userId 用户ID
   * @param {string} [mode] 模式筛选
   * @returns {Promise<Object>} 历史记录列表
   */
  getHistory: (userId, mode) => {
    const params = { userId };
    if (mode) params.mode = mode;
    return get('/api/history', params);
  },

  /**
   * 获取历史记录详情
   * @param {string} historyId 历史记录ID
   * @returns {Promise<Object>} 历史记录详情
   */
  getHistoryDetail: (historyId) => get(`/api/history/${historyId}`),

  /**
   * 删除历史记录
   * @param {string} historyId 历史记录ID
   * @returns {Promise<Object>} 删除结果
   */
  deleteHistory: (historyId) => request({
    url: `/api/history/${historyId}`,
    method: 'DELETE'
  })
};

/**
 * 模板 API
 */
const templateAPI = {
  /**
   * 获取模板列表
   * @param {string} [mode] 模式筛选
   * @returns {Promise<Object>} 模板列表
   */
  getTemplates: (mode) => {
    const params = mode ? { mode } : {};
    return get('/api/templates', params);
  },

  /**
   * 获取模板详情
   * @param {string} templateId 模板ID
   * @returns {Promise<Object>} 模板详情
   */
  getTemplateDetail: (templateId) => get(`/api/templates/${templateId}`)
};

/**
 * 贺卡 API
 */
const greetingCardAPI = {
  /**
   * 创建贺卡
   * @param {Object} data 贺卡数据
   * @param {string} data.userId 用户ID
   * @param {string} data.imageUrl 图片URL
   * @param {string} data.greeting 祝福语
   * @param {string} data.templateId 贺卡模板ID
   * @returns {Promise<Object>} 贺卡信息
   */
  createCard: (data) => post('/api/greeting-card', data, {
    showLoading: true,
    loadingText: '生成贺卡中...'
  }),

  /**
   * 获取用户贺卡列表
   * @param {string} userId 用户ID
   * @returns {Promise<Object>} 贺卡列表
   */
  getUserCards: (userId) => get(`/api/greeting-card/user/${userId}`),

  /**
   * 获取贺卡详情
   * @param {string} cardId 贺卡ID
   * @returns {Promise<Object>} 贺卡详情
   */
  getCardDetail: (cardId) => get(`/api/greeting-card/${cardId}`)
};

/**
 * 产品订单 API
 */
const productAPI = {
  /**
   * 创建产品订单
   * @param {Object} data 订单数据
   * @param {string} data.userId 用户ID
   * @param {string} data.imageUrl 图片URL
   * @param {string} data.productType 产品类型
   * @param {Object} data.address 收货地址
   * @returns {Promise<Object>} 订单信息
   */
  createProductOrder: (data) => post('/api/product-order', data, {
    showLoading: true,
    loadingText: '创建订单中...'
  }),

  /**
   * 获取用户产品订单
   * @param {string} userId 用户ID
   * @returns {Promise<Object>} 订单列表
   */
  getUserOrders: (userId) => get(`/api/product-order/user/${userId}`)
};

/**
 * 视频/微动态 API
 */
const videoAPI = {
  /**
   * 生成微动态视频
   * @param {Object} data 生成参数
   * @param {string} data.imageUrl 图片URL
   * @param {string} data.userId 用户ID
   * @param {number} [data.motionBucketId=10] 运动幅度
   * @param {number} [data.fps=10] 帧率
   * @param {number} [data.videoLength=5] 视频时长(秒)
   * @param {string} [data.dynamicType='festival'] 动态类型
   * @returns {Promise<Object>} 任务信息
   */
  generateVideo: (data) => post('/api/generate-video', data, {
    showLoading: true,
    loadingText: '创建微动态任务...',
    timeout: 60000
  }),

  /**
   * 查询视频生成任务状态
   * @param {string} taskId 任务ID
   * @returns {Promise<Object>} 任务状态
   */
  getVideoTaskStatus: (taskId) => get(`/api/video-task-status/${taskId}`, null, {
    showError: false
  }),

  /**
   * 转换为 Live Photo 格式
   * @param {string} videoUrl 视频URL
   * @param {string} userId 用户ID
   * @returns {Promise<Object>} Live Photo URL
   */
  convertToLivePhoto: (videoUrl, userId) => 
    post('/api/convert-to-live-photo', { videoUrl, userId }, {
      showLoading: true,
      loadingText: '转换Live Photo...',
      timeout: 120000
    })
};

/**
 * 微信登录 API（需要后端新增）
 */
const wechatAPI = {
  /**
   * 微信登录
   * @param {string} code 微信登录code
   * @returns {Promise<Object>} 登录结果
   */
  login: (code) => post('/api/wechat/login', { code }),

  /**
   * 获取小程序码
   * @param {string} path 小程序页面路径
   * @param {number} [width=200] 小程序码宽度
   * @returns {Promise<Object>} 小程序码URL
   */
  getQRCode: (path, width = 200) => 
    post('/api/wechat/qrcode', { path, width })
};

module.exports = {
  userAPI,
  faceAPI,
  generationAPI,
  paymentAPI,
  uploadAPI,
  historyAPI,
  templateAPI,
  greetingCardAPI,
  productAPI,
  videoAPI,
  wechatAPI
};
