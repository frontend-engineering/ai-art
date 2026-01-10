/**
 * MySQL数据库连接配置
 * 
 * 云托管环境使用 @cloudbase/node-sdk 的 rdb() 方法访问 MySQL
 * 需要配置环境变量：
 * - CLOUDBASE_ENV: 云开发环境 ID
 * - TENCENTCLOUD_SECRETID: 腾讯云 SecretId
 * - TENCENTCLOUD_SECRETKEY: 腾讯云 SecretKey
 * 
 * 本地开发使用 mysql2 直连（DATABASE_URL 或 DB_HOST）
 */

require('dotenv').config();

// 判断是否在云托管环境中（有 CLOUDBASE_ENV 且有腾讯云密钥）
const hasCloudBaseConfig = !!(
  process.env.CLOUDBASE_ENV && 
  process.env.TENCENTCLOUD_SECRETID && 
  process.env.TENCENTCLOUD_SECRETKEY
);

const CLOUDBASE_ENV_ID = process.env.CLOUDBASE_ENV || 'prod-9gxl9eb37627e2';

// 启动时打印环境信息
console.log('🔍 数据库环境检测:', {
  hasCloudBaseConfig,
  CLOUDBASE_ENV: process.env.CLOUDBASE_ENV || '未配置',
  TENCENTCLOUD_SECRETID: process.env.TENCENTCLOUD_SECRETID ? '已配置' : '未配置',
  TENCENTCLOUD_SECRETKEY: process.env.TENCENTCLOUD_SECRETKEY ? '已配置' : '未配置',
  DATABASE_URL: process.env.DATABASE_URL ? '已配置' : '未配置',
  DB_HOST: process.env.DB_HOST || '未配置'
});

let cloudbaseApp = null;
let mysqlPool = null;

/**
 * 初始化 CloudBase SDK
 */
function initCloudBase() {
  if (cloudbaseApp) return cloudbaseApp;
  
  try {
    const cloudbase = require('@cloudbase/node-sdk');
    
    cloudbaseApp = cloudbase.init({
      env: CLOUDBASE_ENV_ID,
      region: 'ap-shanghai',
      secretId: process.env.TENCENTCLOUD_SECRETID,
      secretKey: process.env.TENCENTCLOUD_SECRETKEY
    });
    
    console.log('📡 CloudBase SDK 初始化成功，环境:', CLOUDBASE_ENV_ID);
    return cloudbaseApp;
  } catch (error) {
    console.error('CloudBase SDK 初始化失败:', error);
    throw error;
  }
}

/**
 * 初始化 MySQL 直连（本地开发或 DATABASE_URL 模式）
 */
function initMysqlPool() {
  if (mysqlPool) return mysqlPool;
  
  const mysql = require('mysql2/promise');
  
  if (process.env.DATABASE_URL) {
    console.log('📡 使用 DATABASE_URL 连接数据库');
    mysqlPool = mysql.createPool(process.env.DATABASE_URL);
  } else {
    console.log('📡 使用分离配置连接数据库（本地开发模式）');
    mysqlPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ai_family_photo',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
  }
  
  return mysqlPool;
}

/**
 * 测试数据库连接
 */
async function testConnection() {
  try {
    if (hasCloudBaseConfig) {
      const app = initCloudBase();
      const rdb = app.rdb();
      const result = await rdb.from('users').select('id').limit(1);
      console.log('✅ CloudBase MySQL 连接成功');
      return true;
    } else {
      const pool = initMysqlPool();
      const connection = await pool.getConnection();
      console.log('✅ MySQL 直连成功');
      connection.release();
      return true;
    }
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

/**
 * 执行查询（兼容两种模式）
 * @param {string} sql - SQL查询语句
 * @param {Array} params - 查询参数
 * @returns {Promise<Array>} 查询结果
 */
async function query(sql, params = []) {
  try {
    if (hasCloudBaseConfig) {
      // CloudBase SDK 模式 - 使用 rdb() ORM 风格 API
      const app = initCloudBase();
      const rdb = app.rdb();
      const result = await executeCloudBaseQuery(rdb, sql, params);
      return result;
    } else {
      // MySQL 直连模式
      const pool = initMysqlPool();
      const [rows] = await pool.execute(sql, params);
      return rows;
    }
  } catch (error) {
    console.error('数据库查询失败:', error);
    console.error('SQL:', sql.substring(0, 200));
    throw error;
  }
}

/**
 * 将 SQL 转换为 CloudBase rdb ORM 操作
 */
async function executeCloudBaseQuery(rdb, sql, params) {
  const sqlLower = sql.trim().toLowerCase();
  
  // 参数索引
  let paramIndex = 0;
  const getParam = () => params[paramIndex++];
  
  console.log('[CloudBase RDB] SQL:', sql.substring(0, 150));
  console.log('[CloudBase RDB] Params:', JSON.stringify(params).substring(0, 100));
  
  if (sqlLower.startsWith('select')) {
    // SELECT 查询
    const tableMatch = sql.match(/from\s+(\w+)/i);
    if (!tableMatch) throw new Error('无法解析表名');
    const tableName = tableMatch[1];
    
    let query = rdb.from(tableName);
    
    // 解析 WHERE 条件
    const whereMatch = sql.match(/where\s+(\w+)\s*=\s*\?/i);
    if (whereMatch) {
      const field = whereMatch[1];
      const value = getParam();
      query = query.filter({ [field]: value });
    }
    
    const result = await query.select('*');
    console.log('[CloudBase RDB] SELECT result:', JSON.stringify(result).substring(0, 200));
    return result.data || [];
    
  } else if (sqlLower.startsWith('insert')) {
    // INSERT 操作
    const tableMatch = sql.match(/into\s+(\w+)/i);
    if (!tableMatch) throw new Error('无法解析表名');
    const tableName = tableMatch[1];
    
    // 解析字段
    const fieldsMatch = sql.match(/\(([^)]+)\)\s*values/i);
    if (!fieldsMatch) throw new Error('无法解析字段');
    const fields = fieldsMatch[1].split(',').map(f => f.trim());
    
    const data = {};
    fields.forEach(field => {
      data[field] = getParam();
    });
    
    console.log('[CloudBase RDB] INSERT:', tableName, JSON.stringify(data).substring(0, 200));
    const result = await rdb.from(tableName).insert(data);
    console.log('[CloudBase RDB] INSERT result:', JSON.stringify(result).substring(0, 200));
    return result;
    
  } else if (sqlLower.startsWith('update')) {
    // UPDATE 操作
    const tableMatch = sql.match(/update\s+(\w+)/i);
    if (!tableMatch) throw new Error('无法解析表名');
    const tableName = tableMatch[1];
    
    // 解析 SET 子句
    const setMatch = sql.match(/set\s+(.+?)\s+where/i);
    if (!setMatch) throw new Error('无法解析 SET 子句');
    
    const setParts = setMatch[1].split(',');
    const updateData = {};
    setParts.forEach(part => {
      const [field] = part.split('=').map(s => s.trim());
      // 跳过 CURRENT_TIMESTAMP 等函数
      if (field && !part.includes('CURRENT_TIMESTAMP') && part.includes('?')) {
        updateData[field] = getParam();
      }
    });
    
    // 解析 WHERE 条件
    const whereMatch = sql.match(/where\s+(\w+)\s*=\s*\?/i);
    if (!whereMatch) throw new Error('无法解析 WHERE 条件');
    const whereField = whereMatch[1];
    const whereValue = getParam();
    
    console.log('[CloudBase RDB] UPDATE:', tableName, updateData, 'WHERE', whereField, '=', whereValue);
    const result = await rdb.from(tableName).filter({ [whereField]: whereValue }).update(updateData);
    console.log('[CloudBase RDB] UPDATE result:', JSON.stringify(result).substring(0, 200));
    return result;
    
  } else if (sqlLower.startsWith('delete')) {
    // DELETE 操作
    const tableMatch = sql.match(/from\s+(\w+)/i);
    if (!tableMatch) throw new Error('无法解析表名');
    const tableName = tableMatch[1];
    
    // 解析 WHERE 条件
    const whereMatch = sql.match(/where\s+(\w+)\s*=\s*\?/i);
    if (!whereMatch) throw new Error('无法解析 WHERE 条件');
    const whereField = whereMatch[1];
    const whereValue = getParam();
    
    console.log('[CloudBase RDB] DELETE:', tableName, 'WHERE', whereField, '=', whereValue);
    const result = await rdb.from(tableName).filter({ [whereField]: whereValue }).delete();
    return result;
    
  } else {
    throw new Error(`不支持的 SQL 操作: ${sqlLower.substring(0, 20)}`);
  }
}

/**
 * 执行事务
 */
async function transaction(callback) {
  if (hasCloudBaseConfig) {
    console.warn('CloudBase 模式暂不支持事务，将直接执行');
    return await callback({ execute: async (sql, params) => [await query(sql, params)] });
  }
  
  const pool = initMysqlPool();
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 关闭连接池
 */
async function closePool() {
  try {
    if (mysqlPool) {
      await mysqlPool.end();
      mysqlPool = null;
      console.log('MySQL 连接池已关闭');
    }
  } catch (error) {
    console.error('关闭连接池失败:', error);
  }
}

module.exports = {
  get pool() {
    return hasCloudBaseConfig ? null : initMysqlPool();
  },
  query,
  transaction,
  testConnection,
  closePool,
  hasCloudBaseConfig,
  CLOUDBASE_ENV_ID
};
