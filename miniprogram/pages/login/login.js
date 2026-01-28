/**
 * 微信登录页面
 * 支持小程序内登录和 Web 扫码登录
 */
Page({
  data: {
    sessionId: null,
    isWebLogin: false,
    loading: false,
    errorMsg: ''
  },

  onLoad(options) {
    const { sessionId } = options;
    
    if (sessionId) {
      // Web 扫码登录
      this.setData({ 
        sessionId, 
        isWebLogin: true 
      });
      this.loginForWeb(sessionId);
    } else {
      // 小程序内登录
      this.loginForMiniprogram();
    }
  },

  /**
   * 小程序内登录
   */
  async loginForMiniprogram() {
    this.setData({ loading: true, errorMsg: '' });
    
    try {
      // 获取用户信息（可选）
      let userInfo = null;
      try {
        const { userInfo: info } = await wx.getUserProfile({
          desc: '用于完善用户资料'
        });
        userInfo = info;
      } catch (error) {
        console.log('[login] 用户取消授权或获取用户信息失败:', error);
        // 不影响登录流程
      }
      
      // 调用登录云函数
      const res = await wx.cloud.callFunction({
        name: 'wechat_login',
        data: {
          source: 'miniprogram',
          userInfo: userInfo,
          clientIp: null
        }
      });
      
      console.log('[login] 登录结果:', res.result);
      
      if (res.result.code === 0) {
        const { token, user } = res.result.data;
        
        // 保存 token 到本地存储
        wx.setStorageSync('auth_token', token);
        wx.setStorageSync('user_info', user);
        
        wx.hideLoading();
        wx.showToast({ 
          title: '登录成功', 
          icon: 'success',
          duration: 1500
        });
        
        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          // 跳转到首页或返回上一页
          const pages = getCurrentPages();
          if (pages.length > 1) {
            wx.navigateBack();
          } else {
            wx.switchTab({ url: '/pages/launch/launch' });
          }
        }, 1500);
      } else {
        throw new Error(res.result.msg || '登录失败');
      }
    } catch (error) {
      console.error('[login] 登录失败:', error);
      this.setData({ 
        loading: false,
        errorMsg: error.message || '登录失败，请重试'
      });
      wx.showToast({ 
        title: error.message || '登录失败', 
        icon: 'error' 
      });
    }
  },

  /**
   * Web 扫码登录
   */
  async loginForWeb(sessionId) {
    wx.showLoading({ title: '登录中...' });
    
    try {
      // 调用登录云函数
      const res = await wx.cloud.callFunction({
        name: 'wechat_login',
        data: {
          source: 'web',
          sessionId: sessionId
        }
      });
      
      console.log('[login] Web 登录结果:', res.result);
      
      if (res.result.code === 0) {
        const { token } = res.result.data;
        
        // 将 token 绑定到 sessionId（通知后端）
        await wx.cloud.callFunction({
          name: 'wechat_bind_session',
          data: {
            sessionId: sessionId,
            token: token,
            status: 'success'
          }
        });
        
        wx.hideLoading();
        wx.showToast({ 
          title: '登录成功', 
          icon: 'success',
          duration: 2000
        });
        
        // 延迟关闭或返回
        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      } else {
        throw new Error(res.result.msg || '登录失败');
      }
    } catch (error) {
      console.error('[login] Web 登录失败:', error);
      wx.hideLoading();
      wx.showModal({
        title: '登录失败',
        content: error.message || '登录失败，请重试',
        showCancel: false
      });
    }
  },

  /**
   * 重试登录
   */
  handleRetry() {
    if (this.data.isWebLogin) {
      this.loginForWeb(this.data.sessionId);
    } else {
      this.loginForMiniprogram();
    }
  }
});
