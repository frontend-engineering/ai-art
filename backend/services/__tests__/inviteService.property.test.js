/**
 * 邀请服务属性测试
 * 使用 fast-check 进行基于属性的测试
 * 
 * Feature: usage-limit-system
 */

const fc = require('fast-check');
const inviteService = require('../inviteService');
const { testConnection, query } = require('../../db/connection');
const { v4: uuidv4 } = require('uuid');

describe('Invite Service Property-Based Tests', () => {
  let testConnection_result;

  beforeAll(async () => {
    // 测试数据库连接
    testConnection_result = await testConnection();
    if (!testConnection_result) {
      console.warn('数据库未连接,跳过属性测试');
      return;
    }
  });

  /**
   * 创建测试用户（邀请人）
   * @param {string} userId - 用户ID（可选）
   * @returns {Promise<Object>} { userId, inviteCode }
   */
  async function createTestInviter(userId = null) {
    const id = userId || uuidv4();
    const inviteCode = await inviteService.generateInviteCode(id);
    
    // 如果用户不存在，创建用户
    const existingRows = await query('SELECT id FROM users WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      await query(
        `INSERT INTO users (id, usage_count, usage_limit, has_ever_paid, invite_code) 
         VALUES (?, ?, ?, ?, ?)`,
        [id, 3, 3, false, inviteCode]
      );
    }
    
    return { userId: id, inviteCode };
  }

  /**
   * 清理测试数据
   * @param {string} userId - 用户ID
   */
  async function cleanupTestUser(userId) {
    await query('DELETE FROM usage_logs WHERE user_id = ?', [userId]);
    await query('DELETE FROM invite_records WHERE inviter_id = ? OR invitee_id = ?', [userId, userId]);
    await query('DELETE FROM invite_stats WHERE user_id = ?', [userId]);
    await query('DELETE FROM users WHERE id = ?', [userId]);
  }

  describe('Property 11: 邀请记录创建', () => {
    /**
     * **Validates: Requirements 5.2, 5.5**
     * 
     * 对于任何有效的 invite_code 和新用户，注册时应该创建一条 invite_records 记录，
     * 关联 inviter 和 invitee。
     */
    it('should create invite_records entry for any valid invite_code and new user', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // 生成随机场景
          async (seed) => {
            // 创建邀请人
            const inviter = await createTestInviter();
            const newUserId = uuidv4();
            const openid = `test-openid-${seed}-${Date.now()}`;

            try {
              // 执行邀请注册
              const result = await inviteService.processInviteRegistration(
                inviter.inviteCode,
                newUserId,
                openid
              );

              // 验证：注册成功
              expect(result.success).toBe(true);
              expect(result.inviter_id).toBe(inviter.userId);
              expect(result.reward_granted).toBe(true);

              // 验证：创建了 invite_records 记录
              const recordRows = await query(
                'SELECT * FROM invite_records WHERE inviter_id = ? AND invitee_id = ?',
                [inviter.userId, newUserId]
              );
              expect(recordRows.length).toBe(1);

              // 验证：记录包含正确的信息
              const record = recordRows[0];
              expect(record.inviter_id).toBe(inviter.userId);
              expect(record.invitee_id).toBe(newUserId);
              expect(record.invite_code).toBe(inviter.inviteCode);
              expect(record.reward_granted).toBe(true);
              expect(record.created_at).toBeDefined();

              // 验证：新用户已创建
              const newUserRows = await query(
                'SELECT * FROM users WHERE id = ?',
                [newUserId]
              );
              expect(newUserRows.length).toBe(1);
              expect(newUserRows[0].openid).toBe(openid);
              expect(newUserRows[0].usage_count).toBe(3);
              expect(newUserRows[0].has_ever_paid).toBe(false);
              expect(newUserRows[0].invite_code).toBeDefined();
              expect(newUserRows[0].invite_code.length).toBe(8);
            } finally {
              // 清理测试数据
              await cleanupTestUser(newUserId);
              await cleanupTestUser(inviter.userId);
            }
          }
        ),
        { numRuns: 100 } // 最少 100 次迭代
      );
    });

    it('should create exactly one invite_records entry per successful registration', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }),
          async (seed) => {
            const inviter = await createTestInviter();
            const newUserId = uuidv4();
            const openid = `test-openid-${seed}-${Date.now()}`;

            try {
              // 执行邀请注册
              await inviteService.processInviteRegistration(
                inviter.inviteCode,
                newUserId,
                openid
              );

              // 验证：只创建了一条 invite_records 记录
              const recordRows = await query(
                'SELECT COUNT(*) as count FROM invite_records WHERE invitee_id = ?',
                [newUserId]
              );
              expect(recordRows[0].count).toBe(1);

              // 验证：该记录关联了正确的 inviter
              const specificRecordRows = await query(
                'SELECT COUNT(*) as count FROM invite_records WHERE inviter_id = ? AND invitee_id = ?',
                [inviter.userId, newUserId]
              );
              expect(specificRecordRows[0].count).toBe(1);
            } finally {
              await cleanupTestUser(newUserId);
              await cleanupTestUser(inviter.userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain referential integrity between inviter and invitee', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }),
          async (seed) => {
            const inviter = await createTestInviter();
            const newUserId = uuidv4();
            const openid = `test-openid-${seed}-${Date.now()}`;

            try {
              // 执行邀请注册
              await inviteService.processInviteRegistration(
                inviter.inviteCode,
                newUserId,
                openid
              );

              // 验证：inviter 和 invitee 都存在于 users 表
              const inviterRows = await query(
                'SELECT id FROM users WHERE id = ?',
                [inviter.userId]
              );
              expect(inviterRows.length).toBe(1);

              const inviteeRows = await query(
                'SELECT id FROM users WHERE id = ?',
                [newUserId]
              );
              expect(inviteeRows.length).toBe(1);

              // 验证：invite_records 中的外键关系正确
              const recordRows = await query(
                `SELECT ir.*, 
                        u1.id as inviter_exists, 
                        u2.id as invitee_exists
                 FROM invite_records ir
                 JOIN users u1 ON ir.inviter_id = u1.id
                 JOIN users u2 ON ir.invitee_id = u2.id
                 WHERE ir.inviter_id = ? AND ir.invitee_id = ?`,
                [inviter.userId, newUserId]
              );
              expect(recordRows.length).toBe(1);
              expect(recordRows[0].inviter_exists).toBe(inviter.userId);
              expect(recordRows[0].invitee_exists).toBe(newUserId);
            } finally {
              await cleanupTestUser(newUserId);
              await cleanupTestUser(inviter.userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should record timestamp for all invite_records entries', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }),
          async (seed) => {
            const inviter = await createTestInviter();
            const newUserId = uuidv4();
            const openid = `test-openid-${seed}-${Date.now()}`;

            try {
              const beforeTime = new Date();
              
              // 执行邀请注册
              await inviteService.processInviteRegistration(
                inviter.inviteCode,
                newUserId,
                openid
              );

              const afterTime = new Date();

              // 验证：记录包含 created_at 时间戳
              const recordRows = await query(
                'SELECT created_at FROM invite_records WHERE inviter_id = ? AND invitee_id = ?',
                [inviter.userId, newUserId]
              );
              expect(recordRows.length).toBe(1);

              const createdAt = new Date(recordRows[0].created_at);
              expect(createdAt).toBeDefined();
              
              // 验证：时间戳在合理范围内（操作前后）
              expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime() - 1000);
              expect(createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime() + 1000);
            } finally {
              await cleanupTestUser(newUserId);
              await cleanupTestUser(inviter.userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12: 邀请奖励发放', () => {
    /**
     * **Validates: Requirements 5.3**
     * 
     * 对于任何成功创建的有效邀请关系，邀请人的 usage_count 应该精确增加 1。
     */
    it('should increment inviter usage_count by exactly 1 for any successful invite', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 50 }), // 邀请人的初始 usage_count
          async (initialCount) => {
            // 创建邀请人
            const inviterId = uuidv4();
            await query(
              `INSERT INTO users (id, usage_count, usage_limit, has_ever_paid) 
               VALUES (?, ?, ?, ?)`,
              [inviterId, initialCount, 3, false]
            );

            const inviter = await createTestInviter(inviterId);
            const newUserId = uuidv4();
            const openid = `test-openid-${Date.now()}`;

            try {
              // 记录邀请前的 usage_count
              const beforeRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [inviter.userId]
              );
              const countBefore = beforeRows[0].usage_count;
              expect(countBefore).toBe(initialCount);

              // 执行邀请注册
              const result = await inviteService.processInviteRegistration(
                inviter.inviteCode,
                newUserId,
                openid
              );

              // 验证：注册成功且奖励已发放
              expect(result.success).toBe(true);
              expect(result.reward_granted).toBe(true);

              // 验证：邀请人的 usage_count 精确增加 1
              const afterRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [inviter.userId]
              );
              const countAfter = afterRows[0].usage_count;
              expect(countAfter).toBe(initialCount + 1);

              // 验证：usage_logs 中记录了奖励
              const logRows = await query(
                'SELECT * FROM usage_logs WHERE user_id = ? AND reason = ?',
                [inviter.userId, 'invite_reward']
              );
              expect(logRows.length).toBeGreaterThanOrEqual(1);

              // 找到最新的奖励记录
              const latestLog = logRows[logRows.length - 1];
              expect(latestLog.action_type).toBe('increment');
              expect(latestLog.amount).toBe(1);
              expect(latestLog.remaining_count).toBe(initialCount + 1);
            } finally {
              await cleanupTestUser(newUserId);
              await cleanupTestUser(inviter.userId);
            }
          }
        ),
        { numRuns: 100 } // 最少 100 次迭代
      );
    });

    it('should create usage_logs entry with correct reference_id for invite reward', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 50 }),
          async (initialCount) => {
            const inviterId = uuidv4();
            await query(
              `INSERT INTO users (id, usage_count, usage_limit, has_ever_paid) 
               VALUES (?, ?, ?, ?)`,
              [inviterId, initialCount, 3, false]
            );

            const inviter = await createTestInviter(inviterId);
            const newUserId = uuidv4();
            const openid = `test-openid-${Date.now()}`;

            try {
              // 执行邀请注册
              await inviteService.processInviteRegistration(
                inviter.inviteCode,
                newUserId,
                openid
              );

              // 获取 invite_records 的 ID
              const recordRows = await query(
                'SELECT id FROM invite_records WHERE inviter_id = ? AND invitee_id = ?',
                [inviter.userId, newUserId]
              );
              expect(recordRows.length).toBe(1);
              const inviteRecordId = recordRows[0].id;

              // 验证：usage_logs 中的 reference_id 指向 invite_records
              const logRows = await query(
                'SELECT * FROM usage_logs WHERE user_id = ? AND reason = ? AND reference_id = ?',
                [inviter.userId, 'invite_reward', inviteRecordId]
              );
              expect(logRows.length).toBe(1);

              const log = logRows[0];
              expect(log.action_type).toBe('increment');
              expect(log.amount).toBe(1);
              expect(log.reference_id).toBe(inviteRecordId);
            } finally {
              await cleanupTestUser(newUserId);
              await cleanupTestUser(inviter.userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain reward consistency: reward_granted flag matches usage_count increment', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 50 }),
          async (initialCount) => {
            const inviterId = uuidv4();
            await query(
              `INSERT INTO users (id, usage_count, usage_limit, has_ever_paid) 
               VALUES (?, ?, ?, ?)`,
              [inviterId, initialCount, 3, false]
            );

            const inviter = await createTestInviter(inviterId);
            const newUserId = uuidv4();
            const openid = `test-openid-${Date.now()}`;

            try {
              const beforeCount = (await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [inviter.userId]
              ))[0].usage_count;

              // 执行邀请注册
              await inviteService.processInviteRegistration(
                inviter.inviteCode,
                newUserId,
                openid
              );

              // 获取 invite_records 的 reward_granted 标志
              const recordRows = await query(
                'SELECT reward_granted FROM invite_records WHERE inviter_id = ? AND invitee_id = ?',
                [inviter.userId, newUserId]
              );
              const rewardGranted = recordRows[0].reward_granted;

              // 获取邀请后的 usage_count
              const afterCount = (await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [inviter.userId]
              ))[0].usage_count;

              // 验证：如果 reward_granted 为 true，usage_count 应该增加 1
              if (rewardGranted) {
                expect(afterCount).toBe(beforeCount + 1);
              } else {
                expect(afterCount).toBe(beforeCount);
              }

              // 在当前实现中，reward_granted 总是 true
              expect(rewardGranted).toBe(true);
              expect(afterCount).toBe(beforeCount + 1);
            } finally {
              await cleanupTestUser(newUserId);
              await cleanupTestUser(inviter.userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple invites: each successful invite adds exactly 1 to usage_count', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // 邀请次数
          fc.integer({ min: 0, max: 20 }), // 初始 usage_count
          async (inviteCount, initialCount) => {
            const inviterId = uuidv4();
            await query(
              `INSERT INTO users (id, usage_count, usage_limit, has_ever_paid) 
               VALUES (?, ?, ?, ?)`,
              [inviterId, initialCount, 3, false]
            );

            const inviter = await createTestInviter(inviterId);
            const invitees = [];

            try {
              // 执行多次邀请
              for (let i = 0; i < inviteCount; i++) {
                const newUserId = uuidv4();
                const openid = `test-openid-${i}-${Date.now()}`;
                invitees.push(newUserId);

                await inviteService.processInviteRegistration(
                  inviter.inviteCode,
                  newUserId,
                  openid
                );
              }

              // 验证：usage_count 增加了 inviteCount
              const finalRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [inviter.userId]
              );
              const finalCount = finalRows[0].usage_count;
              expect(finalCount).toBe(initialCount + inviteCount);

              // 验证：创建了 inviteCount 条 invite_records
              const recordRows = await query(
                'SELECT COUNT(*) as count FROM invite_records WHERE inviter_id = ?',
                [inviter.userId]
              );
              expect(recordRows[0].count).toBe(inviteCount);

              // 验证：创建了 inviteCount 条 usage_logs（invite_reward）
              const logRows = await query(
                'SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND reason = ?',
                [inviter.userId, 'invite_reward']
              );
              expect(logRows[0].count).toBe(inviteCount);
            } finally {
              for (const inviteeId of invitees) {
                await cleanupTestUser(inviteeId);
              }
              await cleanupTestUser(inviter.userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 21: 邀请统计准确性', () => {
    /**
     * **Validates: Requirements 8.1**
     * 
     * 对于任何用户，查询邀请统计返回的 successful_invites 应该等于
     * invite_records 表中该用户作为 inviter 的记录数。
     */
    it('should return accurate invite statistics matching invite_records count', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10 }), // 邀请次数
          async (inviteCount) => {
            const inviterId = uuidv4();
            await query(
              `INSERT INTO users (id, usage_count, usage_limit, has_ever_paid) 
               VALUES (?, ?, ?, ?)`,
              [inviterId, 5, 3, false]
            );

            const inviter = await createTestInviter(inviterId);
            const invitees = [];

            try {
              // 执行多次邀请
              for (let i = 0; i < inviteCount; i++) {
                const newUserId = uuidv4();
                const openid = `test-openid-${i}-${Date.now()}`;
                invitees.push(newUserId);

                await inviteService.processInviteRegistration(
                  inviter.inviteCode,
                  newUserId,
                  openid
                );
              }

              // 查询邀请统计
              const stats = await inviteService.getInviteStats(inviter.userId);

              // 验证：successful_invites 等于实际的邀请记录数
              expect(stats.successful_invites).toBe(inviteCount);
              expect(stats.total_invites).toBe(inviteCount);

              // 验证：与 invite_records 表中的记录数一致
              const recordRows = await query(
                'SELECT COUNT(*) as count FROM invite_records WHERE inviter_id = ?',
                [inviter.userId]
              );
              expect(stats.successful_invites).toBe(recordRows[0].count);

              // 验证：total_rewards 等于邀请次数（每次邀请奖励 1 次）
              expect(stats.total_rewards).toBe(inviteCount);
            } finally {
              for (const inviteeId of invitees) {
                await cleanupTestUser(inviteeId);
              }
              await cleanupTestUser(inviter.userId);
            }
          }
        ),
        { numRuns: 100 } // 最少 100 次迭代
      );
    });

    it('should maintain consistency between invite_stats and invite_records tables', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (inviteCount) => {
            const inviterId = uuidv4();
            await query(
              `INSERT INTO users (id, usage_count, usage_limit, has_ever_paid) 
               VALUES (?, ?, ?, ?)`,
              [inviterId, 10, 3, false]
            );

            const inviter = await createTestInviter(inviterId);
            const invitees = [];

            try {
              // 执行多次邀请
              for (let i = 0; i < inviteCount; i++) {
                const newUserId = uuidv4();
                const openid = `test-openid-${i}-${Date.now()}`;
                invitees.push(newUserId);

                await inviteService.processInviteRegistration(
                  inviter.inviteCode,
                  newUserId,
                  openid
                );
              }

              // 从 invite_stats 表查询
              const statsRows = await query(
                'SELECT * FROM invite_stats WHERE user_id = ?',
                [inviter.userId]
              );
              expect(statsRows.length).toBe(1);

              const dbStats = statsRows[0];

              // 从 invite_records 表统计
              const recordRows = await query(
                'SELECT COUNT(*) as count FROM invite_records WHERE inviter_id = ?',
                [inviter.userId]
              );
              const actualRecordCount = recordRows[0].count;

              // 验证：invite_stats 中的数字与 invite_records 一致
              expect(dbStats.total_invites).toBe(actualRecordCount);
              expect(dbStats.successful_invites).toBe(actualRecordCount);
              expect(dbStats.total_rewards).toBe(actualRecordCount);

              // 验证：getInviteStats 返回的数字与数据库一致
              const stats = await inviteService.getInviteStats(inviter.userId);
              expect(stats.total_invites).toBe(dbStats.total_invites);
              expect(stats.successful_invites).toBe(dbStats.successful_invites);
              expect(stats.total_rewards).toBe(dbStats.total_rewards);
            } finally {
              for (const inviteeId of invitees) {
                await cleanupTestUser(inviteeId);
              }
              await cleanupTestUser(inviter.userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return zero statistics for users with no invites', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.constant(0), // 没有邀请
          async () => {
            const inviterId = uuidv4();
            await query(
              `INSERT INTO users (id, usage_count, usage_limit, has_ever_paid) 
               VALUES (?, ?, ?, ?)`,
              [inviterId, 3, 3, false]
            );

            const inviter = await createTestInviter(inviterId);

            try {
              // 查询邀请统计（没有任何邀请）
              const stats = await inviteService.getInviteStats(inviter.userId);

              // 验证：所有统计数字都是 0
              expect(stats.total_invites).toBe(0);
              expect(stats.successful_invites).toBe(0);
              expect(stats.total_rewards).toBe(0);

              // 验证：invite_records 中确实没有记录
              const recordRows = await query(
                'SELECT COUNT(*) as count FROM invite_records WHERE inviter_id = ?',
                [inviter.userId]
              );
              expect(recordRows[0].count).toBe(0);
            } finally {
              await cleanupTestUser(inviter.userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update statistics incrementally with each new invite', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          async (maxInvites) => {
            const inviterId = uuidv4();
            await query(
              `INSERT INTO users (id, usage_count, usage_limit, has_ever_paid) 
               VALUES (?, ?, ?, ?)`,
              [inviterId, 20, 3, false]
            );

            const inviter = await createTestInviter(inviterId);
            const invitees = [];

            try {
              // 逐个执行邀请，每次验证统计数字
              for (let i = 0; i < maxInvites; i++) {
                const newUserId = uuidv4();
                const openid = `test-openid-${i}-${Date.now()}`;
                invitees.push(newUserId);

                // 执行邀请
                await inviteService.processInviteRegistration(
                  inviter.inviteCode,
                  newUserId,
                  openid
                );

                // 查询统计
                const stats = await inviteService.getInviteStats(inviter.userId);

                // 验证：统计数字应该等于当前的邀请次数
                const expectedCount = i + 1;
                expect(stats.total_invites).toBe(expectedCount);
                expect(stats.successful_invites).toBe(expectedCount);
                expect(stats.total_rewards).toBe(expectedCount);

                // 验证：与实际记录数一致
                const recordRows = await query(
                  'SELECT COUNT(*) as count FROM invite_records WHERE inviter_id = ?',
                  [inviter.userId]
                );
                expect(stats.successful_invites).toBe(recordRows[0].count);
              }
            } finally {
              for (const inviteeId of invitees) {
                await cleanupTestUser(inviteeId);
              }
              await cleanupTestUser(inviter.userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
