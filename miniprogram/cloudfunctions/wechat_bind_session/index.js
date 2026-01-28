/**
 * 绑定登录会话云函数
 * 用于 Web 扫码登录，将 token 绑定到 sessionId
 */
const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { sessionId, token, status = 'success' } = event;
  
  console.log('[wechat_bind_session] 收到绑定请求:', { sessionId, hasToken: !!token, status });
  
  if (!sessionId) {
    return { code: -1, msg: '缺少 sessionId' };
  }
  
  if (!token) {
    return { code: -1, msg: '缺少 token' };
  }
  
  try {
    const apiBaseUrl = process.env.API_BASE_URL;
    
    if (!apiBaseUrl) {
      console.error('[wechat_bind_session] API_BASE_URL 未配置');
      return { code: -1, msg: 'API_BASE_URL 未配置' };
    }
    
    // 调用后端 API 绑定 session
    const response = await axios.post(
      `${apiBaseUrl}/api/auth/bind-session`,
      {
        sessionId,
        token,
        status
      },
      {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': process.env.INTERNAL_API_SECRET || ''
        }
      }
    );
    
    console.log('[wechat_bind_session] 绑定成功:', response.data);
    
    return { code: 0, msg: 'success', data: response.data };
    
  } catch (error) {
    console.error('[wechat_bind_session] 绑定失败:', error.message);
    
    if (error.response) {
      return { 
        code: -1, 
        msg: error.response.data?.error || '绑定失败',
        status: error.response.status
      };
    }
    
    return { code: -1, msg: error.message || '绑定失败' };
  }
};
