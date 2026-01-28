/**
 * 邀请路由集成测试
 */

const request = require('supertest');
const express = require('express');
const inviteRoutes = require('../inviteRoutes');
const inviteService = require('../../services/inviteService');
const { v4: uuidv4 } = require('uuid');

// 创建测试应用
const app = express();
app.use(express.json());
app.use('/api/invite', inviteRoutes);

// Mock inviteService
jest.mock('../../services/inviteService');

describe('Invite Routes Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/invite/code/:userId', () => {
    it('should return invite code for valid user', async () => {
      const userId = uuidv4();
      const inviteCode = 'ABC12345';

      inviteService.generateInviteCode.mockResolvedValue(inviteCode);

      const response = await request(app)
        .get(`/api/invite/code/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.invite_code).toBe(inviteCode);
      expect(inviteService.generateInviteCode).toHaveBeenCalledWith(userId);
    });

    it('should return 404 for non-existent user', async () => {
      const userId = uuidv4();
      inviteService.generateInviteCode.mockRejectedValue(new Error('用户不存在'));

      const response = await request(app)
        .get(`/api/invite/code/${userId}`)
        .expect(404);

      expect(response.body.error).toBe('USER_NOT_FOUND');
    });
  });

  describe('POST /api/invite/register', () => {
    it('should register invite successfully', async () => {
      const inviteCode = 'ABC12345';
      const newUserId = uuidv4();
      const openid = 'test-openid';
      const inviterId = uuidv4();

      const mockResult = {
        success: true,
        inviter_id: inviterId,
        reward_granted: true
      };

      inviteService.processInviteRegistration.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/invite/register')
        .send({ invite_code: inviteCode, new_user_id: newUserId, openid })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.inviter_id).toBe(inviterId);
      expect(response.body.reward_granted).toBe(true);
      expect(inviteService.processInviteRegistration).toHaveBeenCalledWith(
        inviteCode,
        newUserId,
        openid
      );
    });

    it('should return 400 for invalid invite code', async () => {
      const inviteCode = 'INVALID';
      const newUserId = uuidv4();
      const openid = 'test-openid';

      inviteService.processInviteRegistration.mockRejectedValue(
        new Error('邀请码无效')
      );

      const response = await request(app)
        .post('/api/invite/register')
        .send({ invite_code: inviteCode, new_user_id: newUserId, openid })
        .expect(400);

      expect(response.body.error).toBe('INVALID_INVITE_CODE');
    });

    it('should return 400 for self-invite', async () => {
      const inviteCode = 'ABC12345';
      const newUserId = uuidv4();
      const openid = 'test-openid';

      inviteService.processInviteRegistration.mockRejectedValue(
        new Error('不能使用自己的邀请码')
      );

      const response = await request(app)
        .post('/api/invite/register')
        .send({ invite_code: inviteCode, new_user_id: newUserId, openid })
        .expect(400);

      expect(response.body.error).toBe('SELF_INVITE_NOT_ALLOWED');
    });

    it('should return 400 for duplicate invite', async () => {
      const inviteCode = 'ABC12345';
      const newUserId = uuidv4();
      const openid = 'test-openid';

      inviteService.processInviteRegistration.mockRejectedValue(
        new Error('USER_ALREADY_EXISTS')
      );

      const response = await request(app)
        .post('/api/invite/register')
        .send({ invite_code: inviteCode, new_user_id: newUserId, openid })
        .expect(400);

      expect(response.body.error).toBe('DUPLICATE_INVITE');
    });

    it('should return 400 if invite_code is missing', async () => {
      const newUserId = uuidv4();
      const openid = 'test-openid';

      const response = await request(app)
        .post('/api/invite/register')
        .send({ new_user_id: newUserId, openid })
        .expect(400);

      expect(response.body.error).toBe('INVITE_CODE_REQUIRED');
    });

    it('should return 400 if new_user_id is missing', async () => {
      const inviteCode = 'ABC12345';
      const openid = 'test-openid';

      const response = await request(app)
        .post('/api/invite/register')
        .send({ invite_code: inviteCode, openid })
        .expect(400);

      expect(response.body.error).toBe('USER_ID_REQUIRED');
    });

    it('should return 400 if openid is missing', async () => {
      const inviteCode = 'ABC12345';
      const newUserId = uuidv4();

      const response = await request(app)
        .post('/api/invite/register')
        .send({ invite_code: inviteCode, new_user_id: newUserId })
        .expect(400);

      expect(response.body.error).toBe('OPENID_REQUIRED');
    });
  });

  describe('GET /api/invite/stats/:userId', () => {
    it('should return invite statistics', async () => {
      const userId = uuidv4();
      const lastInviteAt = new Date();
      const mockStats = {
        total_invites: 10,
        successful_invites: 8,
        total_rewards: 8,
        last_invite_at: lastInviteAt
      };

      inviteService.getInviteStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get(`/api/invite/stats/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total_invites).toBe(10);
      expect(response.body.data.successful_invites).toBe(8);
      expect(inviteService.getInviteStats).toHaveBeenCalledWith(userId);
    });

    it('should return zero stats for user with no invites', async () => {
      const userId = uuidv4();
      const mockStats = {
        total_invites: 0,
        successful_invites: 0,
        total_rewards: 0,
        last_invite_at: null
      };

      inviteService.getInviteStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get(`/api/invite/stats/${userId}`)
        .expect(200);

      expect(response.body.data.total_invites).toBe(0);
    });
  });

  describe('GET /api/invite/records/:userId', () => {
    it('should return invite records with default pagination', async () => {
      const userId = uuidv4();
      const createdAt = new Date();
      const mockRecords = {
        records: [
          {
            id: uuidv4(),
            invitee_id: uuidv4(),
            invitee_nickname: '测试用户',
            created_at: createdAt,
            reward_granted: true
          }
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1
      };

      inviteService.getInviteRecords.mockResolvedValue(mockRecords);

      const response = await request(app)
        .get(`/api/invite/records/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.records.length).toBe(1);
      expect(response.body.data.total).toBe(1);
      expect(inviteService.getInviteRecords).toHaveBeenCalledWith(userId, 1, 20);
    });

    it('should return invite records with custom pagination', async () => {
      const userId = uuidv4();
      const mockRecords = {
        records: [],
        total: 0,
        page: 2,
        pageSize: 10,
        totalPages: 0
      };

      inviteService.getInviteRecords.mockResolvedValue(mockRecords);

      const response = await request(app)
        .get(`/api/invite/records/${userId}`)
        .query({ page: 2, pageSize: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(inviteService.getInviteRecords).toHaveBeenCalledWith(userId, 2, 10);
    });
  });

  describe('GET /api/invite/validate/:inviteCode', () => {
    it('should validate invite code successfully', async () => {
      const inviteCode = 'ABC12345';
      const inviterId = uuidv4();
      const mockResult = {
        valid: true,
        inviter_id: inviterId,
        inviter_nickname: '邀请人'
      };

      inviteService.validateInviteCode.mockResolvedValue(mockResult);

      const response = await request(app)
        .get(`/api/invite/validate/${inviteCode}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.valid).toBe(true);
      expect(response.body.inviter_id).toBe(inviterId);
      expect(inviteService.validateInviteCode).toHaveBeenCalledWith(inviteCode);
    });

    it('should return 400 for invalid invite code', async () => {
      const inviteCode = 'INVALID';
      const mockResult = {
        valid: false,
        inviter_id: null,
        inviter_nickname: null,
        error: '邀请码不存在'
      };

      inviteService.validateInviteCode.mockResolvedValue(mockResult);

      const response = await request(app)
        .get(`/api/invite/validate/${inviteCode}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('INVALID_INVITE_CODE');
    });
  });
});
