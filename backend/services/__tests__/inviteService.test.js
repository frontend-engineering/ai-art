/**
 * 邀请服务单元测试
 */

const { generateInviteCode, validateInviteCode, processInviteRegistration, getInviteStats, getInviteRecords } = require('../inviteService');
const { query } = require('../../db/connection');
const { v4: uuidv4 } = require('uuid');

// Mock the database connection
jest.mock('../../db/connection');

describe('inviteService', () => {
  describe('generateInviteCode', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('应该为没有邀请码的用户生成新的邀请码', async () => {
      const userId = uuidv4();
      
      // Mock: 用户存在但没有邀请码
      query
        .mockResolvedValueOnce([{ invite_code: null }]) // 第一次查询：用户没有邀请码
        .mockResolvedValueOnce([{ count: 0 }]) // 第二次查询：邀请码唯一性检查
        .mockResolvedValueOnce({}); // 第三次查询：更新邀请码
      
      const inviteCode = await generateInviteCode(userId);
      
      expect(inviteCode).toBeDefined();
      expect(typeof inviteCode).toBe('string');
      expect(inviteCode.length).toBe(8);
      expect(/^[0-9A-Z]{8}$/.test(inviteCode)).toBe(true);
      
      // 验证调用了更新SQL
      expect(query).toHaveBeenCalledTimes(3);
    });

    it('应该返回已存在的邀请码', async () => {
      const userId = uuidv4();
      const existingCode = 'ABC12345';
      
      // Mock: 用户已有邀请码
      query.mockResolvedValueOnce([{ invite_code: existingCode }]);
      
      const inviteCode = await generateInviteCode(userId);
      
      expect(inviteCode).toBe(existingCode);
      expect(query).toHaveBeenCalledTimes(1);
    });

    it('应该在用户不存在时抛出错误', async () => {
      const userId = uuidv4();
      
      // Mock: 用户不存在
      query.mockResolvedValueOnce([]);
      
      await expect(generateInviteCode(userId)).rejects.toThrow('用户');
    });

    it('应该在无法生成唯一邀请码时抛出错误', async () => {
      const userId = uuidv4();
      
      // Mock: 用户存在但没有邀请码
      query.mockResolvedValueOnce([{ invite_code: null }]);
      
      // Mock: 所有邀请码都已存在（模拟碰撞）
      for (let i = 0; i < 10; i++) {
        query.mockResolvedValueOnce([{ count: 1 }]);
      }
      
      await expect(generateInviteCode(userId)).rejects.toThrow('生成唯一邀请码失败');
    });
  });

  describe('validateInviteCode', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('应该验证有效的邀请码', async () => {
      const inviteCode = 'ABC12345';
      const inviterId = uuidv4();
      const inviterNickname = '测试用户';
      
      // Mock: 邀请码存在
      query.mockResolvedValueOnce([
        { id: inviterId, nickname: inviterNickname }
      ]);
      
      const result = await validateInviteCode(inviteCode);
      
      expect(result.valid).toBe(true);
      expect(result.inviter_id).toBe(inviterId);
      expect(result.inviter_nickname).toBe(inviterNickname);
      expect(result.error).toBeUndefined();
    });

    it('应该拒绝不存在的邀请码', async () => {
      const inviteCode = 'INVALID1';
      
      // Mock: 邀请码不存在
      query.mockResolvedValueOnce([]);
      
      const result = await validateInviteCode(inviteCode);
      
      expect(result.valid).toBe(false);
      expect(result.inviter_id).toBeNull();
      expect(result.inviter_nickname).toBeNull();
      expect(result.error).toBe('邀请码不存在');
    });

    it('应该拒绝格式无效的邀请码（null）', async () => {
      const result = await validateInviteCode(null);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('邀请码格式无效');
      expect(query).not.toHaveBeenCalled();
    });

    it('应该拒绝格式无效的邀请码（非字符串）', async () => {
      const result = await validateInviteCode(12345678);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('邀请码格式无效');
      expect(query).not.toHaveBeenCalled();
    });

    it('应该拒绝长度不正确的邀请码', async () => {
      const result = await validateInviteCode('ABC123');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('邀请码长度必须为8位');
      expect(query).not.toHaveBeenCalled();
    });

    it('应该处理没有昵称的用户', async () => {
      const inviteCode = 'ABC12345';
      const inviterId = uuidv4();
      
      // Mock: 邀请码存在但用户没有昵称
      query.mockResolvedValueOnce([
        { id: inviterId, nickname: null }
      ]);
      
      const result = await validateInviteCode(inviteCode);
      
      expect(result.valid).toBe(true);
      expect(result.inviter_id).toBe(inviterId);
      expect(result.inviter_nickname).toBe('未知用户');
    });
  });

  describe('processInviteRegistration', () => {
    let mockConnection;
    let mockPool;

    beforeEach(() => {
      // Mock connection object
      mockConnection = {
        execute: jest.fn(),
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
      };

      // Mock pool
      mockPool = {
        getConnection: jest.fn().mockResolvedValue(mockConnection)
      };

      // Mock the pool in the connection module
      require('../../db/connection').pool = mockPool;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('应该成功处理有效的邀请注册', async () => {
      const inviteCode = 'ABC12345';
      const newUserId = uuidv4();
      const openid = 'test-openid-123';
      const inviterId = uuidv4();

      // Mock validateInviteCode
      query.mockResolvedValueOnce([
        { id: inviterId, nickname: '邀请人' }
      ]);

      // Mock: 验证新用户不存在
      mockConnection.execute
        .mockResolvedValueOnce([[]])  // 用户不存在检查
        .mockResolvedValueOnce([{}])  // 创建新用户
        .mockResolvedValueOnce([{}])  // 创建invite_records
        .mockResolvedValueOnce([{}])  // 更新inviter的usage_count
        .mockResolvedValueOnce([[{ usage_count: 4 }]])  // 获取inviter的新usage_count
        .mockResolvedValueOnce([{}])  // 插入usage_logs
        .mockResolvedValueOnce([[]])  // 检查invite_stats是否存在
        .mockResolvedValueOnce([{}]); // 创建invite_stats

      const result = await processInviteRegistration(inviteCode, newUserId, openid);

      expect(result.success).toBe(true);
      expect(result.inviter_id).toBe(inviterId);
      expect(result.reward_granted).toBe(true);
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.rollback).not.toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('应该拒绝自我邀请', async () => {
      const inviteCode = 'ABC12345';
      const userId = uuidv4();
      const openid = 'test-openid-123';

      // Mock validateInviteCode - 返回相同的用户ID
      query.mockResolvedValueOnce([
        { id: userId, nickname: '自己' }
      ]);

      await expect(
        processInviteRegistration(inviteCode, userId, openid)
      ).rejects.toThrow('不能使用自己的邀请码');

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.commit).not.toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('应该拒绝已存在的用户', async () => {
      const inviteCode = 'ABC12345';
      const newUserId = uuidv4();
      const openid = 'test-openid-123';
      const inviterId = uuidv4();

      // Mock validateInviteCode
      query.mockResolvedValueOnce([
        { id: inviterId, nickname: '邀请人' }
      ]);

      // Mock: 用户已存在
      mockConnection.execute.mockResolvedValueOnce([
        [{ id: newUserId }]
      ]);

      await expect(
        processInviteRegistration(inviteCode, newUserId, openid)
      ).rejects.toThrow('该用户已存在，不能重复邀请');

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.commit).not.toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('应该拒绝无效的邀请码', async () => {
      const inviteCode = 'INVALID1';
      const newUserId = uuidv4();
      const openid = 'test-openid-123';

      // Mock validateInviteCode - 返回无效
      query.mockResolvedValueOnce([]);

      await expect(
        processInviteRegistration(inviteCode, newUserId, openid)
      ).rejects.toThrow();

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.commit).not.toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('应该更新现有的invite_stats记录', async () => {
      const inviteCode = 'ABC12345';
      const newUserId = uuidv4();
      const openid = 'test-openid-123';
      const inviterId = uuidv4();

      // Mock validateInviteCode
      query.mockResolvedValueOnce([
        { id: inviterId, nickname: '邀请人' }
      ]);

      // Mock: 验证新用户不存在
      mockConnection.execute
        .mockResolvedValueOnce([[]])  // 用户不存在检查
        .mockResolvedValueOnce([{}])  // 创建新用户
        .mockResolvedValueOnce([{}])  // 创建invite_records
        .mockResolvedValueOnce([{}])  // 更新inviter的usage_count
        .mockResolvedValueOnce([[{ usage_count: 5 }]])  // 获取inviter的新usage_count
        .mockResolvedValueOnce([{}])  // 插入usage_logs
        .mockResolvedValueOnce([[{ user_id: inviterId }]])  // invite_stats已存在
        .mockResolvedValueOnce([{}]); // 更新invite_stats

      const result = await processInviteRegistration(inviteCode, newUserId, openid);

      expect(result.success).toBe(true);
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('getInviteStats', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('应该返回用户的邀请统计', async () => {
      const userId = uuidv4();
      const stats = {
        total_invites: 5,
        successful_invites: 5,
        total_rewards: 5,
        last_invite_at: new Date()
      };

      // Mock: 查询统计数据
      query.mockResolvedValueOnce([stats]);

      const result = await getInviteStats(userId);

      expect(result.total_invites).toBe(5);
      expect(result.successful_invites).toBe(5);
      expect(result.total_rewards).toBe(5);
      expect(result.last_invite_at).toBeDefined();
    });

    it('应该为没有邀请记录的用户返回零值', async () => {
      const userId = uuidv4();

      // Mock: 没有统计记录
      query.mockResolvedValueOnce([]);

      const result = await getInviteStats(userId);

      expect(result.total_invites).toBe(0);
      expect(result.successful_invites).toBe(0);
      expect(result.total_rewards).toBe(0);
      expect(result.last_invite_at).toBeNull();
    });
  });

  describe('getInviteRecords', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('应该返回分页的邀请记录', async () => {
      const userId = uuidv4();
      const mockRecords = [
        {
          id: uuidv4(),
          invitee_id: uuidv4(),
          invitee_nickname: '用户1',
          created_at: new Date(),
          reward_granted: true
        },
        {
          id: uuidv4(),
          invitee_id: uuidv4(),
          invitee_nickname: '用户2',
          created_at: new Date(),
          reward_granted: true
        }
      ];

      // Mock: 查询总数
      query.mockResolvedValueOnce([{ total: 2 }]);
      // Mock: 查询记录
      query.mockResolvedValueOnce(mockRecords);

      const result = await getInviteRecords(userId, 1, 20);

      expect(result.records.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('应该处理空记录列表', async () => {
      const userId = uuidv4();

      // Mock: 没有记录
      query.mockResolvedValueOnce([{ total: 0 }]);
      query.mockResolvedValueOnce([]);

      const result = await getInviteRecords(userId, 1, 20);

      expect(result.records.length).toBe(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('应该正确处理分页参数', async () => {
      const userId = uuidv4();

      // Mock: 查询总数
      query.mockResolvedValueOnce([{ total: 50 }]);
      // Mock: 查询记录
      query.mockResolvedValueOnce([]);

      const result = await getInviteRecords(userId, 2, 10);

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(5);
      
      // 验证 OFFSET 计算正确
      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        [userId, 10, 10] // LIMIT 10 OFFSET 10
      );
    });
  });

  describe('Property 13: 新用户邀请验证', () => {
    /**
     * **Validates: Requirements 5.4**
     * 
     * 对于任何已存在的用户，使用 invite_code 注册应该被拒绝，
     * 不创建邀请记录，不发放奖励。
     */
    let mockConnection;
    let mockPool;

    beforeEach(() => {
      mockConnection = {
        execute: jest.fn(),
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
      };

      mockPool = {
        getConnection: jest.fn().mockResolvedValue(mockConnection)
      };

      require('../../db/connection').pool = mockPool;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('应该拒绝已存在用户的邀请注册', async () => {
      const inviteCode = 'ABC12345';
      const existingUserId = uuidv4();
      const openid = 'existing-openid';
      const inviterId = uuidv4();

      // Mock validateInviteCode
      query.mockResolvedValueOnce([
        { id: inviterId, nickname: '邀请人' }
      ]);

      // Mock: 用户已存在
      mockConnection.execute.mockResolvedValueOnce([
        [{ id: existingUserId }]
      ]);

      await expect(
        processInviteRegistration(inviteCode, existingUserId, openid)
      ).rejects.toThrow('该用户已存在，不能重复邀请');

      // 验证：事务被回滚
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.commit).not.toHaveBeenCalled();
    });

    it('应该拒绝通过openid已存在的用户', async () => {
      const inviteCode = 'ABC12345';
      const newUserId = uuidv4();
      const existingOpenid = 'existing-openid';
      const inviterId = uuidv4();

      // Mock validateInviteCode
      query.mockResolvedValueOnce([
        { id: inviterId, nickname: '邀请人' }
      ]);

      // Mock: openid已存在
      mockConnection.execute.mockResolvedValueOnce([
        [{ id: uuidv4() }] // 返回已存在的用户
      ]);

      await expect(
        processInviteRegistration(inviteCode, newUserId, existingOpenid)
      ).rejects.toThrow('该用户已存在，不能重复邀请');

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.commit).not.toHaveBeenCalled();
    });

    it('应该确保已存在用户不创建邀请记录', async () => {
      const inviteCode = 'ABC12345';
      const existingUserId = uuidv4();
      const openid = 'existing-openid';
      const inviterId = uuidv4();

      // Mock validateInviteCode
      query.mockResolvedValueOnce([
        { id: inviterId, nickname: '邀请人' }
      ]);

      // Mock: 用户已存在
      mockConnection.execute.mockResolvedValueOnce([
        [{ id: existingUserId }]
      ]);

      try {
        await processInviteRegistration(inviteCode, existingUserId, openid);
      } catch (error) {
        // 预期会抛出错误
      }

      // 验证：没有调用创建 invite_records 的 SQL
      const executeCalls = mockConnection.execute.mock.calls;
      const hasInviteRecordInsert = executeCalls.some(call => 
        call[0] && call[0].includes('INSERT INTO invite_records')
      );
      expect(hasInviteRecordInsert).toBe(false);
    });

    it('应该确保已存在用户不发放奖励', async () => {
      const inviteCode = 'ABC12345';
      const existingUserId = uuidv4();
      const openid = 'existing-openid';
      const inviterId = uuidv4();

      // Mock validateInviteCode
      query.mockResolvedValueOnce([
        { id: inviterId, nickname: '邀请人' }
      ]);

      // Mock: 用户已存在
      mockConnection.execute.mockResolvedValueOnce([
        [{ id: existingUserId }]
      ]);

      try {
        await processInviteRegistration(inviteCode, existingUserId, openid);
      } catch (error) {
        // 预期会抛出错误
      }

      // 验证：没有调用更新 usage_count 的 SQL
      const executeCalls = mockConnection.execute.mock.calls;
      const hasUsageCountUpdate = executeCalls.some(call => 
        call[0] && call[0].includes('UPDATE users SET usage_count')
      );
      expect(hasUsageCountUpdate).toBe(false);
    });
  });

  describe('Property 14: 自我邀请防护', () => {
    /**
     * **Validates: Requirements 5.6**
     * 
     * 对于任何用户，使用自己的 invite_code 应该被系统拒绝。
     */
    let mockConnection;
    let mockPool;

    beforeEach(() => {
      mockConnection = {
        execute: jest.fn(),
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
      };

      mockPool = {
        getConnection: jest.fn().mockResolvedValue(mockConnection)
      };

      require('../../db/connection').pool = mockPool;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('应该拒绝用户使用自己的邀请码', async () => {
      const userId = uuidv4();
      const inviteCode = 'SELF1234';
      const openid = 'test-openid';

      // Mock validateInviteCode - 返回相同的用户ID
      query.mockResolvedValueOnce([
        { id: userId, nickname: '自己' }
      ]);

      await expect(
        processInviteRegistration(inviteCode, userId, openid)
      ).rejects.toThrow('不能使用自己的邀请码');

      // 验证：事务被回滚
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.commit).not.toHaveBeenCalled();
    });

    it('应该在自我邀请时不创建任何记录', async () => {
      const userId = uuidv4();
      const inviteCode = 'SELF1234';
      const openid = 'test-openid';

      // Mock validateInviteCode
      query.mockResolvedValueOnce([
        { id: userId, nickname: '自己' }
      ]);

      try {
        await processInviteRegistration(inviteCode, userId, openid);
      } catch (error) {
        // 预期会抛出错误
      }

      // 验证：没有执行任何数据库写入操作
      expect(mockConnection.execute).not.toHaveBeenCalled();
    });

    it('应该在检测到自我邀请时立即返回错误', async () => {
      const userId = uuidv4();
      const inviteCode = 'SELF1234';
      const openid = 'test-openid';

      // Mock validateInviteCode
      query.mockResolvedValueOnce([
        { id: userId, nickname: '自己' }
      ]);

      const startTime = Date.now();
      
      try {
        await processInviteRegistration(inviteCode, userId, openid);
      } catch (error) {
        const endTime = Date.now();
        
        // 验证：快速失败（不应该执行复杂的数据库操作）
        expect(endTime - startTime).toBeLessThan(100);
        expect(error.message).toContain('不能使用自己的邀请码');
      }
    });
  });

  describe('Property 27: 无效邀请码拒绝', () => {
    /**
     * **Validates: Requirements 11.2**
     * 
     * 对于任何不存在的或格式错误的 invite_code，
     * 注册请求应该被拒绝并返回错误。
     */
    let mockConnection;
    let mockPool;

    beforeEach(() => {
      mockConnection = {
        execute: jest.fn(),
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
      };

      mockPool = {
        getConnection: jest.fn().mockResolvedValue(mockConnection)
      };

      require('../../db/connection').pool = mockPool;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('应该拒绝不存在的邀请码', async () => {
      const inviteCode = 'NOTEXIST';
      const newUserId = uuidv4();
      const openid = 'test-openid';

      // Mock validateInviteCode - 邀请码不存在
      query.mockResolvedValueOnce([]);

      await expect(
        processInviteRegistration(inviteCode, newUserId, openid)
      ).rejects.toThrow();

      // 验证：事务被回滚
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.commit).not.toHaveBeenCalled();
    });

    it('应该拒绝格式错误的邀请码（长度不正确）', async () => {
      const shortCode = 'ABC123'; // 只有6位
      const newUserId = uuidv4();
      const openid = 'test-openid';

      // validateInviteCode 会在内部检查格式
      const validation = await validateInviteCode(shortCode);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('邀请码长度必须为8位');
    });

    it('应该拒绝null邀请码', async () => {
      const validation = await validateInviteCode(null);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('邀请码格式无效');
    });

    it('应该拒绝非字符串邀请码', async () => {
      const validation = await validateInviteCode(12345678);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('邀请码格式无效');
    });

    it('应该在邀请码无效时不执行任何数据库写入', async () => {
      const inviteCode = 'INVALID1';
      const newUserId = uuidv4();
      const openid = 'test-openid';

      // Mock validateInviteCode - 邀请码不存在
      query.mockResolvedValueOnce([]);

      try {
        await processInviteRegistration(inviteCode, newUserId, openid);
      } catch (error) {
        // 预期会抛出错误
      }

      // 验证：没有调用任何 execute（数据库写入）
      expect(mockConnection.execute).not.toHaveBeenCalled();
    });

    it('应该返回清晰的错误信息', async () => {
      const inviteCode = 'NOTEXIST';
      const newUserId = uuidv4();
      const openid = 'test-openid';

      // Mock validateInviteCode - 邀请码不存在
      query.mockResolvedValueOnce([]);

      try {
        await processInviteRegistration(inviteCode, newUserId, openid);
        fail('应该抛出错误');
      } catch (error) {
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
      }
    });
  });
});
