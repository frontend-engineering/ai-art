#!/usr/bin/env node

/**
 * CloudBase MySQL 数据库同步工具
 * 用于将本地数据库结构同步到云托管 MySQL
 * 
 * 使用方法：
 * 1. 确保已配置 .env.cloudbase 中的环境变量
 * 2. 运行: node backend/db/sync-cloudbase.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.cloudbase') });

const fs = require('fs');
const path = require('path');

// CloudBase SDK
let cloudbase;
try {
  cloudbase = require('@cloudbase/node-sdk');
} catch (e) {
  console.error('❌ 请先安装 @cloudbase/node-sdk: pnpm add @cloudbase/node-sdk');
  process.exit(1);
}

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// CloudBase 配置
const CLOUDBASE_ENV = process.env.CLOUDBASE_ENV || 'test-1g71tc7eb37627e2';
const SECRET_ID = process.env.TENCENTCLOUD_SECRETID;
const SECRET_KEY = process.env.TENCENTCLOUD_SECRETKEY;

if (!SECRET_ID || !SECRET_KEY) {
  console.error('❌ 缺少腾讯云密钥配置');
  console.error('   请在 .env.cloudbase 中配置:');
  console.error('   - TENCENTCLOUD_SECRETID');
  console.error('   - TENCENTCLOUD_SECRETKEY');
  process.exit(1);
}

console.log('🚀 CloudBase MySQL 数据库同步工具\n');
console.log('📋 配置信息:');
console.log(`   环境 ID: ${CLOUDBASE_ENV}`);
console.log(`   密钥 ID: ${SECRET_ID.substring(0, 8)}...`);
console.log('');

/**
 * 初始化 CloudBase
 */
function initCloudBase() {
  return cloudbase.init({
    env: CLOUDBASE_ENV,
    region: 'ap-shanghai',
    secretId: SECRET_ID,
    secretKey: SECRET_KEY
  });
}

/**
 * 获取迁移文件列表
 */
function getMigrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
}

/**
 * 显示数据库表结构
 */
async function showTables() {
  console.log('📊 检查云端数据库表...\n');
  
  const app = initCloudBase();
  const db = app.rdb();
  
  // 尝试查询各个表
  const tables = ['users', 'generation_history', 'payment_orders', 'product_orders', 'greeting_cards', 'error_logs', 'schema_migrations'];
  
  for (const table of tables) {
    try {
      const { data, error } = await db.from(table).select('*').limit(1);
      if (error) {
        console.log(`   ❌ ${table}: 不存在或无法访问`);
      } else {
        console.log(`   ✅ ${table}: 存在`);
      }
    } catch (e) {
      console.log(`   ❌ ${table}: ${e.message}`);
    }
  }
  
  console.log('');
}

/**
 * 显示迁移文件
 */
function showMigrations() {
  console.log('📦 本地迁移文件:\n');
  
  const files = getMigrationFiles();
  files.forEach(file => {
    console.log(`   - ${file}`);
  });
  
  console.log('');
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
📖 使用说明:

CloudBase MySQL 使用 RDB API，不支持直接执行 SQL。
数据库表需要在云开发控制台中手动创建。

步骤：
1. 登录腾讯云云开发控制台
2. 进入环境 ${CLOUDBASE_ENV}
3. 选择「数据库」->「MySQL」
4. 使用 SQL 编辑器执行迁移文件中的 SQL

迁移文件位置: ${MIGRATIONS_DIR}

需要执行的迁移文件:
`);
  
  const files = getMigrationFiles();
  files.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file}`);
  });
  
  console.log(`
💡 提示:
   - 按顺序执行迁移文件
   - 001_initial_schema.sql 创建基础表
   - 002_add_error_logs.sql 添加错误日志表
   - 003_add_openid_column.sql 添加 openid 字段

🔗 云开发控制台: https://console.cloud.tencent.com/tcb/env/index?rid=4&envId=${CLOUDBASE_ENV}
`);
}

/**
 * 输出迁移 SQL 内容
 */
function outputMigrationSQL() {
  console.log('📄 迁移 SQL 内容:\n');
  console.log('=' .repeat(60));
  
  const files = getMigrationFiles();
  files.forEach(file => {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    console.log(`\n-- ========== ${file} ==========\n`);
    console.log(content);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ 请将以上 SQL 复制到云开发控制台执行\n');
}

// 主函数
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'status':
      await showTables();
      break;
    case 'migrations':
      showMigrations();
      break;
    case 'sql':
      outputMigrationSQL();
      break;
    case 'help':
    default:
      showHelp();
      await showTables();
  }
}

main().catch(err => {
  console.error('❌ 执行失败:', err.message);
  process.exit(1);
});
