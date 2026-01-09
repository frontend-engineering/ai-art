/**
 * 腾讯云 CloudBase MySQL 数据库初始化脚本
 * 
 * 功能：
 * 1. 连接到云托管 MySQL 数据库
 * 2. 创建数据库（如果不存在）
 * 3. 执行 schema.sql 创建表结构
 * 4. 验证表创建成功
 * 
 * 使用方法：
 * node scripts/init-cloudbase-db.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// 数据库配置
const DB_CONFIG = {
  host: '10.2.101.92',
  port: 3306,
  user: 'root',
  password: '', // 需要在运行时提供
  multipleStatements: true, // 允许执行多条 SQL 语句
  charset: 'utf8mb4'
};

const DB_NAME = 'test-1g71tc7eb37627e2';

/**
 * 从环境变量或命令行参数获取密码
 */
function getPassword() {
  // 优先从环境变量获取
  if (process.env.DB_PASSWORD) {
    return process.env.DB_PASSWORD;
  }
  
  // 从命令行参数获取
  const passwordArg = process.argv.find(arg => arg.startsWith('--password='));
  if (passwordArg) {
    return passwordArg.split('=')[1];
  }
  
  console.error('❌ 错误: 未提供数据库密码');
  console.error('');
  console.error('请使用以下方式之一提供密码:');
  console.error('  1. 环境变量: DB_PASSWORD=your_password node scripts/init-cloudbase-db.js');
  console.error('  2. 命令行参数: node scripts/init-cloudbase-db.js --password=your_password');
  console.error('');
  process.exit(1);
}

/**
 * 读取 SQL 文件
 */
async function readSQLFile(filename) {
  const filePath = path.join(__dirname, '..', 'db', filename);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    console.error(`❌ 读取 SQL 文件失败: ${filename}`);
    throw error;
  }
}

/**
 * 处理 SQL 语句
 * 移除注释，分割语句
 */
function processSQLStatements(sql) {
  // 移除单行注释
  sql = sql.replace(/--.*$/gm, '');
  
  // 移除多行注释
  sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // 分割语句（按分号分割，但保留 CREATE DATABASE 和 USE 语句）
  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0)
    .map(stmt => stmt + ';');
  
  return statements;
}

/**
 * 执行 SQL 语句
 */
async function executeSQL(connection, sql, description) {
  try {
    console.log(`📝 ${description}...`);
    await connection.query(sql);
    console.log(`✅ ${description} 成功`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} 失败:`, error.message);
    return false;
  }
}

/**
 * 验证表是否存在
 */
async function verifyTables(connection, dbName) {
  console.log('');
  console.log('🔍 验证表结构...');
  
  const [tables] = await connection.query(
    'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
    [dbName]
  );
  
  const expectedTables = [
    'users',
    'generation_history',
    'payment_orders',
    'product_orders',
    'greeting_cards'
  ];
  
  console.log('');
  console.log('📊 数据库表列表:');
  tables.forEach(table => {
    const tableName = table.TABLE_NAME;
    const isExpected = expectedTables.includes(tableName);
    console.log(`  ${isExpected ? '✅' : '⚠️ '} ${tableName}`);
  });
  
  const missingTables = expectedTables.filter(
    table => !tables.some(t => t.TABLE_NAME === table)
  );
  
  if (missingTables.length > 0) {
    console.log('');
    console.log('⚠️  缺少以下表:');
    missingTables.forEach(table => console.log(`  - ${table}`));
    return false;
  }
  
  console.log('');
  console.log('✅ 所有表创建成功！');
  return true;
}

/**
 * 获取表的详细信息
 */
async function showTableInfo(connection, dbName) {
  console.log('');
  console.log('📋 表结构详情:');
  console.log('');
  
  const [tables] = await connection.query(
    'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
    [dbName]
  );
  
  for (const table of tables) {
    const tableName = table.TABLE_NAME;
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_COMMENT 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? 
       ORDER BY ORDINAL_POSITION`,
      [dbName, tableName]
    );
    
    console.log(`📄 ${tableName} (${columns.length} 列)`);
    columns.forEach(col => {
      const key = col.COLUMN_KEY ? `[${col.COLUMN_KEY}]` : '';
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`   - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${nullable} ${key}`);
    });
    console.log('');
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('🚀 CloudBase MySQL 数据库初始化');
  console.log('========================================');
  console.log('');
  
  // 获取密码
  const password = getPassword();
  DB_CONFIG.password = password;
  
  console.log('📦 数据库配置:');
  console.log(`   主机: ${DB_CONFIG.host}`);
  console.log(`   端口: ${DB_CONFIG.port}`);
  console.log(`   用户: ${DB_CONFIG.user}`);
  console.log(`   数据库: ${DB_NAME}`);
  console.log('');
  
  let connection;
  
  try {
    // 1. 连接到 MySQL（不指定数据库）
    console.log('🔌 连接到 MySQL 服务器...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ 连接成功');
    console.log('');
    
    // 2. 创建数据库（如果不存在）
    await executeSQL(
      connection,
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` 
       DEFAULT CHARACTER SET utf8mb4 
       DEFAULT COLLATE utf8mb4_unicode_ci`,
      '创建数据库'
    );
    
    // 3. 切换到目标数据库
    await executeSQL(
      connection,
      `USE \`${DB_NAME}\``,
      '切换数据库'
    );
    
    console.log('');
    
    // 4. 读取并执行 schema.sql
    console.log('📖 读取 schema.sql...');
    const schemaSql = await readSQLFile('schema.sql');
    
    // 处理 SQL 语句
    const statements = processSQLStatements(schemaSql);
    console.log(`📝 找到 ${statements.length} 条 SQL 语句`);
    console.log('');
    
    // 执行每条语句
    let successCount = 0;
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      // 跳过 CREATE DATABASE 和 USE 语句（已经执行过）
      if (stmt.includes('CREATE DATABASE') || stmt.match(/^USE\s+/i)) {
        continue;
      }
      
      // 提取表名用于显示
      const tableMatch = stmt.match(/CREATE TABLE.*?`?(\w+)`?\s*\(/i);
      const tableName = tableMatch ? tableMatch[1] : `语句 ${i + 1}`;
      
      const success = await executeSQL(
        connection,
        stmt,
        `创建表 ${tableName}`
      );
      
      if (success) successCount++;
    }
    
    console.log('');
    console.log(`✅ 成功执行 ${successCount} 条语句`);
    
    // 5. 验证表结构
    const verified = await verifyTables(connection, DB_NAME);
    
    // 6. 显示表详情
    if (verified) {
      await showTableInfo(connection, DB_NAME);
    }
    
    console.log('========================================');
    console.log('✅ 数据库初始化完成！');
    console.log('========================================');
    console.log('');
    console.log('📋 后续步骤:');
    console.log('  1. 在云托管环境变量中配置数据库连接:');
    console.log(`     DB_HOST=${DB_CONFIG.host}`);
    console.log(`     DB_PORT=${DB_CONFIG.port}`);
    console.log(`     DB_USER=${DB_CONFIG.user}`);
    console.log(`     DB_PASSWORD=your_password`);
    console.log(`     DB_NAME=${DB_NAME}`);
    console.log('');
    console.log('  2. 部署云托管服务');
    console.log('  3. 测试数据库连接');
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('❌ 初始化失败');
    console.error('========================================');
    console.error('');
    console.error('错误信息:', error.message);
    console.error('');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 提示: 无法连接到数据库服务器');
      console.error('   - 检查数据库地址和端口是否正确');
      console.error('   - 确认数据库服务是否已启动');
      console.error('   - 检查网络连接');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 提示: 数据库认证失败');
      console.error('   - 检查用户名和密码是否正确');
      console.error('   - 确认用户是否有足够的权限');
    }
    
    console.error('');
    process.exit(1);
    
  } finally {
    // 关闭连接
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
      console.log('');
    }
  }
}

// 运行主函数
main().catch(error => {
  console.error('未捕获的错误:', error);
  process.exit(1);
});
