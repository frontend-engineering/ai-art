/**
 * 管理员认证中间件
 * 验证JWT token并检查用户权限
 */

const { verifyToken, getUserByToken } = require('../services/adminAuthService');

/**
 * 认证中间件 - 验证JWT token
 */
async function authenticate(req, res, next) {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: '未提供认证令牌'
      });
    }
    
    const token = authHeader.substring(7); // 移除 "Bearer " 前缀
    
    // 验证token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: '认证令牌无效或已过期'
      });
    }
    
    // 获取用户信息
    const user = await getUserByToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: '用户不存在'
      });
    }
    
    // 检查用户状态
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_DISABLED',
        message: '账户已被禁用'
      });
    }
    
    // 将用户信息附加到请求对象
    req.admin = user;  // 使用 req.admin 而不是 req.user
    req.user = user;   // 保留 req.user 以兼容
    req.token = token;
    
    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    return res.status(500).json({
      success: false,
      code: 'AUTH_ERROR',
      message: '认证失败'
    });
  }
}

/**
 * 权限检查中间件 - 检查用户角色
 * @param {string[]} allowedRoles - 允许的角色列表
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.admin && !req.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: '未认证'
      });
    }
    
    const user = req.admin || req.user;
    
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: '权限不足'
      });
    }
    
    next();
  };
}

/**
 * 可选认证中间件 - 如果有token则验证，没有则继续
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      if (decoded) {
        const user = await getUserByToken(token);
        if (user && user.status === 'active') {
          req.admin = user;  // 使用 req.admin
          req.user = user;   // 保留兼容性
          req.token = token;
        }
      }
    }
    
    next();
  } catch (error) {
    // 可选认证失败不影响请求继续
    next();
  }
}

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};
