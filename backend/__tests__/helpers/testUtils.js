/**
 * Property-Based Testing Utilities
 * 测试辅助函数和清理工具
 */
const db = require('../../db/connection');

/**
 * 清理测试数据
 * @param {string} tableName - 表名
 * @param {Array<string>} ids - 要删除的ID列表
 */
async function cleanupTestData(tableName, ids) {
  if (!ids || ids.length === 0) return;
  
  const connection = await db.pool.getConnection();
  try {
    const placeholders = ids.map(() => '?').join(',');
    await connection.execute(
      `DELETE FROM ${tableName} WHERE id IN (${placeholders})`,
      ids
    );
  } finally {
    connection.release();
  }
}

/**
 * 批量插入测试数据
 * @param {string} tableName - 表名
 * @param {Array<Object>} records - 记录数组
 * @returns {Promise<Array<string>>} 插入的ID列表
 */
async function insertTestData(tableName, records) {
  if (!records || records.length === 0) return [];
  
  const connection = await db.pool.getConnection();
  try {
    const ids = [];
    for (const record of records) {
      const keys = Object.keys(record);
      const values = Object.values(record);
      const placeholders = keys.map(() => '?').join(',');
      const columns = keys.join(',');
      
      await connection.execute(
        `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
        values
      );
      ids.push(record.id);
    }
    return ids;
  } finally {
    connection.release();
  }
}

/**
 * 查询测试数据
 * @param {string} tableName - 表名
 * @param {string} id - 记录ID
 * @returns {Promise<Object|null>} 查询结果
 */
async function queryTestData(tableName, id) {
  const connection = await db.pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } finally {
    connection.release();
  }
}

/**
 * 更新测试数据
 * @param {string} tableName - 表名
 * @param {string} id - 记录ID
 * @param {Object} updates - 更新字段
 */
async function updateTestData(tableName, id, updates) {
  const connection = await db.pool.getConnection();
  try {
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    
    await connection.execute(
      `UPDATE ${tableName} SET ${setClause} WHERE id = ?`,
      [...values, id]
    );
  } finally {
    connection.release();
  }
}

/**
 * 等待指定时间
 * @param {number} ms - 毫秒数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 比较两个浮点数是否接近
 * @param {number} a - 数值a
 * @param {number} b - 数值b
 * @param {number} epsilon - 误差范围
 * @returns {boolean}
 */
function isCloseTo(a, b, epsilon = 0.01) {
  return Math.abs(a - b) < epsilon;
}

/**
 * 生成随机字符串
 * @param {number} length - 长度
 * @returns {string}
 */
function randomString(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 创建测试上下文
 * 用于在测试前后自动清理数据
 */
class TestContext {
  constructor() {
    this.cleanupTasks = [];
  }

  /**
   * 注册清理任务
   * @param {Function} cleanupFn - 清理函数
   */
  registerCleanup(cleanupFn) {
    this.cleanupTasks.push(cleanupFn);
  }

  /**
   * 执行所有清理任务
   */
  async cleanup() {
    for (const task of this.cleanupTasks.reverse()) {
      try {
        await task();
      } catch (error) {
        console.error('Cleanup task failed:', error);
      }
    }
    this.cleanupTasks = [];
  }
}

module.exports = {
  cleanupTestData,
  insertTestData,
  queryTestData,
  updateTestData,
  sleep,
  isCloseTo,
  randomString,
  TestContext
};
