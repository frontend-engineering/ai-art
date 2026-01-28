/**
 * 使用次数服务
 * 负责用户使用次数的查询、扣减、恢复和增加
 */

const { query } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

/**
 * 检查用户使用次数
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} { usage_count, usage_limit, can_generate, user_type }
 */
async function checkUsageCount(userId) {
  try {
    const sql = `
      SELECT usage_count, usage_limit, has_ever_paid
      FROM users
      WHERE id = ?
    `;
    
    const rows = await query(sql, [userId]);
    
    if (rows.length === 0) {
      throw new Error(`用户 ${userId} 不存在`);
    }
    
    const user = rows[0];
    const usageCount = user.usage_count || 0;
    const usageLimit = user.usage_limit || 3;
    const hasEverPaid = user.has_ever_paid || false;
    
    return {
      usage_count: usageCount,
      usage_limit: usageLimit,
      can_generate: usageCount > 0,
      user_type: hasEverPaid ? 'paid' : 'free'
    };
  } catch (error) {
    console.error('检查用户使用次数失败:', error);
    throw new Error(`检查用户使用次数失败: ${error.message}`);
  }
}

/**
 * 获取使用历史
 * @param {string} userId - 用户ID
 * @param {number} page - 页码（从1开始）
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} { logs, total, page, pageSize }
 */
async function getUsageHistory(userId, page = 1, pageSize = 20) {
  try {
    // 验证分页参数
    const validPage = Math.max(1, parseInt(page) || 1);
    const validPageSize = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
    const offset = (validPage - 1) * validPageSize;
    
    // 查询总数
    const countSql = `
      SELECT COUNT(*) as total
      FROM usage_logs
      WHERE user_id = ?
    `;
    
    const countRows = await query(countSql, [userId]);
    const total = countRows[0]?.total || 0;
    
    // 查询日志记录
    const logsSql = `
      SELECT 
        id,
        action_type,
        amount,
        remaining_count,
        reason,
        reference_id,
        created_at
      FROM usage_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const logs = await query(logsSql, [userId, validPageSize, offset]);
    
    return {
      logs: logs || [],
      total,
      page: validPage,
      pageSize: validPageSize
    };
  } catch (error) {
    console.error('获取使用历史失败:', error);
    throw new Error(`获取使用历史失败: ${error.message}`);
  }
}

/**
 * 扣减使用次数（原子操作，含并发控制）
 * @param {string} userId - 用户ID
 * @param {string} generationId - 生成记录ID
 * @returns {Promise<Object>} { success, remaining_count }
 * @throws {Error} 如果usage_count不足
 */
async function decrementUsageCount(userId, generationId) {
  const pool = require('../db/connection').pool;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 使用 SELECT ... FOR UPDATE 锁定行，防止并发问题
    const [rows] = await connection.execute(
      'SELECT usage_count FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );
    
    if (rows.length === 0) {
      throw new Error('USER_NOT_FOUND');
    }
    
    const currentCount = rows[0].usage_count || 0;
    
    // 验证 usage_count > 0
    if (currentCount <= 0) {
      throw new Error('INSUFFICIENT_USAGE');
    }
    
    // 扣减使用次数
    await connection.execute(
      'UPDATE users SET usage_count = usage_count - 1 WHERE id = ?',
      [userId]
    );
    
    const newCount = currentCount - 1;
    
    // 插入 usage_logs 记录
    const logId = uuidv4();
    await connection.execute(
      `INSERT INTO usage_logs (id, user_id, action_type, amount, remaining_count, reason, reference_id, created_at)
       VALUES (?, ?, 'decrement', -1, ?, 'generation', ?, NOW())`,
      [logId, userId, newCount, generationId]
    );
    
    // 提交事务
    await connection.commit();
    
    return {
      success: true,
      remaining_count: newCount
    };
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    
    // 重新抛出错误
    if (error.message === 'INSUFFICIENT_USAGE') {
      throw new Error('使用次数不足');
    } else if (error.message === 'USER_NOT_FOUND') {
      throw new Error('用户不存在');
    } else {
      console.error('扣减使用次数失败:', error);
      throw new Error(`扣减使用次数失败: ${error.message}`);
    }
  } finally {
    connection.release();
  }
}

/**
 * 恢复使用次数（生成失败时回滚扣减）
 * @param {string} userId - 用户ID
 * @param {string} generationId - 生成记录ID
 * @returns {Promise<Object>} { success, remaining_count }
 */
async function restoreUsageCount(userId, generationId) {
  const pool = require('../db/connection').pool;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 使用 SELECT ... FOR UPDATE 锁定行，防止并发问题
    const [rows] = await connection.execute(
      'SELECT usage_count FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );
    
    if (rows.length === 0) {
      throw new Error('USER_NOT_FOUND');
    }
    
    const currentCount = rows[0].usage_count || 0;
    
    // 恢复使用次数（增加1）
    await connection.execute(
      'UPDATE users SET usage_count = usage_count + 1 WHERE id = ?',
      [userId]
    );
    
    const newCount = currentCount + 1;
    
    // 插入 usage_logs 记录（action_type='restore'）
    const logId = uuidv4();
    await connection.execute(
      `INSERT INTO usage_logs (id, user_id, action_type, amount, remaining_count, reason, reference_id, created_at)
       VALUES (?, ?, 'restore', 1, ?, 'restore', ?, NOW())`,
      [logId, userId, newCount, generationId]
    );
    
    // 提交事务
    await connection.commit();
    
    return {
      success: true,
      remaining_count: newCount
    };
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    
    // 重新抛出错误
    if (error.message === 'USER_NOT_FOUND') {
      throw new Error('用户不存在');
    } else {
      console.error('恢复使用次数失败:', error);
      throw new Error(`恢复使用次数失败: ${error.message}`);
    }
  } finally {
    connection.release();
  }
}

/**
 * 增加使用次数
 * @param {string} userId - 用户ID
 * @param {number} amount - 增加数量
 * @param {string} reason - 原因 ('payment', 'invite_reward', 'admin_grant')
 * @param {string} referenceId - 关联ID（订单ID或邀请记录ID）
 * @returns {Promise<Object>} { success, new_count }
 */
async function addUsageCount(userId, amount, reason, referenceId = null) {
  const pool = require('../db/connection').pool;
  const connection = await pool.getConnection();
  
  try {
    // 验证参数
    if (!userId) {
      throw new Error('用户ID不能为空');
    }
    
    if (!amount || amount <= 0) {
      throw new Error('增加数量必须大于0');
    }
    
    const validReasons = ['payment', 'invite_reward', 'admin_grant'];
    if (!reason || !validReasons.includes(reason)) {
      throw new Error(`原因必须是以下之一: ${validReasons.join(', ')}`);
    }
    
    await connection.beginTransaction();
    
    // 使用 SELECT ... FOR UPDATE 锁定行，防止并发问题
    const [rows] = await connection.execute(
      'SELECT usage_count FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );
    
    if (rows.length === 0) {
      throw new Error('USER_NOT_FOUND');
    }
    
    const currentCount = rows[0].usage_count || 0;
    
    // 增加使用次数
    await connection.execute(
      'UPDATE users SET usage_count = usage_count + ? WHERE id = ?',
      [amount, userId]
    );
    
    const newCount = currentCount + amount;
    
    // 插入 usage_logs 记录
    const logId = uuidv4();
    await connection.execute(
      `INSERT INTO usage_logs (id, user_id, action_type, amount, remaining_count, reason, reference_id, created_at)
       VALUES (?, ?, 'increment', ?, ?, ?, ?, NOW())`,
      [logId, userId, amount, newCount, reason, referenceId]
    );
    
    // 提交事务
    await connection.commit();
    
    return {
      success: true,
      new_count: newCount
    };
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    
    // 重新抛出错误
    if (error.message === 'USER_NOT_FOUND') {
      throw new Error('用户不存在');
    } else {
      console.error('增加使用次数失败:', error);
      throw new Error(`增加使用次数失败: ${error.message}`);
    }
  } finally {
    connection.release();
  }
}

module.exports = {
  checkUsageCount,
  getUsageHistory,
  decrementUsageCount,
  restoreUsageCount,
  addUsageCount
};
