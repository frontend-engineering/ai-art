/**
 * 微信小程序路由测试
 */

// 设置环境变量 - 必须在 require 之前
process.env.WECHAT_APPID = 'test_appid';
process.env.WECHAT_SECRET = 'test_secret';

const express = require('express');
const request = require('supertest');

// Mock dependencies
jest.mock('axios');
jest.mock('../../services/userService');
jest.mock('../../services/errorLogService');

const axios = require('axios');
const userService = require('../../services/userService');
const errorLogService = require('../../services/errorLogService');

// 在 mock 设置后再 require wechatRoutes
const wechatRoutes = require('../wechatRoutes');

describe('微信小程序路由', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/wechat', wechatRoutes);
    
    // 重置所有 mock
    jest.clearAllMocks();
    errorLogService.logError = jest.fn().mockResolvedValue();
  });

  describe('POST /api/wechat/login', () => {
    it('缺少 code 参数时返回 400', async () => {
      const response = await request(app)
        .post('/api/wechat/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('缺少登录凭证 code');
    });

    it('微信接口返回错误时返回 400', async () => {
      axios.get.mockResolvedValue({
        data: {
          errcode: 40029,
          errmsg: 'invalid code'
        }
      });

      const response = await request(app)
        .post('/api/wechat/login')
        .send({ code: 'invalid_code' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('新用户登录成功时创建用户并返回 token', async () => {
      const mockOpenid = 'test_openid_123';
      const mockUserId = 'test_user_id';
      
      axios.get.mockResolvedValue({
        data: {
          openid: mockOpenid,
          session_key: 'test_session_key'
        }
      });

      userService.getUserByOpenid.mockResolvedValue(null);
      userService.createUserWithOpenid.mockResolvedValue({
        id: mockUserId,
        openid: mockOpenid,
        payment_status: 'free'
      });

      const response = await request(app)
        .post('/api/wechat/login')
        .send({ code: 'valid_code' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(mockUserId);
      expect(response.body.data.openid).toBe(mockOpenid);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.paymentStatus).toBe('free');
    });

    it('已存在用户登录成功时返回现有用户', async () => {
      const mockOpenid = 'existing_openid';
      const mockUserId = 'existing_user_id';
      
      axios.get.mockResolvedValue({
        data: {
          openid: mockOpenid,
          session_key: 'test_session_key'
        }
      });

      userService.getUserByOpenid.mockResolvedValue({
        id: mockUserId,
        openid: mockOpenid,
        payment_status: 'premium'
      });

      const response = await request(app)
        .post('/api/wechat/login')
        .send({ code: 'valid_code' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(mockUserId);
      expect(response.body.data.paymentStatus).toBe('premium');
      expect(userService.createUserWithOpenid).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/wechat/qrcode', () => {
    it('成功生成小程序码', async () => {
      // Mock access_token 请求
      axios.get.mockResolvedValue({
        data: {
          access_token: 'test_access_token'
        }
      });

      // Mock 小程序码生成请求
      const mockImageBuffer = Buffer.from('fake_image_data');
      axios.post.mockResolvedValue({
        data: mockImageBuffer,
        headers: {
          'content-type': 'image/png'
        }
      });

      const response = await request(app)
        .post('/api/wechat/qrcode')
        .send({ path: 'pages/launch/launch', width: 280 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.qrCodeUrl).toContain('data:image/png;base64,');
    });

    it('获取 access_token 失败时返回 500', async () => {
      axios.get.mockResolvedValue({
        data: {
          errcode: 40001,
          errmsg: 'invalid credential'
        }
      });

      const response = await request(app)
        .post('/api/wechat/qrcode')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
