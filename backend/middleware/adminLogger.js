/**
 * 管理员操作日志中间件
 * 记录所有管理员的操作
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');

/**
 * 操作日志中间件
 */
function logOperation(req, res, next) {
  // 保存原始的res.json方法
  const originalJson = res.json.bind(res);
  
  // 重写res.json方法以捕获响应
  res.json = function(data) {
    // 异步记录日志（不阻塞响应）
    setImmediate(async () => {
      try {
        if (req.admin) {
          await recordLog(req, res, data);
        }
      } catch (error) {
        console.error('记录操作日志失败:', error);
      }
    });
    
    // 调用原始的json方法
    return originalJson(data);
  };
  
  next();
}

/**
 * 记录日志到数据库
 */
async function recordLog(req, res, responseData) {
  const connection = await db.pool.getConnection();
  
  try {
    const logId = uuidv4();
    const operationType = getOperationType(req.method);
    const operationModule = getOperationModule(req.path);
    const operationDesc = getOperationDesc(req.method, req.path);
    const status = responseData.success ? 'success' : 'failed';
    const errorMessage = responseData.success ? null : responseData.message;
    
    // 过滤敏感信息
    const requestParams = filterSensitiveData(req.body);
    
    await connection.execute(
      `INSERT INTO admin_operation_logs 
      (id, admin_user_id, operation_type, operation_module, operation_desc, 
       request_method, request_url, request_params, ip_address, user_agent, 
       status, error_message, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        logId,
        req.admin.id,
        operationType,
        operationModule,
        operationDesc,
        req.method,
        req.originalUrl || req.url,
        JSON.stringify(requestParams),
        getClientIp(req),
        req.headers['user-agent'] || '',
        status,
        errorMessage
      ]
    );
  } finally {
    connection.release();
  }
}

/**
 * 获取操作类型
 */
function getOperationType(method) {
  const typeMap = {
    'GET': 'query',
    'POST': 'create',
    'PUT': 'update',
    'PATCH': 'update',
    'DELETE': 'delete'
  };
  return typeMap[method] || 'other';
}

/**
 * 获取操作模块
 */
function getOperationModule(path) {
  if (path.includes('/users')) return 'user';
  if (path.includes('/orders')) return 'order';
  if (path.includes('/prices')) return 'price';
  if (path.includes('/templates')) return 'template';
  if (path.includes('/configs')) return 'config';
  if (path.includes('/logs')) return 'log';
  if (path.includes('/stats')) return 'stats';
  if (path.includes('/auth')) return 'auth';
  return 'other';
}

/**
 * 获取操作描述
 */
function getOperationDesc(method, path) {
  const module = getOperationModule(path);
  const type = getOperationType(method);
  
  const descMap = {
    'query': `查询${module}`,
    'create': `创建${module}`,
    'update': `更新${module}`,
    'delete': `删除${module}`
  };
  
  return descMap[type] || `${method} ${path}`;
}

/**
 * 过滤敏感数据
 */
function filterSensitiveData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const filtered = { ...data };
  const sensitiveFields = ['password', 'password_hash', 'token', 'secret', 'key'];
  
  for (const field of sensitiveFields) {
    if (filtered[field]) {
      filtered[field] = '***';
    }
  }
  
  return filtered;
}

/**
 * 获取客户端IP地址
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         '';
}

/**
 * 检查是否为敏感操作
 */
function isSensitiveOperation(req) {
  const sensitivePaths = [
    '/admin-api/users',
    '/admin-api/prices',
    '/admin-api/configs',
    '/admin-api/orders'
  ];
  
  const sensitiveMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  return sensitivePaths.some(path => req.path.startsWith(path)) &&
         sensitiveMethods.includes(req.method);
}

module.exports = {
  logOperation,
  isSensitiveOperation
};
