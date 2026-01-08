/**
 * 用户服务
 * 负责用户的创建、查询和更新
 */

const { query, transaction } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

/**
 * 创建新用户
 * @param {string} userId 用户ID (可选,如果不提供则自动生成)
 * @returns {Promise<Object>} 创建的用户对象
 */
async function createUser(userId = null) {
  try {
    // 如果没有提供userId,生成新的UUID
    const id = userId || uuidv4();
    
    // 检查用户是否已存在
    const existingUser = await getUserById(id);
    if (existingUser) {
      console.log(`用户 ${id} 已存在,返回现有用户`);
      return existingUser;
    }
    
    // 插入新用户
    const sql = `
      INSERT INTO users (id, payment_status, regenerate_count)
      VALUES (?, 'free', 3)
    `;
    
    await query(sql, [id]);
    
    console.log(`用户 ${id} 创建成功`);
    
    // 返回创建的用户
    return await getUserById(id);
  } catch (error) {
    console.error('创建用户失败:', error);
    throw new Error(`创建用户失败: ${error.message}`);
  }
}

/**
 * 创建带有微信openid的新用户
 * @param {string} userId 用户ID
 * @param {string} openid 微信openid
 * @returns {Promise<Object>} 创建的用户对象
 */
async function createUserWithOpenid(userId, openid) {
  try {
    // 检查用户是否已存在
    const existingUser = await getUserById(userId);
    if (existingUser) {
      console.log(`用户 ${userId} 已存在,返回现有用户`);
      return existingUser;
    }
    
    // 检查openid是否已被使用
    const existingOpenidUser = await getUserByOpenid(openid);
    if (existingOpenidUser) {
      console.log(`openid ${openid} 已存在,返回现有用户`);
      return existingOpenidUser;
    }
    
    // 插入新用户
    const sql = `
      INSERT INTO users (id, openid, payment_status, regenerate_count)
      VALUES (?, ?, 'free', 3)
    `;
    
    await query(sql, [userId, openid]);
    
    console.log(`用户 ${userId} (openid: ${openid.substring(0, 8)}...) 创建成功`);
    
    // 返回创建的用户
    return await getUserById(userId);
  } catch (error) {
    console.error('创建用户失败:', error);
    throw new Error(`创建用户失败: ${error.message}`);
  }
}

/**
 * 根据微信openid获取用户
 * @param {string} openid 微信openid
 * @returns {Promise<Object|null>} 用户对象,如果不存在则返回null
 */
async function getUserByOpenid(openid) {
  try {
    const sql = `
      SELECT id, openid, created_at, updated_at, payment_status, regenerate_count
      FROM users
      WHERE openid = ?
    `;
    
    const rows = await query(sql, [openid]);
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0];
  } catch (error) {
    console.error('根据openid查询用户失败:', error);
    throw new Error(`根据openid查询用户失败: ${error.message}`);
  }
}

/**
 * 根据ID获取用户
 * @param {string} userId 用户ID
 * @returns {Promise<Object|null>} 用户对象,如果不存在则返回null
 */
async function getUserById(userId) {
  try {
    const sql = `
      SELECT id, openid, created_at, updated_at, payment_status, regenerate_count
      FROM users
      WHERE id = ?
    `;
    
    const rows = await query(sql, [userId]);
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0];
  } catch (error) {
    console.error('查询用户失败:', error);
    throw new Error(`查询用户失败: ${error.message}`);
  }
}

/**
 * 更新用户付费状态
 * @param {string} userId 用户ID
 * @param {string} paymentStatus 付费状态 ('free', 'basic', 'premium')
 * @returns {Promise<Object>} 更新后的用户对象
 */
async function updateUserPaymentStatus(userId, paymentStatus) {
  try {
    // 验证付费状态
    const validStatuses = ['free', 'basic', 'premium'];
    if (!validStatuses.includes(paymentStatus)) {
      throw new Error(`无效的付费状态: ${paymentStatus}`);
    }
    
    const sql = `
      UPDATE users
      SET payment_status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await query(sql, [paymentStatus, userId]);
    
    console.log(`用户 ${userId} 付费状态更新为 ${paymentStatus}`);
    
    // 返回更新后的用户
    return await getUserById(userId);
  } catch (error) {
    console.error('更新用户付费状态失败:', error);
    throw new Error(`更新用户付费状态失败: ${error.message}`);
  }
}

/**
 * 更新用户重生成次数
 * @param {string} userId 用户ID
 * @param {number} count 重生成次数
 * @returns {Promise<Object>} 更新后的用户对象
 */
async function updateUserRegenerateCount(userId, count) {
  try {
    const sql = `
      UPDATE users
      SET regenerate_count = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await query(sql, [count, userId]);
    
    console.log(`用户 ${userId} 重生成次数更新为 ${count}`);
    
    // 返回更新后的用户
    return await getUserById(userId);
  } catch (error) {
    console.error('更新用户重生成次数失败:', error);
    throw new Error(`更新用户重生成次数失败: ${error.message}`);
  }
}

/**
 * 减少用户重生成次数
 * @param {string} userId 用户ID
 * @returns {Promise<Object>} 更新后的用户对象
 */
async function decrementRegenerateCount(userId) {
  try {
    const sql = `
      UPDATE users
      SET regenerate_count = GREATEST(regenerate_count - 1, 0),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await query(sql, [userId]);
    
    console.log(`用户 ${userId} 重生成次数减1`);
    
    // 返回更新后的用户
    return await getUserById(userId);
  } catch (error) {
    console.error('减少用户重生成次数失败:', error);
    throw new Error(`减少用户重生成次数失败: ${error.message}`);
  }
}

/**
 * 获取或创建用户
 * 如果用户不存在则创建,存在则返回
 * @param {string} userId 用户ID
 * @returns {Promise<Object>} 用户对象
 */
async function getOrCreateUser(userId) {
  try {
    // 先尝试获取用户
    let user = await getUserById(userId);
    
    // 如果用户不存在,创建新用户
    if (!user) {
      console.log(`用户 ${userId} 不存在,创建新用户`);
      user = await createUser(userId);
    }
    
    return user;
  } catch (error) {
    console.error('获取或创建用户失败:', error);
    throw new Error(`获取或创建用户失败: ${error.message}`);
  }
}

module.exports = {
  createUser,
  createUserWithOpenid,
  getUserById,
  getUserByOpenid,
  updateUserPaymentStatus,
  updateUserRegenerateCount,
  decrementRegenerateCount,
  getOrCreateUser
};
