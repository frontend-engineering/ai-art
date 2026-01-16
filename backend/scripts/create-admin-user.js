#!/usr/bin/env node

/**
 * 创建初始管理员账户
 * 用于设置默认管理员的密码
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_PASSWORD = 'Admin@123456';
const SALT_ROUNDS = 10;

async function createAdminUser() {
  console.log('🔐 创建初始管理员账户...\n');
  
  let connection;
  
  try {
    // 连接数据库
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ai_family_photo'
    });
    
    console.log('✅ 数据库连接成功');
    
    // 生成密码哈希
    console.log('🔒 生成密码哈希...');
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
    console.log('✅ 密码哈希生成成功');
    
    // 检查是否已存在管理员
    const [existing] = await connection.query(
      'SELECT id FROM admin_users WHERE username = ?',
      ['admin']
    );
    
    if (existing.length > 0) {
      console.log('\n⚠️  管理员账户已存在，更新密码...');
      await connection.query(
        'UPDATE admin_users SET password_hash = ?, updated_at = NOW() WHERE username = ?',
        [passwordHash, 'admin']
      );
      console.log('✅ 管理员密码已更新');
    } else {
      console.log('\n📝 创建新管理员账户...');
      await connection.query(
        `INSERT INTO admin_users (id, username, password_hash, role, email, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), 'admin', passwordHash, 'super_admin', 'admin@example.com', 'active']
      );
      console.log('✅ 管理员账户创建成功');
    }
    
    console.log('\n📋 管理员账户信息:');
    console.log('   用户名: admin');
    console.log('   密码: Admin@123456');
    console.log('   角色: super_admin');
    console.log('\n⚠️  请在首次登录后立即修改密码！\n');
    
  } catch (error) {
    console.error('\n❌ 创建管理员账户失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createAdminUser();
