#!/usr/bin/env node

/**
 * 数据库迁移执行脚本
 * 执行所有待执行的数据库迁移
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../db/connection');

const MIGRATIONS_DIR = path.join(__dirname, '../db/migrations');

async function runMigrations() {
  console.log('🚀 开始执行数据库迁移...\n');
  
  let connection;
  
  try {
    connection = await db.pool.getConnection();
    
    // 读取所有迁移文件
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    if (files.length === 0) {
      console.log('✅ 没有待执行的迁移文件');
      return;
    }
    
    console.log(`📋 找到 ${files.length} 个迁移文件:\n`);
    
    for (const file of files) {
      console.log(`⏳ 执行迁移: ${file}`);
      
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // 分割SQL语句（按分号分割）
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        try {
          await connection.query(statement);
        } catch (error) {
          // 如果是表已存在的错误，忽略
          if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log(`   ⚠️  表已存在，跳过`);
          } else {
            throw error;
          }
        }
      }
      
      console.log(`   ✅ 完成\n`);
    }
    
    console.log('✅ 所有迁移执行完成！\n');
    
  } catch (error) {
    console.error('❌ 迁移执行失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
    await db.pool.end();
  }
}

// 执行迁移
runMigrations();
