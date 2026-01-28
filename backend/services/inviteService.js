/**
 * 邀请服务
 * 负责邀请码生成、验证、邀请注册处理和统计
 */

const { query } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * 生成8位邀请码（使用数字和大写字母）
 * 使用crypto.randomBytes确保随机性和唯一性
 * @returns {string} 8位邀请码
 */
function generateRandomCode() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(8);
  let result = '';
  
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length];
  }
  
  return result;
}

/**
 * 生成邀请码
 * @param {string} userId - 用户ID
 * @returns {Promise<string>} 邀请码
 */
async function generateInviteCode(userId) {
  try {
    // 检查用户是否已有邀请码
    const checkSql = `
      SELECT invite_code
      FROM users
      WHERE id = ?
    `;
    
    const rows = await query(checkSql, [userId]);
    
    if (rows.length === 0) {
      throw new Error(`用户 ${userId} 不存在`);
    }
    
    // 如果已有邀请码，直接返回
    if (rows[0].invite_code) {
      return rows[0].invite_code;
    }
    
    // 生成新的邀请码，确保唯一性
    let inviteCode;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      inviteCode = generateRandomCode();
      
      // 检查邀请码是否已存在
      const uniqueCheckSql = `
        SELECT COUNT(*) as count
        FROM users
        WHERE invite_code = ?
      `;
      
      const uniqueRows = await query(uniqueCheckSql, [inviteCode]);
      isUnique = uniqueRows[0].count === 0;
      attempts++;
    }
    
    if (!isUnique) {
      throw new Error('生成唯一邀请码失败，请重试');
    }
    
    // 更新用户的邀请码
    const updateSql = `
      UPDATE users
      SET invite_code = ?
      WHERE id = ?
    `;
    
    await query(updateSql, [inviteCode, userId]);
    
    return inviteCode;
  } catch (error) {
    console.error('生成邀请码失败:', error);
    throw new Error(`生成邀请码失败: ${error.message}`);
  }
}

/**
 * 验证邀请码
 * @param {string} inviteCode - 邀请码
 * @returns {Promise<Object>} { valid, inviter_id, inviter_nickname }
 */
async function validateInviteCode(inviteCode) {
  try {
    // 验证邀请码格式（8位字母数字组合）
    if (!inviteCode || typeof inviteCode !== 'string') {
      return {
        valid: false,
        inviter_id: null,
        inviter_nickname: null,
        error: '邀请码格式无效'
      };
    }
    
    if (inviteCode.length !== 8) {
      return {
        valid: false,
        inviter_id: null,
        inviter_nickname: null,
        error: '邀请码长度必须为8位'
      };
    }
    
    // 查询邀请码对应的用户
    const sql = `
      SELECT id, nickname
      FROM users
      WHERE invite_code = ?
    `;
    
    const rows = await query(sql, [inviteCode]);
    
    if (rows.length === 0) {
      return {
        valid: false,
        inviter_id: null,
        inviter_nickname: null,
        error: '邀请码不存在'
      };
    }
    
    const inviter = rows[0];
    
    return {
      valid: true,
      inviter_id: inviter.id,
      inviter_nickname: inviter.nickname || '未知用户'
    };
  } catch (error) {
    console.error('验证邀请码失败:', error);
    throw new Error(`验证邀请码失败: ${error.message}`);
  }
}

/**
 * 处理邀请注册
 * @param {string} inviteCode - 邀请码
 * @param {string} newUserId - 新用户ID
 * @param {string} openid - 新用户openid
 * @returns {Promise<Object>} { success, inviter_id, reward_granted }
 */
async function processInviteRegistration(inviteCode, newUserId, openid) {
  const pool = require('../db/connection').pool;
  const connection = await pool.getConnection();
  
  try {
    // 验证邀请码
    const validation = await validateInviteCode(inviteCode);
    if (!validation.valid) {
      throw new Error(validation.error || '邀请码无效');
    }
    
    const inviterId = validation.inviter_id;
    
    // 验证不是自我邀请
    if (inviterId === newUserId) {
      throw new Error('SELF_INVITE_NOT_ALLOWED');
    }
    
    await connection.beginTransaction();
    
    // 验证invitee是新用户（不存在记录）
    const [existingUserRows] = await connection.execute(
      'SELECT id FROM users WHERE id = ? OR openid = ?',
      [newUserId, openid]
    );
    
    if (existingUserRows.length > 0) {
      throw new Error('USER_ALREADY_EXISTS');
    }
    
    // 创建新用户 - 生成邀请码
    const newUserInviteCode = generateRandomCode();
    
    await connection.execute(
      `INSERT INTO users (id, openid, payment_status, regenerate_count, usage_count, usage_limit, has_ever_paid, invite_code)
       VALUES (?, ?, 'free', 3, 3, 3, FALSE, ?)`,
      [newUserId, openid, newUserInviteCode]
    );
    
    // 创建invite_records记录
    const inviteRecordId = uuidv4();
    await connection.execute(
      `INSERT INTO invite_records (id, inviter_id, invitee_id, invite_code, reward_granted, created_at)
       VALUES (?, ?, ?, ?, TRUE, NOW())`,
      [inviteRecordId, inviterId, newUserId, inviteCode]
    );
    
    // 增加inviter的usage_count
    await connection.execute(
      'UPDATE users SET usage_count = usage_count + 1 WHERE id = ?',
      [inviterId]
    );
    
    // 获取inviter的新usage_count用于日志
    const [inviterRows] = await connection.execute(
      'SELECT usage_count FROM users WHERE id = ?',
      [inviterId]
    );
    const newInviterCount = inviterRows[0]?.usage_count || 0;
    
    // 记录usage_logs
    const logId = uuidv4();
    await connection.execute(
      `INSERT INTO usage_logs (id, user_id, action_type, amount, remaining_count, reason, reference_id, created_at)
       VALUES (?, ?, 'increment', 1, ?, 'invite_reward', ?, NOW())`,
      [logId, inviterId, newInviterCount, inviteRecordId]
    );
    
    // 更新或创建invite_stats
    // 先检查是否存在
    const [statsRows] = await connection.execute(
      'SELECT user_id FROM invite_stats WHERE user_id = ?',
      [inviterId]
    );
    
    if (statsRows.length === 0) {
      // 创建新的统计记录
      await connection.execute(
        `INSERT INTO invite_stats (user_id, total_invites, successful_invites, total_rewards, last_invite_at, updated_at)
         VALUES (?, 1, 1, 1, NOW(), NOW())`,
        [inviterId]
      );
    } else {
      // 更新现有统计记录
      await connection.execute(
        `UPDATE invite_stats 
         SET total_invites = total_invites + 1,
             successful_invites = successful_invites + 1,
             total_rewards = total_rewards + 1,
             last_invite_at = NOW(),
             updated_at = NOW()
         WHERE user_id = ?`,
        [inviterId]
      );
    }
    
    // 提交事务
    await connection.commit();
    
    return {
      success: true,
      inviter_id: inviterId,
      reward_granted: true
    };
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    
    // 处理特定错误
    if (error.message === 'SELF_INVITE_NOT_ALLOWED') {
      throw new Error('不能使用自己的邀请码');
    } else if (error.message === 'USER_ALREADY_EXISTS') {
      throw new Error('该用户已存在，不能重复邀请');
    } else {
      console.error('处理邀请注册失败:', error);
      throw new Error(`处理邀请注册失败: ${error.message}`);
    }
  } finally {
    connection.release();
  }
}

/**
 * 获取邀请统计
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} { total_invites, successful_invites, total_rewards }
 */
async function getInviteStats(userId) {
  try {
    // 查询 invite_stats 表
    const sql = `
      SELECT total_invites, successful_invites, total_rewards, last_invite_at
      FROM invite_stats
      WHERE user_id = ?
    `;
    
    const rows = await query(sql, [userId]);
    
    // 如果没有统计记录，返回零值
    if (rows.length === 0) {
      return {
        total_invites: 0,
        successful_invites: 0,
        total_rewards: 0,
        last_invite_at: null
      };
    }
    
    return {
      total_invites: rows[0].total_invites,
      successful_invites: rows[0].successful_invites,
      total_rewards: rows[0].total_rewards,
      last_invite_at: rows[0].last_invite_at
    };
  } catch (error) {
    console.error('获取邀请统计失败:', error);
    throw new Error(`获取邀请统计失败: ${error.message}`);
  }
}

/**
 * 获取邀请记录
 * @param {string} userId - 用户ID
 * @param {number} page - 页码（从1开始）
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} { records, total, page, pageSize }
 */
async function getInviteRecords(userId, page = 1, pageSize = 20) {
  try {
    // 验证分页参数
    const validPage = Math.max(1, parseInt(page) || 1);
    const validPageSize = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
    const offset = (validPage - 1) * validPageSize;
    
    // 查询总记录数
    const countSql = `
      SELECT COUNT(*) as total
      FROM invite_records
      WHERE inviter_id = ?
    `;
    
    const countRows = await query(countSql, [userId]);
    const total = countRows[0].total;
    
    // 查询分页记录
    const recordsSql = `
      SELECT 
        ir.id,
        ir.invitee_id,
        u.nickname as invitee_nickname,
        ir.created_at,
        ir.reward_granted
      FROM invite_records ir
      LEFT JOIN users u ON ir.invitee_id = u.id
      WHERE ir.inviter_id = ?
      ORDER BY ir.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const records = await query(recordsSql, [userId, validPageSize, offset]);
    
    // 格式化记录
    const formattedRecords = records.map(record => ({
      id: record.id,
      invitee_id: record.invitee_id,
      invitee_nickname: record.invitee_nickname || '未知用户',
      created_at: record.created_at,
      reward_granted: record.reward_granted
    }));
    
    return {
      records: formattedRecords,
      total,
      page: validPage,
      pageSize: validPageSize,
      totalPages: Math.ceil(total / validPageSize)
    };
  } catch (error) {
    console.error('获取邀请记录失败:', error);
    throw new Error(`获取邀请记录失败: ${error.message}`);
  }
}

module.exports = {
  generateInviteCode,
  validateInviteCode,
  processInviteRegistration,
  getInviteStats,
  getInviteRecords
};
