#!/usr/bin/env node

/**
 * 数据库索引验证脚本
 * 验证所有必需的索引已创建，并分析查询性能
 */

require('dotenv').config();
const db = require('../db/connection');

/**
 * 获取表的所有索引
 */
async function getTableIndexes(connection, tableName) {
  const [indexes] = await connection.execute(
    `SHOW INDEX FROM ${tableName}`
  );
  return indexes;
}

/**
 * 验证索引是否存在
 */
function verifyIndex(indexes, indexName, columnName) {
  const found = indexes.find(idx => 
    idx.Key_name === indexName && idx.Column_name === columnName
  );
  return !!found;
}

/**
 * 分析查询性能
 */
async function analyzeQuery(connection, query) {
  const [result] = await connection.execute(`EXPLAIN ${query}`);
  return result;
}

/**
 * 验证所有索引
 */
async function verifyAllIndexes() {
  console.log('🔍 开始验证数据库索引...\n');
  
  const connection = await db.pool.getConnection();
  
  try {
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      details: []
    };
    
    // 1. 验证 users 表索引
    console.log('📊 验证 users 表索引...');
    const usersIndexes = await getTableIndexes(connection, 'users');
    
    const usersChecks = [
      { name: 'idx_invite_code', column: 'invite_code' },
      { name: 'idx_has_ever_paid', column: 'has_ever_paid' }
    ];
    
    for (const check of usersChecks) {
      results.total++;
      const exists = verifyIndex(usersIndexes, check.name, check.column);
      if (exists) {
        results.passed++;
        console.log(`   ✅ ${check.name} (${check.column})`);
      } else {
        results.failed++;
        console.log(`   ❌ ${check.name} (${check.column}) - 缺失`);
        results.details.push(`users.${check.name} 缺失`);
      }
    }
    console.log('');
    
    // 2. 验证 invite_records 表索引
    console.log('📊 验证 invite_records 表索引...');
    const inviteRecordsIndexes = await getTableIndexes(connection, 'invite_records');
    
    const inviteRecordsChecks = [
      { name: 'idx_inviter_id', column: 'inviter_id' },
      { name: 'idx_invitee_id', column: 'invitee_id' },
      { name: 'idx_invite_code', column: 'invite_code' },
      { name: 'idx_created_at', column: 'created_at' }
    ];
    
    for (const check of inviteRecordsChecks) {
      results.total++;
      const exists = verifyIndex(inviteRecordsIndexes, check.name, check.column);
      if (exists) {
        results.passed++;
        console.log(`   ✅ ${check.name} (${check.column})`);
      } else {
        results.failed++;
        console.log(`   ❌ ${check.name} (${check.column}) - 缺失`);
        results.details.push(`invite_records.${check.name} 缺失`);
      }
    }
    console.log('');
    
    // 3. 验证 usage_logs 表索引
    console.log('📊 验证 usage_logs 表索引...');
    const usageLogsIndexes = await getTableIndexes(connection, 'usage_logs');
    
    const usageLogsChecks = [
      { name: 'idx_user_id', column: 'user_id' },
      { name: 'idx_action_type', column: 'action_type' },
      { name: 'idx_reason', column: 'reason' },
      { name: 'idx_created_at', column: 'created_at' },
      { name: 'idx_reference_id', column: 'reference_id' }
    ];
    
    for (const check of usageLogsChecks) {
      results.total++;
      const exists = verifyIndex(usageLogsIndexes, check.name, check.column);
      if (exists) {
        results.passed++;
        console.log(`   ✅ ${check.name} (${check.column})`);
      } else {
        results.failed++;
        console.log(`   ❌ ${check.name} (${check.column}) - 缺失`);
        results.details.push(`usage_logs.${check.name} 缺失`);
      }
    }
    console.log('');
    
    // 4. 分析关键查询性能
    console.log('⚡ 分析关键查询性能...\n');
    
    const queries = [
      {
        name: '查询用户使用次数',
        sql: 'SELECT usage_count, has_ever_paid FROM users WHERE id = "test-user-id"'
      },
      {
        name: '验证邀请码',
        sql: 'SELECT id, nickname FROM users WHERE invite_code = "TEST1234"'
      },
      {
        name: '查询邀请记录',
        sql: 'SELECT * FROM invite_records WHERE inviter_id = "test-user-id" ORDER BY created_at DESC LIMIT 20'
      },
      {
        name: '查询使用历史',
        sql: 'SELECT * FROM usage_logs WHERE user_id = "test-user-id" ORDER BY created_at DESC LIMIT 20'
      }
    ];
    
    for (const query of queries) {
      console.log(`📝 ${query.name}:`);
      console.log(`   SQL: ${query.sql.substring(0, 80)}...`);
      
      try {
        const explain = await analyzeQuery(connection, query.sql);
        const firstRow = explain[0];
        
        if (firstRow) {
          console.log(`   类型: ${firstRow.type}`);
          console.log(`   可能的键: ${firstRow.possible_keys || '无'}`);
          console.log(`   使用的键: ${firstRow.key || '无'}`);
          console.log(`   扫描行数: ${firstRow.rows || 'N/A'}`);
          
          if (firstRow.type === 'ALL') {
            console.log(`   ⚠️  警告: 全表扫描，可能需要优化`);
          } else if (firstRow.key) {
            console.log(`   ✅ 使用索引，性能良好`);
          }
        }
      } catch (error) {
        console.log(`   ⚠️  无法分析: ${error.message}`);
      }
      console.log('');
    }
    
    // 5. 显示统计结果
    console.log('📊 验证统计:');
    console.log(`   ✅ 通过: ${results.passed}/${results.total}`);
    console.log(`   ❌ 失败: ${results.failed}/${results.total}`);
    console.log('');
    
    if (results.failed > 0) {
      console.log('❌ 索引验证失败，缺失的索引:');
      results.details.forEach(detail => console.log(`   - ${detail}`));
      console.log('\n💡 请运行数据库迁移创建缺失的索引:');
      console.log('   cd backend && pnpm run migrate\n');
      process.exit(1);
    } else {
      console.log('✅ 所有索引验证通过！\n');
      console.log('📝 性能优化建议:');
      console.log('   1. 定期使用 ANALYZE TABLE 更新统计信息');
      console.log('   2. 监控慢查询日志');
      console.log('   3. 考虑为高频查询添加复合索引\n');
    }
    
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    console.error('\n💡 可能的原因:');
    console.error('   1. 数据库连接失败');
    console.error('   2. 表不存在（请先运行迁移）');
    console.error('   3. 权限不足\n');
    process.exit(1);
  } finally {
    connection.release();
    await db.closePool();
  }
}

// 执行验证
verifyAllIndexes();
