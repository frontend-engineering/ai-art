/**
 * 重置用户使用次数脚本
 * 用于开发调试时快速修改使用次数
 * 
 * 使用方法：
 * node backend/scripts/reset-usage-count.js [userId] [count]
 * node backend/scripts/reset-usage-count.js --list
 * node backend/scripts/reset-usage-count.js --interactive
 * 
 * 示例：
 * node backend/scripts/reset-usage-count.js user123 100
 * node backend/scripts/reset-usage-count.js all 50
 * node backend/scripts/reset-usage-count.js --list
 * node backend/scripts/reset-usage-count.js -i
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../db/connection');
const readline = require('readline');

/**
 * 创建交互式输入接口
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * 提问并获取答案
 */
function question(rl, query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * 重置指定用户的使用次数
 * @param {string} userId - 用户ID，或 'all' 表示所有用户
 * @param {number} count - 要设置的使用次数
 */
async function resetUsageCount(userId, count) {
  let connection;
  try {
    console.log('\n🔄 连接数据库...');
    connection = await db.pool.getConnection();
    
    if (userId === 'all') {
      // 重置所有用户
      const [result] = await connection.query(
        'UPDATE users SET usage_count = ? WHERE 1=1',
        [count]
      );
      
      console.log(`\n✅ 成功重置所有用户的使用次数为 ${count}`);
      console.log(`   影响行数: ${result.affectedRows}`);
      
      // 显示统计
      const [stats] = await connection.query(
        'SELECT COUNT(*) as total, SUM(usage_count) as total_count FROM users'
      );
      console.log(`\n📊 当前统计:`);
      console.log(`   总用户数: ${stats[0].total}`);
      console.log(`   总使用次数: ${stats[0].total_count}`);
      
    } else {
      // 重置指定用户
      const [result] = await connection.query(
        'UPDATE users SET usage_count = ? WHERE id = ?',
        [count, userId]
      );
      
      if (result.affectedRows === 0) {
        console.log(`\n❌ 用户 ${userId} 不存在`);
        console.log(`\n💡 提示: 使用 --list 查看所有用户`);
        return false;
      } else {
        console.log(`\n✅ 成功重置用户的使用次数为 ${count}`);
      }
      
      // 查询当前状态
      const [users] = await connection.query(
        'SELECT id, openid, nickname, usage_count, has_ever_paid, created_at FROM users WHERE id = ?',
        [userId]
      );
      
      if (users.length > 0) {
        const user = users[0];
        console.log(`\n📋 用户信息:`);
        console.log(`   用户ID: ${user.id}`);
        console.log(`   OpenID: ${user.openid || '未设置'}`);
        console.log(`   昵称: ${user.nickname || '未设置'}`);
        console.log(`   剩余次数: ${user.usage_count}`);
        console.log(`   付费状态: ${user.has_ever_paid ? '已付费' : '免费用户'}`);
        console.log(`   创建时间: ${new Date(user.created_at).toLocaleString('zh-CN')}`);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('\n❌ 重置失败:', error.message);
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
async function listUsers(limit = 20) {
  let connection;
  try {
    console.log('\n🔄 连接数据库...');
    connection = await db.pool.getConnection();
    
    // 获取总数
    const [countResult] = await connection.query(
      'SELECT COUNT(*) as total FROM users'
    );
    const total = countResult[0].total;
    
    // 获取用户列表
    const [users] = await connection.query(
      `SELECT id, openid, nickname, usage_count, has_ever_paid, created_at 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [limit]
    );
    
    if (users.length === 0) {
      console.log('\n❌ 没有找到任何用户');
      return;
    }
    
    console.log(`\n📋 用户列表 (显示最近 ${users.length} 个，共 ${total} 个):`);
    console.log('═'.repeat(100));
    console.log(
      '序号'.padEnd(6) + 
      '用户ID'.padEnd(38) + 
      '昵称'.padEnd(15) + 
      '次数'.padEnd(8) + 
      '状态'.padEnd(10) + 
      '创建时间'
    );
    console.log('═'.repeat(100));
    
    users.forEach((user, index) => {
      const num = String(index + 1).padEnd(6);
      const id = user.id.substring(0, 36).padEnd(38);
      const nickname = (user.nickname || '未设置').substring(0, 12).padEnd(15);
      const count = String(user.usage_count || 0).padEnd(8);
      const status = (user.has_ever_paid ? '已付费' : '免费').padEnd(10);
      const date = new Date(user.created_at).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      console.log(`${num}${id}${nickname}${count}${status}${date}`);
    });
    
    console.log('═'.repeat(100));
    
    // 显示统计
    const [stats] = await connection.query(
      `SELECT 
        COUNT(*) as total_users,
        SUM(usage_count) as total_count,
        AVG(usage_count) as avg_count,
        SUM(CASE WHEN has_ever_paid = 1 THEN 1 ELSE 0 END) as paid_users
       FROM users`
    );
    
    console.log(`\n📊 统计信息:`);
    console.log(`   总用户数: ${stats[0].total_users}`);
    console.log(`   付费用户: ${stats[0].paid_users}`);
    console.log(`   总使用次数: ${stats[0].total_count}`);
    console.log(`   平均次数: ${parseFloat(stats[0].avg_count).toFixed(2)}`);
    
    return users;
    
  } catch (error) {
    console.error('\n❌ 查询失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * 交互式模式
 */
async function interactiveMode() {
  const rl = createInterface();
  
  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   使用次数管理工具 - 交互式模式      ║');
    console.log('╚════════════════════════════════════════╝');
    
    // 先列出用户
    const users = await listUsers(10);
    
    if (!users || users.length === 0) {
      console.log('\n没有用户可以修改');
      rl.close();
      return;
    }
    
    console.log('\n请选择操作:');
    console.log('  1. 修改指定用户的使用次数');
    console.log('  2. 修改所有用户的使用次数');
    console.log('  3. 查看更多用户');
    console.log('  0. 退出');
    
    const choice = await question(rl, '\n请输入选项 (0-3): ');
    
    if (choice === '0') {
      console.log('\n👋 再见！');
      rl.close();
      return;
    }
    
    if (choice === '3') {
      const limit = await question(rl, '\n显示多少个用户? (默认50): ');
      await listUsers(parseInt(limit) || 50);
      rl.close();
      return;
    }
    
    if (choice === '1') {
      const userId = await question(rl, '\n请输入用户ID: ');
      if (!userId.trim()) {
        console.log('\n❌ 用户ID不能为空');
        rl.close();
        return;
      }
      
      const count = await question(rl, '请输入新的使用次数: ');
      const countNum = parseInt(count);
      
      if (isNaN(countNum) || countNum < 0) {
        console.log('\n❌ 使用次数必须是非负整数');
        rl.close();
        return;
      }
      
      await resetUsageCount(userId.trim(), countNum);
      
    } else if (choice === '2') {
      const count = await question(rl, '\n请输入新的使用次数: ');
      const countNum = parseInt(count);
      
      if (isNaN(countNum) || countNum < 0) {
        console.log('\n❌ 使用次数必须是非负整数');
        rl.close();
        return;
      }
      
      const confirm = await question(rl, `\n⚠️  确认要将所有用户的使用次数设置为 ${countNum} 吗? (yes/no): `);
      
      if (confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
        await resetUsageCount('all', countNum);
      } else {
        console.log('\n❌ 操作已取消');
      }
      
    } else {
      console.log('\n❌ 无效的选项');
    }
    
  } catch (error) {
    console.error('\n❌ 操作失败:', error.message);
  } finally {
    rl.close();
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  // 显示帮助信息
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║           使用次数管理工具 - 帮助文档                    ║
╚════════════════════════════════════════════════════════════╝

用法:
  node backend/scripts/reset-usage-count.js <userId> <count>
  node backend/scripts/reset-usage-count.js --list [limit]
  node backend/scripts/reset-usage-count.js --interactive

参数:
  userId    用户ID（从 --list 获取），或使用 'all' 修改所有用户
  count     要设置的使用次数（必须是非负整数）

选项:
  --list, -l           列出所有用户及其使用次数
  --interactive, -i    进入交互式模式（推荐）
  --help, -h           显示此帮助信息

示例:
  # 交互式模式（推荐，最简单）
  node backend/scripts/reset-usage-count.js -i

  # 列出最近20个用户
  node backend/scripts/reset-usage-count.js --list

  # 列出最近50个用户
  node backend/scripts/reset-usage-count.js --list 50

  # 修改指定用户的使用次数为 100
  node backend/scripts/reset-usage-count.js abc123-def456-ghi789 100

  # 修改所有用户的使用次数为 50
  node backend/scripts/reset-usage-count.js all 50

提示:
  1. 先使用 --list 查看用户ID
  2. 复制用户ID后使用命令修改
  3. 或直接使用 -i 进入交互式模式
    `);
    process.exit(0);
  }
  
  // 交互式模式
  if (args[0] === '--interactive' || args[0] === '-i') {
    await interactiveMode();
    process.exit(0);
  }
  
  // 列出用户
  if (args[0] === '--list' || args[0] === '-l') {
    const limit = args[1] ? parseInt(args[1]) : 20;
    await listUsers(limit);
    process.exit(0);
  }
  
  // 重置使用次数
  const userId = args[0];
  const count = args[1] ? parseInt(args[1]) : null;
  
  if (!userId) {
    console.error('\n❌ 错误: 用户ID不能为空');
    console.log('💡 提示: 使用 --help 查看帮助信息');
    process.exit(1);
  }
  
  if (count === null) {
    console.error('\n❌ 错误: 必须指定使用次数');
    console.log('💡 提示: node backend/scripts/reset-usage-count.js <userId> <count>');
    process.exit(1);
  }
  
  if (isNaN(count) || count < 0) {
    console.error('\n❌ 错误: 使用次数必须是非负整数');
    process.exit(1);
  }
  
  const success = await resetUsageCount(userId, count);
  process.exit(success ? 0 : 1);
}

// 执行
main()
  .then(() => {
    db.closePool();
  })
  .catch(error => {
    console.error('\n💥 执行失败:', error.message);
    db.closePool();
    process.exit(1);
  });
