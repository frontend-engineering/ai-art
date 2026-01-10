/**
 * 云开发数据库连接模块
 * 使用 @cloudbase/node-sdk 的 rdb() 方法
 * 延迟初始化，避免模块加载时崩溃
 */

let _app = null;
let _db = null;

function getApp() {
  if (!_app) {
    try {
      const cloudbase = require('@cloudbase/node-sdk');
      _app = cloudbase.init({
        env: 'test-1g71tc7eb37627e2',
        region: 'ap-shanghai'
      });
    } catch (e) {
      console.error('[DB] cloudbase SDK 初始化失败:', e.message);
      return null;
    }
  }
  return _app;
}

function getDb() {
  if (!_db) {
    const app = getApp();
    if (app) {
      try {
        _db = app.rdb();
      } catch (e) {
        console.error('[DB] rdb() 初始化失败:', e.message);
        return null;
      }
    }
  }
  return _db;
}

// 安全的数据库操作包装器
const safeDb = {
  async insert(table, data) {
    const db = getDb();
    if (!db) {
      console.warn('[DB] 数据库不可用，跳过插入操作');
      return { error: 'DB not available' };
    }
    return await db.from(table).insert(data);
  },
  
  async select(table, column, value) {
    const db = getDb();
    if (!db) {
      console.warn('[DB] 数据库不可用，跳过查询操作');
      return { data: [], error: 'DB not available' };
    }
    return await db.from(table).eq(column, value).select('*');
  },
  
  async update(table, column, value, data) {
    const db = getDb();
    if (!db) {
      console.warn('[DB] 数据库不可用，跳过更新操作');
      return { error: 'DB not available' };
    }
    return await db.from(table).eq(column, value).update(data);
  }
};

module.exports = { getDb, getApp, safeDb };
