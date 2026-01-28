/**
 * 管理员认证服务
 * 处理管理员登录、JWT生成、密码验证等功能
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15分钟

/**
 * 生成JWT token
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * 验证JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * 哈希密码
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * 验证密码
 */
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * 检查账户是否被锁定
 */
function isAccountLocked(user) {
  if (!user.locked_until) {
    return false;
  }
  
  const now = new Date();
  const lockedUntil = new Date(user.locked_until);
  
  return now < lockedUntil;
}

/**
 * 登录
 */
async function login(username, password, ipAddress, userAgent) {
  const connection = await db.pool.getConnection();
  
  try {
    // 查询用户
    const [users] = await connection.execute(
      'SELECT * FROM admin_users WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      throw new Error('用户名或密码错误');
    }
    
    const user = users[0];
    
    // 检查账户状态
    if (user.status === 'disabled') {
      throw new Error('账户已被禁用');
    }
    
    // 检查账户是否被锁定
    if (isAccountLocked(user)) {
      const lockedUntil = new Date(user.locked_until);
      const remainingMinutes = Math.ceil((lockedUntil - new Date()) / 60000);
      throw new Error(`账户已被锁定，请在${remainingMinutes}分钟后重试`);
    }
    
    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    
    if (!isPasswordValid) {
      // 密码错误，增加失败次数
      const newAttempts = user.login_attempts + 1;
      
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        // 锁定账户
        const lockedUntil = new Date(Date.now() + LOCK_TIME);
        await connection.execute(
          `UPDATE admin_users 
           SET login_attempts = ?, locked_until = ?, status = 'locked', updated_at = NOW() 
           WHERE id = ?`,
          [newAttempts, lockedUntil, user.id]
        );
        throw new Error(`登录失败次数过多，账户已被锁定${LOCK_TIME / 60000}分钟`);
      } else {
        // 更新失败次数
        await connection.execute(
          'UPDATE admin_users SET login_attempts = ?, updated_at = NOW() WHERE id = ?',
          [newAttempts, user.id]
        );
        throw new Error(`用户名或密码错误，还剩${MAX_LOGIN_ATTEMPTS - newAttempts}次尝试机会`);
      }
    }
    
    // 登录成功，重置失败次数和锁定状态
    await connection.execute(
      `UPDATE admin_users 
       SET login_attempts = 0, locked_until = NULL, status = 'active', 
           last_login_at = NOW(), updated_at = NOW() 
       WHERE id = ?`,
      [user.id]
    );
    
    // 生成token
    const token = generateToken(user);
    
    // 返回用户信息（不包含密码）
    const { password_hash, ...userWithoutPassword } = user;
    
    return {
      token,
      user: userWithoutPassword
    };
    
  } finally {
    connection.release();
  }
}

/**
 * 根据token获取用户信息
 */
async function getUserByToken(token) {
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return null;
  }
  
  const connection = await db.pool.getConnection();
  
  try {
    const [users] = await connection.execute(
      'SELECT id, username, role, email, status, last_login_at, created_at FROM admin_users WHERE id = ?',
      [decoded.id]
    );
    
    if (users.length === 0) {
      return null;
    }
    
    return users[0];
  } finally {
    connection.release();
  }
}

/**
 * 修改密码
 */
async function changePassword(userId, oldPassword, newPassword) {
  const connection = await db.pool.getConnection();
  
  try {
    // 查询用户
    const [users] = await connection.execute(
      'SELECT * FROM admin_users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      throw new Error('用户不存在');
    }
    
    const user = users[0];
    
    // 验证旧密码
    const isOldPasswordValid = await verifyPassword(oldPassword, user.password_hash);
    
    if (!isOldPasswordValid) {
      throw new Error('原密码错误');
    }
    
    // 哈希新密码
    const newPasswordHash = await hashPassword(newPassword);
    
    // 更新密码
    await connection.execute(
      'UPDATE admin_users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newPasswordHash, userId]
    );
    
    return true;
  } finally {
    connection.release();
  }
}

/**
 * 创建管理员用户
 */
async function createAdminUser(username, password, role, email) {
  const connection = await db.pool.getConnection();
  
  try {
    // 检查用户名是否已存在
    const [existing] = await connection.execute(
      'SELECT id FROM admin_users WHERE username = ?',
      [username]
    );
    
    if (existing.length > 0) {
      throw new Error('用户名已存在');
    }
    
    // 哈希密码
    const passwordHash = await hashPassword(password);
    
    // 创建用户
    const userId = uuidv4();
    await connection.execute(
      `INSERT INTO admin_users (id, username, password_hash, role, email, status) 
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [userId, username, passwordHash, role, email]
    );
    
    return userId;
  } finally {
    connection.release();
  }
}

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  login,
  getUserByToken,
  changePassword,
  createAdminUser
};
