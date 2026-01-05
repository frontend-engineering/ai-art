#!/usr/bin/env node

/**
 * 数据库验证脚本
 * 检查所有表结构和字段是否符合代码需求
 */

require('dotenv').config();
const db = require('../db/connection');

// 期望的表结构
const EXPECTED_TABLES = {
  users: [
    'id', 'payment_status', 'regenerate_count',
    'created_at', 'updated_at'
  ],
  generation_history: [
    'id', 'user_id', 'task_ids', 'original_image_urls', 
    'template_url', 'generated_image_urls', 'selected_image_url',
    'status', 'created_at', 'updated_at'
  ],
  payment_orders: [
    'id', 'user_id', 'generation_id', 'amount', 'package_type',
    'payment_method', 'transaction_id', 'status', 
    'created_at', 'updated_at'
  ],
  product_orders: [
    'id', 'user_id', 'generation_id', 'product_type', 'product_price',
    'shipping_name', 'shipping_phone', 'shipping_address',
    'status', 'created_at', 'updated_at'
  ]
};

async function verifyDatabase() {
  console.log('🔍 开始验证数据库结构...\n');
  
  try {
    // 测试连接
    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error('数据库连接失败');
    }
    
    // 获取所有表
    const tables = await db.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    
    console.log(`📋 找到 ${tableNames.length} 个表:\n`);
    
    let allValid = true;
    
    // 验证每个表
    for (const [tableName, expectedColumns] of Object.entries(EXPECTED_TABLES)) {
      console.log(`检查表: ${tableName}`);
      
      // 检查表是否存在
      if (!tableNames.includes(tableName)) {
        console.log(`  ❌ 表不存在\n`);
        allValid = false;
        continue;
      }
      
      // 获取表结构
      const columns = await db.query(`DESCRIBE ${tableName}`);
      const columnNames = columns.map(c => c.Field);
      
      // 检查字段
      const missingColumns = expectedColumns.filter(col => !columnNames.includes(col));
      const extraColumns = columnNames.filter(col => !expectedColumns.includes(col));
      
      if (missingColumns.length === 0 && extraColumns.length === 0) {
        console.log(`  ✅ 所有字段正确 (${columnNames.length}个字段)`);
      } else {
        if (missingColumns.length > 0) {
          console.log(`  ❌ 缺少字段: ${missingColumns.join(', ')}`);
          allValid = false;
        }
        if (extraColumns.length > 0) {
          console.log(`  ⚠️  额外字段: ${extraColumns.join(', ')}`);
        }
      }
      
      // 显示字段详情
      console.log(`  字段列表:`);
      columns.forEach(col => {
        const nullable = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
        const key = col.Key ? `[${col.Key}]` : '';
        console.log(`    - ${col.Field}: ${col.Type} ${nullable} ${key}`);
      });
      console.log('');
    }
    
    // 检查外键约束
    console.log('🔗 检查外键约束:\n');
    const foreignKeys = await db.query(`
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        CONSTRAINT_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [process.env.DB_NAME || 'ai_family_photo']);
    
    if (foreignKeys.length > 0) {
      foreignKeys.forEach(fk => {
        console.log(`  ✅ ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      });
    } else {
      console.log('  ⚠️  未找到外键约束');
    }
    console.log('');
    
    // 检查索引
    console.log('📇 检查索引:\n');
    for (const tableName of Object.keys(EXPECTED_TABLES)) {
      const indexes = await db.query(`SHOW INDEX FROM ${tableName}`);
      const indexNames = [...new Set(indexes.map(i => i.Key_name))];
      console.log(`  ${tableName}: ${indexNames.length}个索引 (${indexNames.join(', ')})`);
    }
    console.log('');
    
    if (allValid) {
      console.log('✅ 数据库结构验证通过！\n');
      process.exit(0);
    } else {
      console.log('❌ 数据库结构验证失败，请运行 pnpm run db:init 初始化数据库\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    process.exit(1);
  } finally {
    await db.closePool();
  }
}

verifyDatabase();
