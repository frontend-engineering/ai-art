/**
 * AI全家福·团圆照相馆 - 小程序入口
 * 
 * 全局状态管理：
 * - userInfo: 用户信息对象
 * - userId: 用户ID
 * - openid: 微信openid
 * - isElderMode: 老年模式开关
 */
App({
  /**
   * 全局数据
   * @type {Object}
   */
  globalData: {
    userInfo: null,      // 用户信息
    userId: '',          // 用户ID
    openid: '',          // 微信openid
    isElderMode: false   // 老年模式
  },

  /**
   * 小程序启动时执行
   * 恢复设置、检查登录状态
   */
  onLaunch() {
    console.log('[App] 小程序启动');
    
    // 恢复老年模式设置
    this.restoreElderMode();
    
    // 检查登录状态
    this.checkLoginStatus();
  },

  /**
   * 小程序显示时执行（从后台切换到前台）
   */
  onShow() {
    console.log('[App] 小程序显示');
  },

  /**
   * 小程序隐藏时执行（切换到后台）
   */
  onHide() {
    console.log('[App] 小程序隐藏');
  },

  /**
   * 恢复老年模式设置
   * 从本地存储读取老年模式状态
   */
  restoreElderMode() {
    try {
      const isElderMode = wx.getStorageSync('isElderMode');
      this.globalData.isElderMode = isElderMode || false;
      console.log('[App] 老年模式状态:', this.globalData.isElderMode ? '开启' : '关闭');
    } catch (err) {
      console.error('[App] 恢复老年模式设置失败:', err);
      this.globalData.isElderMode = false;
    }
  },

  /**
   * 检查登录状态
   * 从本地存储读取用户信息，更新全局状态
   * @returns {boolean} 是否已登录
   */
  checkLoginStatus() {
    try {
      const token = wx.getStorageSync('token');
      const userId = wx.getStorageSync('userId');
      const openid = wx.getStorageSync('openid');
      const paymentStatus = wx.getStorageSync('paymentStatus');
      
      if (userId) {
        this.globalData.userId = userId;
        this.globalData.openid = openid || '';
        this.globalData.userInfo = {
          userId,
          openid,
          paymentStatus: paymentStatus || 'free'
        };
        console.log('[App] 已登录用户:', userId);
        return true;
      } else {
        console.log('[App] 用户未登录，等待页面触发登录');
        return false;
      }
    } catch (err) {
      console.error('[App] 检查登录状态失败:', err);
      return false;
    }
  },

  /**
   * 执行登录
   * 调用 auth 模块进行微信登录
   * @returns {Promise<Object>} 登录结果
   */
  async login() {
    const { login } = require('./utils/auth');
    try {
      console.log('[App] 开始登录...');
      const result = await login();
      
      // 更新全局状态
      this.globalData.userId = result.userId;
      this.globalData.openid = result.openid || '';
      this.globalData.userInfo = {
        userId: result.userId,
        openid: result.openid,
        paymentStatus: result.paymentStatus || 'free'
      };
      
      console.log('[App] 登录成功:', result.userId);
      return result;
    } catch (err) {
      console.error('[App] 登录失败:', err);
      throw err;
    }
  },

  /**
   * 确保已登录
   * 如果未登录则自动执行登录
   * @returns {Promise<Object>} 用户信息
   */
  async ensureLogin() {
    if (this.checkLoginStatus()) {
      return this.globalData.userInfo;
    }
    return await this.login();
  },

  /**
   * 切换老年模式
   * 切换状态并保存到本地存储
   * @returns {boolean} 切换后的状态
   */
  toggleElderMode() {
    this.globalData.isElderMode = !this.globalData.isElderMode;
    
    // 保存到本地存储
    try {
      wx.setStorageSync('isElderMode', this.globalData.isElderMode);
    } catch (err) {
      console.error('[App] 保存老年模式设置失败:', err);
    }
    
    console.log('[App] 老年模式:', this.globalData.isElderMode ? '开启' : '关闭');
    return this.globalData.isElderMode;
  },

  /**
   * 设置老年模式
   * 直接设置状态并保存
   * @param {boolean} isElderMode 是否开启老年模式
   * @returns {boolean} 设置后的状态
   */
  setElderMode(isElderMode) {
    this.globalData.isElderMode = !!isElderMode;
    
    try {
      wx.setStorageSync('isElderMode', this.globalData.isElderMode);
    } catch (err) {
      console.error('[App] 保存老年模式设置失败:', err);
    }
    
    console.log('[App] 老年模式设置为:', this.globalData.isElderMode ? '开启' : '关闭');
    return this.globalData.isElderMode;
  },

  /**
   * 获取全局数据
   * @param {string} [key] 键名，不传则返回全部
   * @returns {any} 全局数据
   */
  getGlobalData(key) {
    return key ? this.globalData[key] : this.globalData;
  },

  /**
   * 设置全局数据
   * @param {string|Object} key 键名或键值对对象
   * @param {any} [value] 值（当key为字符串时）
   */
  setGlobalData(key, value) {
    if (typeof key === 'object') {
      Object.assign(this.globalData, key);
    } else {
      this.globalData[key] = value;
    }
  },

  /**
   * 更新用户信息
   * @param {Object} userInfo 用户信息
   */
  updateUserInfo(userInfo) {
    this.globalData.userInfo = { ...this.globalData.userInfo, ...userInfo };
    if (userInfo.userId) {
      this.globalData.userId = userInfo.userId;
    }
    if (userInfo.openid) {
      this.globalData.openid = userInfo.openid;
    }
  },

  /**
   * 退出登录
   * 清除全局状态和本地存储
   */
  logout() {
    const { logout } = require('./utils/auth');
    
    // 清除全局状态
    this.globalData.userInfo = null;
    this.globalData.userId = '';
    this.globalData.openid = '';
    
    // 调用 auth 模块的 logout
    logout();
    
    console.log('[App] 已退出登录');
  }
});
