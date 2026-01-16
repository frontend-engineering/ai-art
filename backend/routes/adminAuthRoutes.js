/**
 * 管理员认证路由
 */

const express = require('express');
const router = express.Router();
const { login, getUserByToken, changePassword } = require('../services/adminAuthService');
const { authenticate } = require('../middleware/adminAuth');

/**
 * POST /admin-api/auth/login
 * 管理员登录
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: '用户名和密码不能为空'
      });
    }
    
    // 获取客户端信息
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] ||
                     req.headers['x-real-ip'] ||
                     req.connection?.remoteAddress ||
                     '';
    const userAgent = req.headers['user-agent'] || '';
    
    // 执行登录
    const result = await login(username, password, ipAddress, userAgent);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(401).json({
      success: false,
      code: 'LOGIN_FAILED',
      message: error.message
    });
  }
});

/**
 * POST /admin-api/auth/logout
 * 管理员登出
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // JWT是无状态的，登出主要在客户端删除token
    // 这里可以记录登出日志或将token加入黑名单（如果需要）
    
    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出失败:', error);
    res.status(500).json({
      success: false,
      code: 'LOGOUT_FAILED',
      message: '登出失败'
    });
  }
});

/**
 * GET /admin-api/auth/me
 * 获取当前登录用户信息
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      code: 'GET_USER_FAILED',
      message: '获取用户信息失败'
    });
  }
});

/**
 * POST /admin-api/auth/change-password
 * 修改密码
 */
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    // 验证必填字段
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: '旧密码和新密码不能为空'
      });
    }
    
    // 验证新密码强度
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        code: 'WEAK_PASSWORD',
        message: '新密码长度至少为8个字符'
      });
    }
    
    // 修改密码
    await changePassword(req.user.id, oldPassword, newPassword);
    
    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(400).json({
      success: false,
      code: 'CHANGE_PASSWORD_FAILED',
      message: error.message
    });
  }
});

module.exports = router;
