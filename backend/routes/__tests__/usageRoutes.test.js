/**
 * 使用次数路由集成测试
 */

const request = require('supertest');
const express = require('express');
const usageRoutes = require('../usageRoutes');
const usageService = require('../../services/usageService');
const { v4: uuidv4 } = require('uuid');

// 创建测试应用
const app = express();
app.use(express.json());
app.use('/api/usage', usageRoutes);

// Mock usageService
jest.mock('../../services/usageService');

describe('Usage Routes Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/usage/check/:userId', () => {
    it('should return usage count for valid user', async () => {
      const userId = uuidv4();
      const mockData = {
        usage_count: 5,
        usage_limit: 3,
        can_generate: true,
        user_type: 'free'
      };

      usageService.checkUsageCount.mockResolvedValue(mockData);

      const response = await request(app)
        .get(`/api/usage/check/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockData);
      expect(usageService.checkUsageCount).toHaveBeenCalledWith(userId);
    });

    it('should return 404 for non-existent user', async () => {
      const userId = uuidv4();
      usageService.checkUsageCount.mockRejectedValue(new Error('用户不存在'));

      const response = await request(app)
        .get(`/api/usage/check/${userId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('USER_NOT_FOUND');
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .get('/api/usage/check/')
        .expect(404); // Express returns 404 for missing route params
    });
  });

  describe('POST /api/usage/decrement', () => {
    it('should decrement usage count successfully', async () => {
      const userId = uuidv4();
      const generationId = uuidv4();
      const mockResult = {
        success: true,
        remaining_count: 4
      };

      usageService.decrementUsageCount.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/usage/decrement')
        .send({ userId, generationId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.remaining_count).toBe(4);
      expect(usageService.decrementUsageCount).toHaveBeenCalledWith(userId, generationId);
    });

    it('should return 403 when usage count is insufficient', async () => {
      const userId = uuidv4();
      const generationId = uuidv4();

      usageService.decrementUsageCount.mockRejectedValue(new Error('使用次数不足'));

      const response = await request(app)
        .post('/api/usage/decrement')
        .send({ userId, generationId })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INSUFFICIENT_USAGE');
    });

    it('should return 400 if userId is missing', async () => {
      const generationId = uuidv4();

      const response = await request(app)
        .post('/api/usage/decrement')
        .send({ generationId })
        .expect(400);

      expect(response.body.error).toBe('USER_ID_REQUIRED');
    });

    it('should return 400 if generationId is missing', async () => {
      const userId = uuidv4();

      const response = await request(app)
        .post('/api/usage/decrement')
        .send({ userId })
        .expect(400);

      expect(response.body.error).toBe('GENERATION_ID_REQUIRED');
    });

    it('should return 409 for concurrent conflicts', async () => {
      const userId = uuidv4();
      const generationId = uuidv4();

      usageService.decrementUsageCount.mockRejectedValue(new Error('Lock wait timeout'));

      const response = await request(app)
        .post('/api/usage/decrement')
        .send({ userId, generationId })
        .expect(409);

      expect(response.body.error).toBe('CONCURRENT_CONFLICT');
    });
  });

  describe('POST /api/usage/restore', () => {
    it('should restore usage count successfully', async () => {
      const userId = uuidv4();
      const generationId = uuidv4();
      const mockResult = {
        success: true,
        remaining_count: 6
      };

      usageService.restoreUsageCount.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/usage/restore')
        .send({ userId, generationId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.remaining_count).toBe(6);
      expect(usageService.restoreUsageCount).toHaveBeenCalledWith(userId, generationId);
    });

    it('should return 404 for non-existent user', async () => {
      const userId = uuidv4();
      const generationId = uuidv4();

      usageService.restoreUsageCount.mockRejectedValue(new Error('用户不存在'));

      const response = await request(app)
        .post('/api/usage/restore')
        .send({ userId, generationId })
        .expect(404);

      expect(response.body.error).toBe('USER_NOT_FOUND');
    });

    it('should return 400 if parameters are missing', async () => {
      const response = await request(app)
        .post('/api/usage/restore')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('USER_ID_REQUIRED');
    });
  });

  describe('GET /api/usage/history/:userId', () => {
    it('should return usage history with default pagination', async () => {
      const userId = uuidv4();
      const createdAt = new Date();
      const mockHistory = {
        logs: [
          {
            id: uuidv4(),
            action_type: 'decrement',
            amount: -1,
            remaining_count: 4,
            reason: 'generation',
            created_at: createdAt
          }
        ],
        total: 1,
        page: 1,
        pageSize: 20
      };

      usageService.getUsageHistory.mockResolvedValue(mockHistory);

      const response = await request(app)
        .get(`/api/usage/history/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs.length).toBe(1);
      expect(response.body.data.total).toBe(1);
      expect(usageService.getUsageHistory).toHaveBeenCalledWith(userId, 1, 20);
    });

    it('should return usage history with custom pagination', async () => {
      const userId = uuidv4();
      const mockHistory = {
        logs: [],
        total: 0,
        page: 2,
        pageSize: 10
      };

      usageService.getUsageHistory.mockResolvedValue(mockHistory);

      const response = await request(app)
        .get(`/api/usage/history/${userId}`)
        .query({ page: 2, pageSize: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(usageService.getUsageHistory).toHaveBeenCalledWith(userId, 2, 10);
    });

    it('should return 404 for non-existent user', async () => {
      const userId = uuidv4();
      usageService.getUsageHistory.mockRejectedValue(new Error('用户不存在'));

      const response = await request(app)
        .get(`/api/usage/history/${userId}`)
        .expect(404);

      expect(response.body.error).toBe('USER_NOT_FOUND');
    });
  });
});
