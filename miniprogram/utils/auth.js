/**
 * 微信登录认证模块
 * 实现微信登录、登录状态检查、用户信息获取等功能
 */

const { wechatAPI, userAPI } = require('./api');

/**
 * 微信登录完整流程
 * 1. 调用 wx.login 获取 code
 * 2. 调用后端接口换取 session
 * 3. 存储用户信息到本地
 * @returns {Promise<Object>} 登录结果
 */
const login = () => {
  return new Promise((resolve, reject) => {
    // 1. 调用 wx.login 获取 code
    wx.login({
      success: async (loginRes) => {
        if (!loginRes.code) {
          console.error('[Auth] 获取登录凭证失败');
          reject(new Error('获取登录凭证失败'));
          return;
        }

        console.log('[Auth] 获取到 code:', loginRes.code.substring(0, 10) + '...');

        try {
          // 2. 调用后端接口换取 session
          const result = await wechatAPI.login(loginRes.code);

          if (!result.success) {
            throw new Error(result.message || '登录失败');
          }

          const { userId, openid, token, paymentStatus } = result.data;

          // 3. 存储用户信息到本地
          wx.setStorageSync('userId', userId);
          wx.setStorageSync('openid', openid);
          wx.setStorageSync('token', token);
          wx.setStorageSync('paymentStatus', paymentStatus || 'free');
          wx.setStorageSync('loginTime', Date.now());

          console.log('[Auth] 登录成功:', { userId, openid: openid.substring(0, 10) + '...' });

          resolve(result.data);

        } catch (err) {
          console.error('[Auth] 后端登录失败:', err);
          
          // 如果后端登录接口不存在，使用本地模式
          if (err.code === 404 || err.message?.includes('404')) {
            console.log('[Auth] 后端登录接口不存在，使用本地模式');
            const localResult = await loginLocal();
            resolve(localResult);
            return;
          }
          
          reject(err);
        }
      },
      fail: (err) => {
        console.error('[Auth] wx.login 失败:', err);
        reject(new Error('微信登录失败'));
      }
    });
  });
};

/**
 * 本地登录模式（后端登录接口不可用时使用）
 * 生成本地用户ID，调用用户初始化接口
 * @returns {Promise<Object>} 登录结果
 */
const loginLocal = async () => {
  // 生成本地用户ID
  let userId = wx.getStorageSync('userId');
  if (!userId) {
    userId = 'wx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  }

  try {
    // 调用用户初始化接口
    const result = await userAPI.initUser(userId);
    
    if (result.success && result.data) {
      const user = result.data;
      
      // 存储用户信息
      wx.setStorageSync('userId', user.id || userId);
      wx.setStorageSync('paymentStatus', user.payment_status || 'free');
      wx.setStorageSync('loginTime', Date.now());

      console.log('[Auth] 本地登录成功:', { userId: user.id || userId });

      return {
        userId: user.id || userId,
        paymentStatus: user.payment_status || 'free'
      };
    }
  } catch (err) {
    console.error('[Auth] 用户初始化失败:', err);
  }

  // 即使初始化失败，也存储本地用户ID
  wx.setStorageSync('userId', userId);
  wx.setStorageSync('paymentStatus', 'free');
  wx.setStorageSync('loginTime', Date.now());

  return {
    userId,
    paymentStatus: 'free'
  };
};

/**
 * 检查登录状态
 * @returns {boolean} 是否已登录
 */
const checkLogin = () => {
  const token = wx.getStorageSync('token');
  const userId = wx.getStorageSync('userId');
  const loginTime = wx.getStorageSync('loginTime');

  // 检查是否有用户ID
  if (!userId) {
    return false;
  }

  // 如果有 token，检查是否过期（7天）
  if (token && loginTime) {
    const expireTime = 7 * 24 * 60 * 60 * 1000; // 7天
    if (Date.now() - loginTime > expireTime) {
      console.log('[Auth] Token 已过期');
      return false;
    }
  }

  return true;
};

/**
 * 获取用户信息
 * @returns {Object} 用户信息
 */
const getUserInfo = () => {
  return {
    userId: wx.getStorageSync('userId') || '',
    openid: wx.getStorageSync('openid') || '',
    token: wx.getStorageSync('token') || '',
    paymentStatus: wx.getStorageSync('paymentStatus') || 'free',
    loginTime: wx.getStorageSync('loginTime') || 0
  };
};

/**
 * 获取用户ID
 * @returns {string} 用户ID
 */
const getUserId = () => {
  return wx.getStorageSync('userId') || '';
};

/**
 * 获取用户 openid
 * @returns {string} openid
 */
const getOpenid = () => {
  return wx.getStorageSync('openid') || '';
};

/**
 * 获取用户付费状态
 * @returns {string} 付费状态
 */
const getPaymentStatus = () => {
  return wx.getStorageSync('paymentStatus') || 'free';
};

/**
 * 更新用户付费状态
 * @param {string} status 付费状态
 */
const updatePaymentStatus = (status) => {
  wx.setStorageSync('paymentStatus', status);
};

/**
 * 退出登录
 * 清除所有本地存储的用户信息
 */
const logout = () => {
  wx.removeStorageSync('userId');
  wx.removeStorageSync('openid');
  wx.removeStorageSync('token');
  wx.removeStorageSync('paymentStatus');
  wx.removeStorageSync('loginTime');
  
  console.log('[Auth] 已退出登录');
};

/**
 * 刷新 token（当 token 过期时调用）
 * @returns {Promise<Object>} 新的登录信息
 */
const refreshToken = async () => {
  console.log('[Auth] 刷新 token');
  // 重新登录获取新 token
  return await login();
};

/**
 * 确保已登录
 * 如果未登录则自动登录
 * @returns {Promise<Object>} 用户信息
 */
const ensureLogin = async () => {
  if (checkLogin()) {
    return getUserInfo();
  }
  
  console.log('[Auth] 未登录，自动登录');
  return await login();
};

/**
 * 同步用户信息
 * 从服务器获取最新的用户信息并更新本地存储
 * @returns {Promise<Object>} 用户信息
 */
const syncUserInfo = async () => {
  const userId = getUserId();
  if (!userId) {
    throw new Error('用户未登录');
  }

  try {
    const result = await userAPI.getUser(userId);
    if (result.success && result.data) {
      const user = result.data;
      
      // 更新本地存储
      if (user.payment_status) {
        wx.setStorageSync('paymentStatus', user.payment_status);
      }

      console.log('[Auth] 用户信息同步成功');
      return user;
    }
  } catch (err) {
    console.error('[Auth] 同步用户信息失败:', err);
    throw err;
  }
};

module.exports = {
  login,
  loginLocal,
  checkLogin,
  getUserInfo,
  getUserId,
  getOpenid,
  getPaymentStatus,
  updatePaymentStatus,
  logout,
  refreshToken,
  ensureLogin,
  syncUserInfo
};
