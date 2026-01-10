/**
 * MySQL 数据库连接模块
 * 使用环境变量 DATABASE_URL 连接数据库
 * 
 * 环境变量配置格式：
 * DATABASE_URL="mysql://username:password@host:port/database"
 */
const mysql = require('mysql2/promise');

/**
 * 获取数据库连接
 * 每次调用创建新连接，使用完需要关闭
 */
async function getConnection() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL 环境变量未配置');
  }
  return mysql.createConnection(connectionString);
}

/**
 * 执行查询并自动关闭连接
 */
async function query(sql, params = []) {
  const conn = await getConnection();
  try {
    const [rows] = await conn.execute(sql, params);
    return rows;
  } finally {
    await conn.end();
  }
}

/**
 * 插入数据
 */
async function insert(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  
  const conn = await getConnection();
  try {
    const [result] = await conn.execute(sql, values);
    return result;
  } finally {
    await conn.end();
  }
}

/**
 * 更新数据
 */
async function update(table, data, where, whereParams = []) {
  const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(data), ...whereParams];
  const sql = `UPDATE ${table} SET ${sets} WHERE ${where}`;
  
  const conn = await getConnection();
  try {
    const [result] = await conn.execute(sql, values);
    return result;
  } finally {
    await conn.end();
  }
}

/**
 * 查询单条记录
 */
async function findOne(table, where, params = []) {
  const sql = `SELECT * FROM ${table} WHERE ${where} LIMIT 1`;
  const rows = await query(sql, params);
  return rows[0] || null;
}

/**
 * 查询多条记录
 */
async function findAll(table, where = '1=1', params = []) {
  const sql = `SELECT * FROM ${table} WHERE ${where}`;
  return await query(sql, params);
}

module.exports = {
  getConnection,
  query,
  insert,
  update,
  findOne,
  findAll
};
