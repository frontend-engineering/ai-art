/**
 * 重置用户使用次数脚本
 * 用于开发调试时快速恢复使用次数
 * 
 * 使用方法：
 * node backend/scripts/reset-usage-count.js [userId] [count]
 * 
 * 示例：
 * node backend/scripts/reset-usage-count.js user123 10
 * node backend/scripts/reset-usage-count.js all 10  # 重置所有用户
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../db/connection');

/**
 * 重置指定用户的使用次数
 * @param {string} userId - 用户ID，或 'all' 表示所有用户
 * @param {number} count - 要设置的使用次数，默认 10
 */
async function resetUsageCount(userId, count = 10) {
  let connection;
  try {
    console.log('连接数据库...');
    connection = await db.pool.getConnection();
    
    if (userId === 'all') {
      // 重置所有用户
      const [result] = await connection.query(
        'UPDATE users SET usage_count = ? WHERE 1=1',
        [count]
      );
      
      console.log(`✅ 成功重置所有用户的使用次数为 ${count}`);
      console.log(`   影响行数: ${result.affectedRows}`);
    } else {
      // 重置指定用户
      const [result] = await connection.query(
        'UPDATE users SET usage_count = ? WHERE user_id = ?',
        [count, userId]
      );
      
      if (result.affectedRows === 0) {
        console.log(`❌ 用户 ${userId} 不存在`);
      } else {
        console.log(`✅ 成功重置用户 ${userId} 的使用次数为 ${count}`);
      }
    }
    
    // 查询当前状态
    if (userId !== 'all') {
      const [users] = await connection.query(
        'SELECT user_id, usage_count, user_type FROM users WHERE user_id = ?',
        [userId]
      );
      
      if (users.length > 0) {
        console.log('\n当前状态:');
        console.log(`  用户ID: ${users[0].user_id}`);
        console.log(`  剩余次数: ${users[0].usage_count}`);
        console.log(`  用户类型: ${users[0].user_type}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 重置失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * 列出所有用户及其使用次数
 */
async function listUsers() {
  let connection;
  try {
    console.log('连接数据库...');
    connection = await db.pool.getConnection();
    
    const [users] = await connection.query(
      'SELECT user_id, usage_count, user_type, created_at FROM users ORDER BY created_at DESC LIMIT 20'
    );
    
    if (users.length === 0) {
      console.log('❌ 没有找到任何用户');
      return;
    }
    
    console.log('\n最近的用户列表:');
    console.log('─'.repeat(80));
    console.log('用户ID'.padEnd(30) + '剩余次数'.padEnd(15) + '用户类型'.padEnd(15) + '创建时间');
    console.log('─'.repeat(80));
    
    users.forEach(user => {
      const userId = user.user_id.padEnd(30);
      const count = String(user.usage_count).padEnd(15);
      const type = user.user_type.padEnd(15);
      const date = new Date(user.created_at).toLocaleString('zh-CN');
      console.log(`${userId}${count}${type}${date}`);
    });
    
    console.log('─'.repeat(80));
    console.log(`\n总计: ${users.length} 个用户`);
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  // 显示帮助信息
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
使用次数重置工具

用法:
  node backend/scripts/reset-usage-count.js <userId> [count]
  node backend/scripts/reset-usage-count.js --list

参数:
  userId    用户ID，或使用 'all' 重置所有用户
  count     要设置的使用次数，默认 10

选项:
  --list    列出所有用户及其使用次数
  --help    显示此帮助信息

示例:
  # 重置指定用户的使用次数为 10
  node backend/scripts/reset-usage-count.js user123 10

  # 重置指定用户的使用次数为 100
  node backend/scripts/reset-usage-count.js user123 100

  # 重置所有用户的使用次数为 10
  node backend/scripts/reset-usage-count.js all 10

  # 列出所有用户
  node backend/scripts/reset-usage-count.js --list
    `);
    process.exit(0);
  }
  
  // 列出用户
  if (args[0] === '--list' || args[0] === '-l') {
    await listUsers();
    process.exit(0);
  }
  
  // 重置使用次数
  const userId = args[0];
  const count = args[1] ? parseInt(args[1]) : 10;
  
  if (isNaN(count) || count < 0) {
    console.error('❌ 错误: count 必须是非负整数');
    process.exit(1);
  }
  
  await resetUsageCount(userId, count);
}

// 执行
main().catch(error => {
  console.error('执行失败:', error);
  process.exit(1);
});
