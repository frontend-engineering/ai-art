#!/usr/bin/env node

/**
 * 数据库迁移工具
 * 用于管理数据库结构变更
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MIGRATIONS_TABLE = 'schema_migrations';

/**
 * 创建迁移记录表
 */
async function createMigrationsTable(connection) {
  const sql = `
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_migration_name (migration_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await connection.query(sql);
}

/**
 * 获取已应用的迁移
 */
async function getAppliedMigrations(connection) {
  const [rows] = await connection.query(
    `SELECT migration_name FROM ${MIGRATIONS_TABLE} ORDER BY id`
  );
  return rows.map(row => row.migration_name);
}

/**
 * 获取待执行的迁移文件
 */
function getPendingMigrations(appliedMigrations) {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  return files.filter(file => !appliedMigrations.includes(file));
}

/**
 * 执行单个迁移
 */
async function runMigration(connection, migrationFile) {
  const filePath = path.join(MIGRATIONS_DIR, migrationFile);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log(`\n📝 执行迁移: ${migrationFile}`);
  
  try {
    // 开始事务
    await connection.beginTransaction();
    
    // 执行迁移SQL
    await connection.query(sql);
    
    // 记录迁移
    await connection.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (migration_name) VALUES (?)`,
      [migrationFile]
    );
    
    // 提交事务
    await connection.commit();
    
    console.log(`✅ 迁移成功: ${migrationFile}`);
    return true;
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    console.error(`❌ 迁移失败: ${migrationFile}`);
    console.error(`   错误: ${error.message}`);
    throw error;
  }
}

/**
 * 执行所有待执行的迁移
 */
async function migrate() {
  console.log('🚀 开始数据库迁移...\n');
  
  let connection;
  
  try {
    // 连接数据库
    console.log('📡 连接数据库...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ai_family_photo',
      multipleStatements: true
    });
    console.log('✅ 数据库连接成功\n');
    
    // 创建迁移记录表
    await createMigrationsTable(connection);
    
    // 获取已应用的迁移
    const appliedMigrations = await getAppliedMigrations(connection);
    console.log(`📋 已应用的迁移: ${appliedMigrations.length} 个`);
    if (appliedMigrations.length > 0) {
      appliedMigrations.forEach(m => console.log(`   - ${m}`));
    }
    
    // 获取待执行的迁移
    const pendingMigrations = getPendingMigrations(appliedMigrations);
    
    if (pendingMigrations.length === 0) {
      console.log('\n✅ 没有待执行的迁移，数据库已是最新状态！');
      return;
    }
    
    console.log(`\n📦 待执行的迁移: ${pendingMigrations.length} 个`);
    pendingMigrations.forEach(m => console.log(`   - ${m}`));
    
    // 执行迁移
    for (const migration of pendingMigrations) {
      await runMigration(connection, migration);
    }
    
    console.log('\n✅ 所有迁移执行完成！\n');
    
    // 显示当前表结构
    console.log('📋 当前数据库表:');
    const [tables] = await connection.query('SHOW TABLES');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`   - ${tableName}`);
    });
    console.log('');
    
  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    console.error('\n💡 可能的原因:');
    console.error('   1. MySQL服务未启动 (请运行 docker-compose up -d)');
    console.error('   2. 数据库配置错误 (检查 .env 文件)');
    console.error('   3. SQL语法错误 (检查迁移文件)\n');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * 显示迁移状态
 */
async function status() {
  console.log('📊 数据库迁移状态\n');
  
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ai_family_photo'
    });
    
    await createMigrationsTable(connection);
    
    const appliedMigrations = await getAppliedMigrations(connection);
    const pendingMigrations = getPendingMigrations(appliedMigrations);
    
    console.log(`✅ 已应用: ${appliedMigrations.length} 个迁移`);
    appliedMigrations.forEach(m => console.log(`   - ${m}`));
    
    console.log(`\n⏳ 待执行: ${pendingMigrations.length} 个迁移`);
    pendingMigrations.forEach(m => console.log(`   - ${m}`));
    
    console.log('');
    
  } catch (error) {
    console.error('❌ 获取状态失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 命令行参数处理
const command = process.argv[2];

if (command === 'status') {
  status();
} else {
  migrate();
}
