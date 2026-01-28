/**
 * 用户服务属性测试
 * Feature: usage-limit-system
 * 使用 fast-check 进行基于属性的测试
 */

const fc = require('fast-check');
const userService = require('../userService');
const { query, testConnection } = require('../../db/connection');
const { v4: uuidv4 } = require('uuid');

// 测试辅助函数
async function cleanupTestUser(userId) {
  try {
    await query('DELETE FROM usage_logs WHERE user_id = ?', [userId]);
    await query('DELETE FROM invite_records WHERE inviter_id = ? OR invitee_id = ?', [userId, userId]);
    await query('DELETE FROM invite_stats WHERE user_id = ?', [userId]);
    await query('DELETE FROM users WHERE id = ?', [userId]);
  } catch (error) {
    console.error('清理测试用户失败:', error);
  }
}

describe('User Service Property Tests', () => {
  let dbConnected = false;

  beforeAll(async () => {
    dbConnected = await testConnection();
    if (!dbConnected) {
      console.warn('数据库未连接,跳过属性测试');
    }
  });

  describe('Property 1: 新用户初始化一致性', () => {
    /**
     * **Validates: Requirements 1.1, 1.2, 1.5**
     * 对于任何新用户，创建用户记录时应该初始化usage_count为3，has_ever_paid为false，并生成唯一的invite_code。
     */
    it('should initialize new users with usage_count=3, has_ever_paid=false, and unique invite_code', async () => {
      if (!dbConnected) {
        console.warn('跳过测试: 数据库未连接');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // 生成随机数量的用户
          async (userCount) => {
            const createdUsers = [];
            const inviteCodes = new Set();

            try {
              // 创建多个新用户
              for (let i = 0; i < Math.min(userCount, 10); i++) {
                const userId = `test-prop1-${uuidv4()}`;
                const openid = `openid-${uuidv4()}`;
                
                const user = await userService.createUserWithInvite(userId, openid);
                createdUsers.push(user);

                // 验证 usage_count = 3
                expect(user.usage_count).toBe(3);

                // 验证 has_ever_paid = false
                expect(user.has_ever_paid).toBe(false);

                // 验证 invite_code 存在
                expect(user.invite_code).toBeDefined();
                expect(user.invite_code).not.toBeNull();
                expect(typeof user.invite_code).toBe('string');
                expect(user.invite_code.length).toBe(8);

                // 验证 invite_code 唯一性
                expect(inviteCodes.has(user.invite_code)).toBe(false);
                inviteCodes.add(user.invite_code);
              }
            } finally {
              // 清理测试数据
              for (const user of createdUsers) {
                await cleanupTestUser(user.id);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 15: 付费套餐次数增加', () => {
    /**
     * **Validates: Requirements 6.1, 6.2**
     * 对于任何完成的付费订单，Basic_Tier应该增加usage_count 5次，Premium_Tier应该增加20次。
     */
    it('should increase usage_count by 5 for basic tier and 20 for premium tier', async () => {
      if (!dbConnected) {
        console.warn('跳过测试: 数据库未连接');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('basic', 'premium'),
          fc.integer({ min: 0, max: 50 }), // 初始usage_count
          async (tier, initialCount) => {
            const userId = `test-prop15-${uuidv4()}`;
            const openid = `openid-${uuidv4()}`;

            try {
              // 创建用户
              await userService.createUserWithInvite(userId, openid);
              
              // 设置初始usage_count
              await query('UPDATE users SET usage_count = ? WHERE id = ?', [initialCount, userId]);

              // 执行付费升级
              const expectedIncrement = tier === 'basic' ? 5 : 20;
              await userService.processPaymentUpgrade(userId, tier, tier === 'basic' ? 9.9 : 29.9);

              // 验证usage_count增加正确
              const user = await userService.getUserById(userId);
              expect(user.usage_count).toBe(initialCount + expectedIncrement);
            } finally {
              await cleanupTestUser(userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 16: 首次付费标记', () => {
    /**
     * **Validates: Requirements 6.3**
     * 对于任何用户的首次付费，has_ever_paid应该被设置为true，first_payment_at应该记录当前时间戳。
     */
    it('should set has_ever_paid=true and first_payment_at on first payment', async () => {
      if (!dbConnected) {
        console.warn('跳过测试: 数据库未连接');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('basic', 'premium'),
          async (tier) => {
            const userId = `test-prop16-${uuidv4()}`;
            const openid = `openid-${uuidv4()}`;

            try {
              // 创建新用户（has_ever_paid应该是false）
              const newUser = await userService.createUserWithInvite(userId, openid);
              expect(newUser.has_ever_paid).toBe(false);
              expect(newUser.first_payment_at).toBeNull();

              // 记录付费前的时间
              const beforePayment = new Date();

              // 执行首次付费
              await userService.processPaymentUpgrade(userId, tier, tier === 'basic' ? 9.9 : 29.9);

              // 验证has_ever_paid被设置为true
              const user = await userService.getUserById(userId);
              expect(user.has_ever_paid).toBe(true);

              // 验证first_payment_at已设置且在合理时间范围内
              expect(user.first_payment_at).not.toBeNull();
              const firstPaymentTime = new Date(user.first_payment_at);
              expect(firstPaymentTime.getTime()).toBeGreaterThanOrEqual(beforePayment.getTime() - 1000);
              expect(firstPaymentTime.getTime()).toBeLessThanOrEqual(Date.now() + 1000);

              // 验证last_payment_at也被设置
              expect(user.last_payment_at).not.toBeNull();
            } finally {
              await cleanupTestUser(userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 18: 付费标记永久性', () => {
    /**
     * **Validates: Requirements 6.6**
     * 对于任何has_ever_paid = true的用户，该标志应该永久保持为true，不会因任何操作变回false。
     */
    it('should keep has_ever_paid=true permanently after first payment', async () => {
      if (!dbConnected) {
        console.warn('跳过测试: 数据库未连接');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom('basic', 'premium'), { minLength: 1, maxLength: 5 }),
          async (paymentSequence) => {
            const userId = `test-prop18-${uuidv4()}`;
            const openid = `openid-${uuidv4()}`;

            try {
              // 创建新用户
              await userService.createUserWithInvite(userId, openid);

              // 执行一系列付费操作
              for (const tier of paymentSequence) {
                await userService.processPaymentUpgrade(userId, tier, tier === 'basic' ? 9.9 : 29.9);

                // 验证每次付费后has_ever_paid都是true
                const user = await userService.getUserById(userId);
                expect(user.has_ever_paid).toBe(true);
              }

              // 执行各种其他操作后，验证标志仍然是true
              // 更新regenerate_count
              await userService.updateUserRegenerateCount(userId, 10);
              let user = await userService.getUserById(userId);
              expect(user.has_ever_paid).toBe(true);

              // 减少regenerate_count
              await userService.decrementRegenerateCount(userId);
              user = await userService.getUserById(userId);
              expect(user.has_ever_paid).toBe(true);

              // 获取用户完整信息
              user = await userService.getUserWithUsageInfo(userId);
              expect(user.has_ever_paid).toBe(true);
              expect(user.user_type).toBe('paid');
            } finally {
              await cleanupTestUser(userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
