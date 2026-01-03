/**
 * 用户服务集成测试
 * 注意: 这些测试需要MySQL数据库运行
 */

const userService = require('../userService');
const { testConnection } = require('../../db/connection');

describe('User Service Integration Tests', () => {
  let testUserId;

  beforeAll(async () => {
    // 测试数据库连接
    const isConnected = await testConnection();
    if (!isConnected) {
      console.warn('数据库未连接,跳过集成测试');
      return;
    }
  });

  describe('createUser', () => {
    it('should create a new user with default values', async () => {
      const user = await userService.createUser();
      
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.payment_status).toBe('free');
      expect(user.regenerate_count).toBe(3);
      
      testUserId = user.id;
    });

    it('should create a user with specified ID', async () => {
      const customId = 'test-user-123';
      const user = await userService.createUser(customId);
      
      expect(user.id).toBe(customId);
      expect(user.payment_status).toBe('free');
    });

    it('should return existing user if already exists', async () => {
      const user1 = await userService.createUser(testUserId);
      const user2 = await userService.createUser(testUserId);
      
      expect(user1.id).toBe(user2.id);
      expect(user1.created_at).toEqual(user2.created_at);
    });
  });

  describe('getUserById', () => {
    it('should retrieve user by ID', async () => {
      const user = await userService.getUserById(testUserId);
      
      expect(user).toBeDefined();
      expect(user.id).toBe(testUserId);
    });

    it('should return null for non-existent user', async () => {
      const user = await userService.getUserById('non-existent-id');
      
      expect(user).toBeNull();
    });
  });

  describe('updateUserPaymentStatus', () => {
    it('should update user payment status to basic', async () => {
      const user = await userService.updateUserPaymentStatus(testUserId, 'basic');
      
      expect(user.payment_status).toBe('basic');
    });

    it('should update user payment status to premium', async () => {
      const user = await userService.updateUserPaymentStatus(testUserId, 'premium');
      
      expect(user.payment_status).toBe('premium');
    });

    it('should throw error for invalid payment status', async () => {
      await expect(
        userService.updateUserPaymentStatus(testUserId, 'invalid')
      ).rejects.toThrow('无效的付费状态');
    });
  });

  describe('updateUserRegenerateCount', () => {
    it('should update regenerate count', async () => {
      const user = await userService.updateUserRegenerateCount(testUserId, 5);
      
      expect(user.regenerate_count).toBe(5);
    });
  });

  describe('decrementRegenerateCount', () => {
    it('should decrement regenerate count by 1', async () => {
      const userBefore = await userService.getUserById(testUserId);
      const userAfter = await userService.decrementRegenerateCount(testUserId);
      
      expect(userAfter.regenerate_count).toBe(userBefore.regenerate_count - 1);
    });

    it('should not go below 0', async () => {
      // Set count to 0
      await userService.updateUserRegenerateCount(testUserId, 0);
      
      // Try to decrement
      const user = await userService.decrementRegenerateCount(testUserId);
      
      expect(user.regenerate_count).toBe(0);
    });
  });

  describe('getOrCreateUser', () => {
    it('should return existing user', async () => {
      const user = await userService.getOrCreateUser(testUserId);
      
      expect(user.id).toBe(testUserId);
    });

    it('should create new user if not exists', async () => {
      const newUserId = 'new-test-user-456';
      const user = await userService.getOrCreateUser(newUserId);
      
      expect(user.id).toBe(newUserId);
      expect(user.payment_status).toBe('free');
    });
  });
});
