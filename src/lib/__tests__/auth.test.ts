/**
 * 用户鉴权工具测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getUserId, clearUserId, hasUserId } from '../auth';

describe('User Authentication', () => {
  beforeEach(() => {
    // 清除localStorage
    localStorage.clear();
  });

  it('should generate a new user ID if none exists', () => {
    const userId = getUserId();
    expect(userId).toBeDefined();
    expect(typeof userId).toBe('string');
    expect(userId.length).toBeGreaterThan(0);
  });

  it('should return the same user ID on subsequent calls', () => {
    const userId1 = getUserId();
    const userId2 = getUserId();
    expect(userId1).toBe(userId2);
  });

  it('should store user ID in localStorage', () => {
    const userId = getUserId();
    const storedId = localStorage.getItem('ai_family_photo_user_id');
    expect(storedId).toBe(userId);
  });

  it('should detect if user ID exists', () => {
    expect(hasUserId()).toBe(false);
    getUserId();
    expect(hasUserId()).toBe(true);
  });

  it('should clear user ID from localStorage', () => {
    getUserId();
    expect(hasUserId()).toBe(true);
    clearUserId();
    expect(hasUserId()).toBe(false);
  });

  it('should generate a new user ID after clearing', () => {
    const userId1 = getUserId();
    clearUserId();
    const userId2 = getUserId();
    expect(userId1).not.toBe(userId2);
  });
});
