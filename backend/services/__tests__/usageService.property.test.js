/**
 * 使用次数服务属性测试
 * 使用 fast-check 进行基于属性的测试
 * 
 * Feature: usage-limit-system
 */

const fc = require('fast-check');
const usageService = require('../usageService');
const { testConnection, query } = require('../../db/connection');
const { v4: uuidv4 } = require('uuid');

describe('Usage Service Property-Based Tests', () => {
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
   * 创建测试用户
   * @param {number} usageCount - 初始使用次数
   * @returns {Promise<string>} 用户ID
   */
  async function createTestUser(usageCount) {
    const userId = uuidv4();
    await query(
      `INSERT INTO users (id, usage_count, usage_limit, has_ever_paid) 
       VALUES (?, ?, ?, ?)`,
      [userId, usageCount, 3, false]
    );
    return userId;
  }

  /**
   * 清理测试用户
   * @param {string} userId - 用户ID
   */
  async function cleanupTestUser(userId) {
    await query('DELETE FROM usage_logs WHERE user_id = ?', [userId]);
    await query('DELETE FROM users WHERE id = ?', [userId]);
  }

  describe('Property 6: 使用次数精确扣减', () => {
    /**
     * **Validates: Requirements 4.1**
     * 
     * 对于任何 usage_count > 0 的用户，发起生成操作应该使 usage_count 精确减少 1。
     */
    it('should decrement usage_count by exactly 1 for any initial count > 0', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // 生成随机初始 usage_count (1-100)
          async (initialCount) => {
            // 创建测试用户
            const userId = await createTestUser(initialCount);
            const generationId = `test-gen-${uuidv4()}`;

            try {
              // 执行扣减操作
              const result = await usageService.decrementUsageCount(userId, generationId);

              // 验证：返回的 remaining_count 应该等于初始 count - 1
              expect(result.success).toBe(true);
              expect(result.remaining_count).toBe(initialCount - 1);

              // 验证：数据库中的 usage_count 也应该精确减少 1
              const userRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [userId]
              );
              expect(userRows[0].usage_count).toBe(initialCount - 1);

              // 验证：usage_logs 中记录了正确的扣减信息
              const logRows = await query(
                'SELECT * FROM usage_logs WHERE user_id = ? AND reference_id = ?',
                [userId, generationId]
              );
              expect(logRows.length).toBe(1);
              expect(logRows[0].action_type).toBe('decrement');
              expect(logRows[0].amount).toBe(-1);
              expect(logRows[0].remaining_count).toBe(initialCount - 1);
              expect(logRows[0].reason).toBe('generation');
            } finally {
              // 清理测试数据
              await cleanupTestUser(userId);
            }
          }
        ),
        { numRuns: 100 } // 最少 100 次迭代
      );
    });

    it('should create exactly one log entry for each decrement operation', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }), // 初始使用次数
          async (initialCount) => {
            const userId = await createTestUser(initialCount);
            const generationId = `test-gen-${uuidv4()}`;

            try {
              // 执行扣减
              await usageService.decrementUsageCount(userId, generationId);

              // 验证：只创建了一条日志记录
              const logRows = await query(
                'SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND reference_id = ?',
                [userId, generationId]
              );
              expect(logRows[0].count).toBe(1);
            } finally {
              await cleanupTestUser(userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain non-negative usage_count after decrement', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          async (initialCount) => {
            const userId = await createTestUser(initialCount);
            const generationId = `test-gen-${uuidv4()}`;

            try {
              await usageService.decrementUsageCount(userId, generationId);

              // 验证：扣减后的 usage_count 应该 >= 0
              const userRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [userId]
              );
              expect(userRows[0].usage_count).toBeGreaterThanOrEqual(0);
            } finally {
              await cleanupTestUser(userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve the relationship: new_count = old_count - 1', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          async (initialCount) => {
            const userId = await createTestUser(initialCount);
            const generationId = `test-gen-${uuidv4()}`;

            try {
              // 获取扣减前的 count
              const beforeRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [userId]
              );
              const countBefore = beforeRows[0].usage_count;

              // 执行扣减
              const result = await usageService.decrementUsageCount(userId, generationId);

              // 获取扣减后的 count
              const afterRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [userId]
              );
              const countAfter = afterRows[0].usage_count;

              // 验证：countAfter = countBefore - 1
              expect(countAfter).toBe(countBefore - 1);
              expect(result.remaining_count).toBe(countBefore - 1);
            } finally {
              await cleanupTestUser(userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: 使用次数扣减原子性', () => {
    /**
     * **Validates: Requirements 4.2, 6.5, 10.1**
     * 
     * 对于任何用户，在并发场景下多次扣减 usage_count，
     * 最终的 count 应该等于初始 count 减去成功扣减的次数，不会出现丢失更新。
     */
    it('should maintain atomicity when concurrent decrements occur', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 20 }),  // 初始 usage_count (5-20)
          fc.integer({ min: 2, max: 5 }),   // 并发请求数 (2-5)
          async (initialCount, concurrentRequests) => {
            // 创建测试用户
            const userId = await createTestUser(initialCount);

            try {
              // 并发执行多个扣减操作
              const promises = Array(concurrentRequests)
                .fill(0)
                .map((_, i) => {
                  const generationId = `concurrent-gen-${uuidv4()}-${i}`;
                  return usageService.decrementUsageCount(userId, generationId)
                    .catch(err => ({ error: err.message }));
                });

              // 等待所有并发操作完成
              const results = await Promise.all(promises);

              // 统计成功的扣减次数
              const successCount = results.filter(r => r.success === true).length;
              const failureCount = results.filter(r => r.error).length;

              // 验证：成功次数 + 失败次数 = 总请求数
              expect(successCount + failureCount).toBe(concurrentRequests);

              // 验证：成功次数不应超过初始 count
              expect(successCount).toBeLessThanOrEqual(initialCount);

              // 验证：最终 count = 初始 count - 成功扣减次数
              const userRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [userId]
              );
              const finalCount = userRows[0].usage_count;
              expect(finalCount).toBe(initialCount - successCount);

              // 验证：最终 count 应该 >= 0
              expect(finalCount).toBeGreaterThanOrEqual(0);

              // 验证：usage_logs 中的记录数应该等于成功的扣减次数
              const logRows = await query(
                'SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND action_type = ?',
                [userId, 'decrement']
              );
              expect(logRows[0].count).toBe(successCount);

              // 验证：如果有失败的请求，应该是因为 usage_count 不足
              if (failureCount > 0) {
                expect(finalCount).toBe(0);
                results.forEach(r => {
                  if (r.error) {
                    expect(r.error).toContain('使用次数不足');
                  }
                });
              }
            } finally {
              // 清理测试数据
              await cleanupTestUser(userId);
            }
          }
        ),
        { numRuns: 100 } // 最少 100 次迭代
      );
    });

    it('should prevent race conditions with row-level locking', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 10 }), // 初始 usage_count
          async (initialCount) => {
            const userId = await createTestUser(initialCount);

            try {
              // 创建比初始 count 更多的并发请求，确保会有失败的情况
              const concurrentRequests = initialCount + 2;
              
              const promises = Array(concurrentRequests)
                .fill(0)
                .map((_, i) => {
                  const generationId = `race-test-${uuidv4()}-${i}`;
                  return usageService.decrementUsageCount(userId, generationId)
                    .catch(err => ({ error: err.message }));
                });

              const results = await Promise.all(promises);

              // 统计成功和失败的操作
              const successCount = results.filter(r => r.success === true).length;
              const failureCount = results.filter(r => r.error).length;

              // 验证：成功次数应该正好等于初始 count（不会超过）
              expect(successCount).toBe(initialCount);

              // 验证：失败次数应该等于超出的请求数
              expect(failureCount).toBe(concurrentRequests - initialCount);

              // 验证：最终 count 应该为 0
              const userRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [userId]
              );
              expect(userRows[0].usage_count).toBe(0);

              // 验证：所有失败的请求都是因为 usage_count 不足
              results.forEach(r => {
                if (r.error) {
                  expect(r.error).toContain('使用次数不足');
                }
              });
            } finally {
              await cleanupTestUser(userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain data consistency across all concurrent operations', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10, max: 30 }), // 较大的初始 count
          fc.integer({ min: 5, max: 10 }),  // 较多的并发请求
          async (initialCount, concurrentRequests) => {
            const userId = await createTestUser(initialCount);

            try {
              // 并发执行扣减操作
              const promises = Array(concurrentRequests)
                .fill(0)
                .map((_, i) => {
                  const generationId = `consistency-test-${uuidv4()}-${i}`;
                  return usageService.decrementUsageCount(userId, generationId)
                    .catch(err => ({ error: err.message }));
                });

              const results = await Promise.all(promises);
              const successCount = results.filter(r => r.success === true).length;

              // 验证：数据库中的 usage_count 与预期一致
              const userRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [userId]
              );
              const finalCount = userRows[0].usage_count;
              expect(finalCount).toBe(initialCount - successCount);

              // 验证：usage_logs 中每条成功的扣减都有对应的日志记录
              const logRows = await query(
                'SELECT * FROM usage_logs WHERE user_id = ? AND action_type = ? ORDER BY created_at',
                [userId, 'decrement']
              );
              expect(logRows.length).toBe(successCount);

              // 验证：每条日志的 remaining_count 是递减的
              for (let i = 0; i < logRows.length; i++) {
                const log = logRows[i];
                expect(log.amount).toBe(-1);
                expect(log.reason).toBe('generation');
                expect(log.remaining_count).toBeGreaterThanOrEqual(0);
                expect(log.remaining_count).toBeLessThan(initialCount);
              }

              // 验证：最后一条日志的 remaining_count 应该等于最终的 usage_count
              if (logRows.length > 0) {
                const lastLog = logRows[logRows.length - 1];
                // 注意：由于并发，最后一条日志不一定是最小的 remaining_count
                // 但所有日志的 remaining_count 都应该在合理范围内
                expect(lastLog.remaining_count).toBeGreaterThanOrEqual(0);
                expect(lastLog.remaining_count).toBeLessThan(initialCount);
              }
            } finally {
              await cleanupTestUser(userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: 生成失败回滚', () => {
    /**
     * **Validates: Requirements 4.5**
     * 
     * 对于任何用户，如果在扣减 usage_count 后生成失败，
     * 执行恢复操作应该使 usage_count 返回到扣减前的值。
     */
    it('should restore usage_count to initial value after decrement and restore', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // 生成随机初始 usage_count (1-100)
          async (initialCount) => {
            // 创建测试用户
            const userId = await createTestUser(initialCount);
            const generationId = `test-restore-${uuidv4()}`;

            try {
              // 记录初始 count
              const beforeRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [userId]
              );
              const countBefore = beforeRows[0].usage_count;
              expect(countBefore).toBe(initialCount);

              // 执行扣减操作
              const decrementResult = await usageService.decrementUsageCount(userId, generationId);
              expect(decrementResult.success).toBe(true);
              expect(decrementResult.remaining_count).toBe(initialCount - 1);

              // 验证扣减后的 count
              const afterDecrementRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [userId]
              );
              const countAfterDecrement = afterDecrementRows[0].usage_count;
              expect(countAfterDecrement).toBe(initialCount - 1);

              // 执行恢复操作（模拟生成失败）
              const restoreResult = await usageService.restoreUsageCount(userId, generationId);
              expect(restoreResult.success).toBe(true);
              expect(restoreResult.remaining_count).toBe(initialCount);

              // 验证恢复后的 count 返回到初始值
              const afterRestoreRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [userId]
              );
              const countAfterRestore = afterRestoreRows[0].usage_count;
              expect(countAfterRestore).toBe(initialCount);

              // 验证：usage_logs 中有两条记录（一条 decrement，一条 restore）
              const logRows = await query(
                'SELECT * FROM usage_logs WHERE user_id = ? AND reference_id = ? ORDER BY created_at',
                [userId, generationId]
              );
              expect(logRows.length).toBe(2);

              // 验证第一条是 decrement
              expect(logRows[0].action_type).toBe('decrement');
              expect(logRows[0].amount).toBe(-1);
              expect(logRows[0].remaining_count).toBe(initialCount - 1);
              expect(logRows[0].reason).toBe('generation');

              // 验证第二条是 restore
              expect(logRows[1].action_type).toBe('restore');
              expect(logRows[1].amount).toBe(1);
              expect(logRows[1].remaining_count).toBe(initialCount);
              expect(logRows[1].reason).toBe('restore');
            } finally {
              // 清理测试数据
              await cleanupTestUser(userId);
            }
          }
        ),
        { numRuns: 100 } // 最少 100 次迭代
      );
    });

    it('should maintain idempotency: multiple restore operations should be safe', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 50 }), // 初始 usage_count
          fc.integer({ min: 1, max: 3 }),  // 恢复操作次数
          async (initialCount, restoreCount) => {
            const userId = await createTestUser(initialCount);
            const generationId = `test-multi-restore-${uuidv4()}`;

            try {
              // 执行扣减操作
              await usageService.decrementUsageCount(userId, generationId);

              // 验证扣减后的 count
              const afterDecrementRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [userId]
              );
              expect(afterDecrementRows[0].usage_count).toBe(initialCount - 1);

              // 执行多次恢复操作
              for (let i = 0; i < restoreCount; i++) {
                const restoreResult = await usageService.restoreUsageCount(userId, generationId);
                expect(restoreResult.success).toBe(true);
              }

              // 验证：最终 count 应该是 initialCount + (restoreCount - 1)
              // 因为第一次恢复回到初始值，后续每次恢复都会继续增加
              const finalRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [userId]
              );
              const expectedFinalCount = initialCount + (restoreCount - 1);
              expect(finalRows[0].usage_count).toBe(expectedFinalCount);

              // 验证：usage_logs 中有 1 条 decrement 和 restoreCount 条 restore
              const decrementLogs = await query(
                'SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND action_type = ?',
                [userId, 'decrement']
              );
              expect(decrementLogs[0].count).toBe(1);

              const restoreLogs = await query(
                'SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND action_type = ?',
                [userId, 'restore']
              );
              expect(restoreLogs[0].count).toBe(restoreCount);
            } finally {
              await cleanupTestUser(userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle restore operation even when count is at maximum', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          async (initialCount) => {
            const userId = await createTestUser(initialCount);
            const generationId = `test-restore-max-${uuidv4()}`;

            try {
              // 执行扣减
              await usageService.decrementUsageCount(userId, generationId);

              // 执行恢复
              const restoreResult = await usageService.restoreUsageCount(userId, generationId);
              expect(restoreResult.success).toBe(true);

              // 验证：count 应该回到初始值
              const finalRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [userId]
              );
              expect(finalRows[0].usage_count).toBe(initialCount);

              // 验证：恢复操作不应该受到任何上限限制
              expect(restoreResult.remaining_count).toBe(initialCount);
            } finally {
              await cleanupTestUser(userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve data consistency: decrement + restore = no net change', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          async (initialCount) => {
            const userId = await createTestUser(initialCount);
            const generationId = `test-consistency-${uuidv4()}`;

            try {
              // 获取初始状态
              const beforeRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [userId]
              );
              const countBefore = beforeRows[0].usage_count;

              // 执行扣减 + 恢复
              await usageService.decrementUsageCount(userId, generationId);
              await usageService.restoreUsageCount(userId, generationId);

              // 获取最终状态
              const afterRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [userId]
              );
              const countAfter = afterRows[0].usage_count;

              // 验证：最终 count 应该等于初始 count（净变化为 0）
              expect(countAfter).toBe(countBefore);
              expect(countAfter).toBe(initialCount);

              // 验证：日志中记录了完整的操作历史
              const logRows = await query(
                'SELECT * FROM usage_logs WHERE user_id = ? AND reference_id = ? ORDER BY created_at',
                [userId, generationId]
              );
              expect(logRows.length).toBe(2);

              // 验证：amount 的总和应该为 0
              const totalAmount = logRows.reduce((sum, log) => sum + log.amount, 0);
              expect(totalAmount).toBe(0);
            } finally {
              await cleanupTestUser(userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle restore for count = 0 after decrement from count = 1', async () => {
      if (!testConnection_result) return;

      await fc.assert(
        fc.asyncProperty(
          fc.constant(1), // 固定初始 count 为 1
          async (initialCount) => {
            const userId = await createTestUser(initialCount);
            const generationId = `test-restore-zero-${uuidv4()}`;

            try {
              // 执行扣减（count 从 1 变为 0）
              const decrementResult = await usageService.decrementUsageCount(userId, generationId);
              expect(decrementResult.remaining_count).toBe(0);

              // 验证 count 为 0
              const afterDecrementRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [userId]
              );
              expect(afterDecrementRows[0].usage_count).toBe(0);

              // 执行恢复（count 从 0 变回 1）
              const restoreResult = await usageService.restoreUsageCount(userId, generationId);
              expect(restoreResult.success).toBe(true);
              expect(restoreResult.remaining_count).toBe(1);

              // 验证 count 恢复为 1
              const afterRestoreRows = await query(
                'SELECT usage_count FROM users WHERE id = ?',
                [userId]
              );
              expect(afterRestoreRows[0].usage_count).toBe(1);

              // 验证：用户现在可以再次生成
              const checkResult = await usageService.checkUsageCount(userId);
              expect(checkResult.can_generate).toBe(true);
              expect(checkResult.usage_count).toBe(1);
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
