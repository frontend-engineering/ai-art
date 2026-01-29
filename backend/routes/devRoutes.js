/**
 * 开发者模式路由
 * 仅在开发环境下启用，用于调试和测试
 */

const express = require('express');
const router = express.Router();
const usageService = require('../services/usageService');

// 检查是否为开发环境
const isDev = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';

// 中间件：验证开发者模式是否启用
const checkDevMode = (req, res, next) => {
  if (!isDev) {
    return res.status(403).json({
      success: false,
      error: 'DEV_MODE_DISABLED',
      message: '开发者模式未启用'
    });
  }
  next();
};

/**
 * POST /api/dev/usage/set
 * 设置用户使用次数（开发者模式）
 * Body: { userId: string, count: number }
 */
router.post('/usage/set', checkDevMode, async (req, res) => {
  try {
    const { userId, count } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'USER_ID_REQUIRED',
        message: '用户ID不能为空'
      });
    }

    if (typeof count !== 'number' || count < 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_COUNT',
        message: '使用次数必须是非负整数'
      });
    }

    const pool = require('../db/connection').pool;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 获取当前使用次数
      const [rows] = await connection.execute(
        'SELECT usage_count FROM users WHERE id = ? FOR UPDATE',
        [userId]
      );

      if (rows.length === 0) {
        throw new Error('USER_NOT_FOUND');
      }

      const oldCount = rows[0].usage_count || 0;

      // 设置新的使用次数
      await connection.execute(
        'UPDATE users SET usage_count = ? WHERE id = ?',
        [count, userId]
      );

      // 记录日志
      const { v4: uuidv4 } = require('uuid');
      const logId = uuidv4();
      const difference = count - oldCount;
      const actionType = difference > 0 ? 'increment' : 'decrement';

      await connection.execute(
        `INSERT INTO usage_logs (id, user_id, action_type, amount, remaining_count, reason, reference_id, created_at)
         VALUES (?, ?, ?, ?, ?, 'dev_mode', ?, NOW())`,
        [logId, userId, actionType, Math.abs(difference), count, 'dev_set_' + Date.now()]
      );

      await connection.commit();

      res.json({
        success: true,
        message: '使用次数已设置',
        data: {
          userId,
          oldCount,
          newCount: count,
          difference
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('设置使用次数失败:', error);

    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在'
      });
    }

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '设置使用次数失败',
      details: error.message
    });
  }
});

/**
 * POST /api/dev/usage/add
 * 增加用户使用次数（开发者模式）
 * Body: { userId: string, amount: number }
 */
router.post('/usage/add', checkDevMode, async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'USER_ID_REQUIRED',
        message: '用户ID不能为空'
      });
    }

    if (typeof amount !== 'number' || amount === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_AMOUNT',
        message: '增加数量必须是非零数字'
      });
    }

    const result = await usageService.addUsageCount(
      userId,
      Math.abs(amount),
      'admin_grant',
      'dev_mode_' + Date.now()
    );

    res.json({
      success: true,
      message: '使用次数已更新',
      data: {
        userId,
        amount,
        newCount: result.new_count
      }
    });
  } catch (error) {
    console.error('增加使用次数失败:', error);

    if (error.message.includes('用户不存在')) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在'
      });
    }

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '增加使用次数失败',
      details: error.message
    });
  }
});

/**
 * GET /api/dev/usage/check/:userId
 * 检查用户使用次数详情（开发者模式）
 */
router.get('/usage/check/:userId', checkDevMode, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'USER_ID_REQUIRED',
        message: '用户ID不能为空'
      });
    }

    const result = await usageService.checkUsageCount(userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('检查使用次数失败:', error);

    if (error.message.includes('不存在')) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在'
      });
    }

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '检查使用次数失败',
      details: error.message
    });
  }
});

/**
 * GET /api/dev/status
 * 获取开发者模式状态
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    devMode: isDev,
    environment: process.env.NODE_ENV || 'unknown',
    message: isDev ? '开发者模式已启用' : '开发者模式未启用'
  });
});

module.exports = router;
