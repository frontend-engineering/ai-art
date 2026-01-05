#!/usr/bin/env node

/**
 * 数据库初始化脚本
 * 创建数据库和所有表
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function initDatabase() {
  console.log('🚀 开始初始化数据库...\n');
  
  let connection;
  
  try {
    // 1. 连接MySQL服务器 (不指定数据库)
    console.log('📡 连接MySQL服务器...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });
    console.log('✅ MySQL连接成功\n');
    
    // 2. 读取schema文件
    console.log('📖 读取schema文件...');
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('✅ Schema文件读取成功\n');
    
    // 3. 执行schema
    console.log('⚙️  执行数据库初始化...');
    await connection.query(schema);
    console.log('✅ 数据库初始化完成\n');
    
    // 4. 验证表创建
    console.log('🔍 验证表结构...');
    const dbName = process.env.DB_NAME || 'ai_family_photo';
    await connection.query(`USE ${dbName}`);
    
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`✅ 成功创建 ${tables.length} 个表:`);
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`   - ${tableName}`);
    });
    console.log('');
    
    // 5. 显示每个表的结构
    console.log('📋 表结构详情:\n');
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      const [columns] = await connection.query(`DESCRIBE ${tableName}`);
      console.log(`表: ${tableName}`);
      console.log('字段:');
      columns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key ? `[${col.Key}]` : ''}`);
      });
      console.log('');
    }
    
    console.log('✅ 数据库初始化完成！\n');
    console.log('📝 下一步:');
    console.log('   1. 检查 .env 文件中的数据库配置');
    console.log('   2. 运行 pnpm run dev 启动服务器');
    console.log('   3. 运行 pnpm run test:api 测试API端点\n');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    console.error('\n💡 可能的原因:');
    console.error('   1. MySQL服务未启动 (请运行 docker-compose up -d)');
    console.error('   2. 数据库配置错误 (检查 .env 文件)');
    console.error('   3. 权限不足 (检查数据库用户权限)\n');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行初始化
initDatabase();
