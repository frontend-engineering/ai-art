/**
 * 用户鉴权工具
 * 负责生成和管理用户ID
 */

import { v4 as uuidv4 } from 'uuid';

const USER_ID_KEY = 'ai_family_photo_user_id';

/**
 * 获取或创建用户ID
 * 如果localStorage中不存在用户ID,则生成新的UUID并存储
 * @returns {string} 用户ID
 */
export function getUserId(): string {
  // 尝试从localStorage读取用户ID
  let userId = localStorage.getItem(USER_ID_KEY);
  
  // 如果不存在,生成新的UUID
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem(USER_ID_KEY, userId);
    console.log('生成新用户ID:', userId);
  } else {
    console.log('读取已存在的用户ID:', userId);
  }
  
  return userId;
}

/**
 * 清除用户ID (用于测试或用户登出)
 */
export function clearUserId(): void {
  localStorage.removeItem(USER_ID_KEY);
  console.log('用户ID已清除');
}

/**
 * 检查用户ID是否存在
 * @returns {boolean} 是否存在用户ID
 */
export function hasUserId(): boolean {
  return localStorage.getItem(USER_ID_KEY) !== null;
}
