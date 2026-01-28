/**
 * 云开发 MySQL 数据库连接模块
 * 使用 CloudBase RDB (Relational Database) API
 * 延迟初始化，避免模块加载时崩溃
 */

const cloudbase = require('@cloudbase/node-sdk');

let _app = null;
let _db = null;

/**
 * 格式化日期为 MySQL DATETIME 格式
 * @param {Date} date - 日期对象
 * @returns {string} - 格式化后的日期字符串 'YYYY-MM-DD HH:MM:SS'
 */
function formatMySQLDateTime(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getDb() {
  if (!_db) {
    try {
      if (!_app) {
        _app = cloudbase.init({
          env: process.env.TCB_ENV || 'test-1g71tc7eb37627e2',
          region: 'ap-shanghai'
        });
      }
      
      // 使用 RDB API 连接 MySQL 数据库
      _db = _app.rdb();
      
      if (!_db) {
        console.error('[DB] CloudBase MySQL 数据库对象不存在');
        return null;
      }
      
      console.log('[DB] CloudBase MySQL 数据库初始化成功');
    } catch (e) {
      console.error('[DB] CloudBase MySQL 数据库初始化失败:', e.message);
      return null;
    }
  }
  return _db;
}

// 安全的数据库操作包装器
const safeDb = {
  async insert(table, data) {
    const db = getDb();
    if (!db) {
      console.log('[DB] 数据库不可用，跳过插入操作（订单将由后端管理）');
      return { error: 'DB not available', skipped: true };
    }
    
    try {
      // 使用 CloudBase RDB API 插入数据
      const { data: result, error } = await db.from(table)
        .insert(data)
        .select();
      
      if (error) {
        console.warn(`[DB] 插入失败: ${table} - ${error.message || JSON.stringify(error)}（不影响支付功能）`);
        return { error: error.message || JSON.stringify(error), skipped: true };
      }
      
      console.log(`[DB] 插入成功: ${table}, 记录数: ${result ? result.length : 0}`);
      return { data: result, error: null };
    } catch (error) {
      console.warn(`[DB] 插入异常: ${table} - ${error.message}（不影响支付功能）`);
      return { error: error.message, skipped: true };
    }
  },
  
  async select(table, column, value) {
    const db = getDb();
    if (!db) {
      console.log('[DB] 数据库不可用，跳过查询操作');
      return { data: [], error: 'DB not available', skipped: true };
    }
    
    try {
      // 使用 CloudBase RDB API 查询数据
      const { data: result, error } = await db.from(table)
        .select('*')
        .eq(column, value);
      
      if (error) {
        console.warn(`[DB] 查询失败: ${table} - ${error.message || JSON.stringify(error)}（不影响功能）`);
        return { data: [], error: error.message || JSON.stringify(error), skipped: true };
      }
      
      const records = result || [];
      console.log(`[DB] 查询成功: ${table}, 结果数: ${records.length}`);
      return { data: records, error: null };
    } catch (error) {
      console.warn(`[DB] 查询异常: ${table} - ${error.message}（不影响功能）`);
      return { data: [], error: error.message, skipped: true };
    }
  },
  
  async update(table, column, value, updateData) {
    const db = getDb();
    if (!db) {
      console.log('[DB] 数据库不可用，跳过更新操作');
      return { error: 'DB not available', skipped: true };
    }
    
    try {
      // 使用 CloudBase RDB API 更新数据
      const { data: result, error } = await db.from(table)
        .update(updateData)
        .eq(column, value)
        .select();
      
      if (error) {
        console.warn(`[DB] 更新失败: ${table} - ${error.message || JSON.stringify(error)}（不影响功能）`);
        return { error: error.message || JSON.stringify(error), skipped: true };
      }
      
      const updated = result ? result.length : 0;
      console.log(`[DB] 更新成功: ${table}, 影响行数: ${updated}`);
      return { data: { updated }, error: null };
    } catch (error) {
      console.warn(`[DB] 更新异常: ${table} - ${error.message}（不影响功能）`);
      return { error: error.message, skipped: true };
    }
  }
};

module.exports = { getDb, safeDb, formatMySQLDateTime };
