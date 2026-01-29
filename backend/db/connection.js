/**
 * MySQL数据库连接配置
 * 
 * 云托管环境使用 @cloudbase/node-sdk 的 rdb() 方法访问 MySQL
 * 本地开发使用 mysql2 直连
 */

require('dotenv').config();

// 判断是否在云托管环境中
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
 * 初始化 MySQL 直连
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
      const db = app.rdb();
      // 简单查询测试
      const { data, error } = await db.from('users').select('id');
      if (error) throw error;
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
 */
async function query(sql, params = []) {
  try {
    if (hasCloudBaseConfig) {
      const app = initCloudBase();
      const db = app.rdb();
      const result = await executeCloudBaseQuery(db, sql, params);
      return result;
    } else {
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
 * 将 SQL 转换为 CloudBase MySQL RDB 操作
 * 
 * CloudBase RDB API:
 * - SELECT: db.from(table).select().eq(column, value)
 * - INSERT: db.from(table).insert(data)
 * - UPDATE: db.from(table).update(data).eq(column, value)
 * - DELETE: db.from(table).delete().eq(column, value)
 */
async function executeCloudBaseQuery(db, sql, params) {
  const sqlLower = sql.trim().toLowerCase();
  
  let paramIndex = 0;
  const getParam = () => params[paramIndex++];
  
  console.log('[CloudBase RDB] SQL:', sql.substring(0, 150));
  console.log('[CloudBase RDB] Params:', JSON.stringify(params).substring(0, 100));
  
  try {
    if (sqlLower.startsWith('select')) {
      return await handleSelect(db, sql, getParam);
    } else if (sqlLower.startsWith('insert')) {
      return await handleInsert(db, sql, getParam);
    } else if (sqlLower.startsWith('update')) {
      return await handleUpdate(db, sql, getParam);
    } else if (sqlLower.startsWith('delete')) {
      return await handleDelete(db, sql, getParam);
    } else {
      throw new Error(`不支持的 SQL 操作: ${sqlLower.substring(0, 20)}`);
    }
  } catch (error) {
    console.error('[CloudBase RDB] 执行失败:', error);
    throw error;
  }
}

/**
 * 处理 SELECT 查询
 */
async function handleSelect(db, sql, getParam) {
  const tableMatch = sql.match(/from\s+(\w+)/i);
  if (!tableMatch) throw new Error('无法解析表名');
  const tableName = tableMatch[1];
  
  let query = db.from(tableName).select();
  
  // 解析 WHERE 条件
  const whereMatch = sql.match(/where\s+(\w+)\s*=\s*\?/i);
  if (whereMatch) {
    const field = whereMatch[1];
    const value = getParam();
    query = query.eq(field, value);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('[CloudBase RDB] SELECT error:', error);
    throw new Error(error.message || 'SELECT 查询失败');
  }
  
  console.log('[CloudBase RDB] SELECT result count:', data ? data.length : 0);
  return data || [];
}

/**
 * 处理 INSERT 操作
 */
async function handleInsert(db, sql, getParam) {
  const tableMatch = sql.match(/into\s+(\w+)/i);
  if (!tableMatch) throw new Error('无法解析表名');
  const tableName = tableMatch[1];
  
  // 解析字段
  const fieldsMatch = sql.match(/\(([^)]+)\)\s*values/i);
  if (!fieldsMatch) throw new Error('无法解析字段');
  const fields = fieldsMatch[1].split(',').map(f => f.trim());
  
  const insertData = {};
  fields.forEach(field => {
    insertData[field] = getParam();
  });
  
  console.log('[CloudBase RDB] INSERT:', tableName, JSON.stringify(insertData).substring(0, 200));
  
  const { data, error } = await db.from(tableName).insert(insertData);
  
  if (error) {
    console.error('[CloudBase RDB] INSERT error:', error);
    throw new Error(error.message || 'INSERT 操作失败');
  }
  
  console.log('[CloudBase RDB] INSERT result:', JSON.stringify(data).substring(0, 200));
  return data;
}

/**
 * 处理 UPDATE 操作
 */
async function handleUpdate(db, sql, getParam) {
  const tableMatch = sql.match(/update\s+(\w+)/i);
  if (!tableMatch) throw new Error('无法解析表名');
  const tableName = tableMatch[1];
  
  // 解析 SET 子句
  const setMatch = sql.match(/set\s+(.+?)\s+where/i);
  if (!setMatch) throw new Error('无法解析 SET 子句');
  
  const setParts = setMatch[1].split(',');
  const updateData = {};
  const expressions = []; // 存储表达式（如 field = field + 1）
  
  console.log('[CloudBase RDB] 解析 SET 子句:', setParts);
  
  setParts.forEach(part => {
    const trimmedPart = part.trim();
    
    console.log('[CloudBase RDB] 处理部分:', trimmedPart);
    
    // 跳过 CURRENT_TIMESTAMP
    if (trimmedPart.includes('CURRENT_TIMESTAMP')) {
      console.log('[CloudBase RDB] 跳过 CURRENT_TIMESTAMP');
      return;
    }
    
    // 检查是否是表达式（如 usage_count = usage_count - 1）
    // 改进的正则表达式，支持空格和数字
    const exprMatch = trimmedPart.match(/^(\w+)\s*=\s*(\w+)\s*([+\-*/])\s*(\d+|[\?])$/);
    if (exprMatch) {
      const [, leftField, rightField, operator, rightValue] = exprMatch;
      
      console.log('[CloudBase RDB] 匹配到表达式:', { leftField, rightField, operator, rightValue });
      
      // 如果是自增/自减表达式（如 usage_count = usage_count - 1）
      if (leftField === rightField) {
        const value = rightValue === '?' ? getParam() : parseInt(rightValue);
        expressions.push({
          field: leftField,
          operator,
          value
        });
        console.log('[CloudBase RDB] 添加表达式:', { field: leftField, operator, value });
        return;
      }
    }
    
    // 普通赋值（field = ?）
    const assignMatch = trimmedPart.match(/^(\w+)\s*=\s*\?$/);
    if (assignMatch) {
      const field = assignMatch[1];
      updateData[field] = getParam();
      console.log('[CloudBase RDB] 添加普通赋值:', field);
    }
  });
  
  // 解析 WHERE 条件
  const whereMatch = sql.match(/where\s+(\w+)\s*=\s*\?/i);
  if (!whereMatch) throw new Error('无法解析 WHERE 条件');
  const whereField = whereMatch[1];
  const whereValue = getParam();
  
  console.log('[CloudBase RDB] UPDATE:', tableName, 'updateData:', updateData, 'expressions:', expressions, 'WHERE', whereField, '=', whereValue);
  
  // CloudBase RDB 不支持表达式更新，需要先查询再更新
  if (expressions.length > 0) {
    console.log('[CloudBase RDB] 检测到表达式，先查询当前值');
    
    // 先查询当前值
    const { data: currentData, error: selectError } = await db.from(tableName).select().eq(whereField, whereValue);
    
    if (selectError) {
      console.error('[CloudBase RDB] 查询当前值失败:', selectError);
      throw new Error('查询当前值失败: ' + selectError.message);
    }
    
    if (!currentData || currentData.length === 0) {
      console.error('[CloudBase RDB] 未找到记录');
      throw new Error('未找到要更新的记录');
    }
    
    const currentRow = currentData[0];
    console.log('[CloudBase RDB] 当前值:', currentRow);
    
    // 计算新值
    expressions.forEach(expr => {
      const currentValue = currentRow[expr.field] || 0;
      let newValue;
      
      switch (expr.operator) {
        case '+':
          newValue = currentValue + expr.value;
          break;
        case '-':
          newValue = currentValue - expr.value;
          break;
        case '*':
          newValue = currentValue * expr.value;
          break;
        case '/':
          newValue = currentValue / expr.value;
          break;
        default:
          newValue = currentValue;
      }
      
      console.log('[CloudBase RDB] 计算:', expr.field, '=', currentValue, expr.operator, expr.value, '->', newValue);
      updateData[expr.field] = newValue;
    });
  }
  
  console.log('[CloudBase RDB] 最终 updateData:', updateData);
  
  // 检查 updateData 是否为空
  if (Object.keys(updateData).length === 0) {
    throw new Error('UPDATE 操作没有要更新的字段');
  }
  
  // 执行更新
  const { data, error } = await db.from(tableName).update(updateData).eq(whereField, whereValue);
  
  if (error) {
    console.error('[CloudBase RDB] UPDATE error:', error);
    throw new Error(error.message || 'UPDATE 操作失败');
  }
  
  console.log('[CloudBase RDB] UPDATE result:', JSON.stringify(data).substring(0, 200));
  return data;
}

/**
 * 处理 DELETE 操作
 */
async function handleDelete(db, sql, getParam) {
  const tableMatch = sql.match(/from\s+(\w+)/i);
  if (!tableMatch) throw new Error('无法解析表名');
  const tableName = tableMatch[1];
  
  // 解析 WHERE 条件
  const whereMatch = sql.match(/where\s+(\w+)\s*=\s*\?/i);
  if (!whereMatch) throw new Error('无法解析 WHERE 条件');
  const whereField = whereMatch[1];
  const whereValue = getParam();
  
  console.log('[CloudBase RDB] DELETE:', tableName, 'WHERE', whereField, '=', whereValue);
  
  const { data, error } = await db.from(tableName).delete().eq(whereField, whereValue);
  
  if (error) {
    console.error('[CloudBase RDB] DELETE error:', error);
    throw new Error(error.message || 'DELETE 操作失败');
  }
  
  return data;
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
    // 在 CloudBase 模式下返回一个模拟的 pool 对象
    if (hasCloudBaseConfig) {
      return {
        getConnection: async () => {
          // 返回一个模拟的 connection 对象，使用 query 函数
          return {
            execute: async (sql, params) => {
              const result = await query(sql, params);
              // mysql2 返回 [rows, fields]，我们模拟这个格式
              return [result, []];
            },
            query: async (sql, params) => {
              const result = await query(sql, params);
              return [result, []];
            },
            beginTransaction: async () => {
              console.warn('[CloudBase] 事务不支持，跳过 beginTransaction');
            },
            commit: async () => {
              console.warn('[CloudBase] 事务不支持，跳过 commit');
            },
            rollback: async () => {
              console.warn('[CloudBase] 事务不支持，跳过 rollback');
            },
            release: () => {
              // CloudBase 模式不需要释放连接
            }
          };
        },
        end: async () => {
          // CloudBase 模式不需要关闭连接池
        }
      };
    }
    return initMysqlPool();
  },
  query,
  transaction,
  testConnection,
  closePool,
  hasCloudBaseConfig,
  CLOUDBASE_ENV_ID
};
