#!/usr/bin/env node

/**
 * 使用次数系统数据初始化脚本
 * 为现有用户初始化 usage_count、invite_code 和 has_ever_paid
 */

require('dotenv').config();
const db = require('../db/connection');
const crypto = require('crypto');

/**
 * 生成8位邀请码（字母数字组合）
 */
function generateInviteCode() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * 检查邀请码是否已存在
 */
async function isInviteCodeUnique(connection, inviteCode) {
  const [rows] = await connection.execute(
    'SELECT id FROM users WHERE invite_code = ?',
    [inviteCode]
  );
  return rows.length === 0;
}

/**
 * 为用户生成唯一邀请码
 */
async function generateUniqueInviteCode(connection) {
  let inviteCode;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (!isUnique && attempts < maxAttempts) {
    inviteCode = generateInviteCode();
    isUnique = await isInviteCodeUnique(connection, inviteCode);
    attempts++;
  }
  
  if (!isUnique) {
    throw new Error('无法生成唯一邀请码');
  }
  
  return inviteCode;
}

/**
 * 检查用户是否曾经付费
 */
async function hasUserEverPaid(connection, userId) {
  const [rows] = await connection.execute(
    `SELECT id FROM payment_orders 
     WHERE user_id = ? AND status = 'paid' 
     LIMIT 1`,
    [userId]
  );
  return rows.length > 0;
}

/**
 * 初始化现有用户数据
 */
async function initializeExistingUsers() {
  console.log('🚀 开始初始化使用次数系统数据...\n');
  
  const connection = await db.pool.getConnection();
  
  try {
    // 1. 获取所有需要初始化的用户
    console.log('📊 查询需要初始化的用户...');
    const [users] = await connection.execute(
      `SELECT id, openid, nickname 
       FROM users 
       WHERE usage_count IS NULL OR invite_code IS NULL`
    );
    
    if (users.length === 0) {
      console.log('✅ 所有用户已初始化，无需处理\n');
      return;
    }
    
    console.log(`📝 找到 ${users.length} 个需要初始化的用户\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // 2. 逐个处理用户
    for (const user of users) {
      try {
        await connection.beginTransaction();
        
        // 生成唯一邀请码
        const inviteCode = await generateUniqueInviteCode(connection);
        
        // 检查是否曾经付费
        const hasEverPaid = await hasUserEverPaid(connection, user.id);
        
        // 更新用户数据
        await connection.execute(
          `UPDATE users 
           SET usage_count = COALESCE(usage_count, 3),
               invite_code = COALESCE(invite_code, ?),
               has_ever_paid = COALESCE(has_ever_paid, ?)
           WHERE id = ?`,
          [inviteCode, hasEverPaid, user.id]
        );
        
        // 创建邀请统计记录
        await connection.execute(
          `INSERT INTO invite_stats (user_id, total_invites, successful_invites, total_rewards)
           VALUES (?, 0, 0, 0)
           ON DUPLICATE KEY UPDATE user_id = user_id`,
          [user.id]
        );
        
        await connection.commit();
        
        successCount++;
        console.log(`✅ [${successCount}/${users.length}] 用户 ${user.nickname || user.id.substring(0, 8)} 初始化成功`);
        console.log(`   - 邀请码: ${inviteCode}`);
        console.log(`   - 使用次数: 3`);
        console.log(`   - 付费状态: ${hasEverPaid ? '已付费' : '免费用户'}\n`);
        
      } catch (error) {
        await connection.rollback();
        errorCount++;
        console.error(`❌ 用户 ${user.id} 初始化失败:`, error.message);
      }
    }
    
    // 3. 显示统计信息
    console.log('\n📊 初始化统计:');
    console.log(`   ✅ 成功: ${successCount}`);
    console.log(`   ❌ 失败: ${errorCount}`);
    console.log(`   📝 总计: ${users.length}\n`);
    
    // 4. 验证初始化结果
    console.log('🔍 验证初始化结果...');
    const [verifyUsers] = await connection.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN usage_count IS NOT NULL THEN 1 ELSE 0 END) as with_usage_count,
        SUM(CASE WHEN invite_code IS NOT NULL THEN 1 ELSE 0 END) as with_invite_code,
        SUM(CASE WHEN has_ever_paid = TRUE THEN 1 ELSE 0 END) as paid_users
       FROM users`
    );
    
    const stats = verifyUsers[0];
    console.log(`   总用户数: ${stats.total}`);
    console.log(`   已设置使用次数: ${stats.with_usage_count}`);
    console.log(`   已设置邀请码: ${stats.with_invite_code}`);
    console.log(`   付费用户: ${stats.paid_users}\n`);
    
    if (stats.with_usage_count === stats.total && stats.with_invite_code === stats.total) {
      console.log('✅ 所有用户数据初始化完成！\n');
    } else {
      console.log('⚠️  部分用户数据未完全初始化，请检查错误日志\n');
    }
    
    console.log('📝 下一步:');
    console.log('   1. 运行数据库迁移: cd backend && pnpm run migrate');
    console.log('   2. 运行测试: cd backend && pnpm test');
    console.log('   3. 启动服务器: cd backend && pnpm run dev\n');
    
  } catch (error) {
    console.error('❌ 初始化失败:', error.message);
    console.error('\n💡 可能的原因:');
    console.error('   1. 数据库连接失败');
    console.error('   2. 表结构未创建（请先运行迁移）');
    console.error('   3. 权限不足\n');
    process.exit(1);
  } finally {
    connection.release();
    await db.closePool();
  }
}

// 执行初始化
initializeExistingUsers();
