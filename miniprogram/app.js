/**
 * AI全家福·团圆照相馆 - 小程序入口
 * 
 * 全局状态管理：
 * - userInfo: 用户信息对象
 * - userId: 用户ID
 * - openid: 微信openid
 * - isElderMode: 老年模式开关
 * - useCloudBase: 是否使用云托管（默认 true）
 * - cloudbaseInitialized: CloudBase 是否已初始化
 */

// CloudBase 配置
const CLOUDBASE_ENV_ID = 'test-1g71tc7eb37627e2'; // 云开发环境 ID，请替换为实际值
const CLOUDBASE_SERVICE_NAME = 'express'; // 云托管服务名称

App({
  /**
   * 全局数据
   * @type {Object}
   */
  globalData: {
    userInfo: null,      // 用户信息
    userId: '',          // 用户ID
    openid: '',          // 微信openid
    isElderMode: false,  // 老年模式
    useCloudBase: true,  // 使用云托管
    cloudbaseInitialized: false, // CloudBase 是否已初始化
    usageCount: 0,       // 剩余使用次数
    userType: 'free'     // 用户类型 ('free' | 'paid')
  },

  /**
   * 小程序启动时执行
   * 恢复设置、检查登录状态、初始化云开发
   */
  onLaunch() {
    console.log('[App] 小程序启动');
    
    // 恢复老年模式设置
    this.restoreElderMode();
    
    // 初始化云开发并自动登录（顺序执行）
    this.initAndLogin();
  },

  /**
   * 初始化云开发并自动登录
   * 确保初始化完成后再执行登录，避免 code 重复使用
   */
  async initAndLogin() {
    try {
      console.log('[App] 开始初始化云开发...');
      // 先初始化云开发
      await this.initCloudBase();
      
      // 初始化成功后再自动登录
      if (this.globalData.cloudbaseInitialized) {
        console.log('[App] 云开发初始化成功，开始自动登录...');
        await this.autoLogin();
      } else {
        console.warn('[App] 云开发初始化失败，跳过自动登录');
      }
    } catch (err) {
      console.error('[App] 初始化或登录失败:', err);
    }
  },

  /**
   * 初始化云开发
   * 配置云托管环境和 CloudBase 认证
   */
  async initCloudBase() {
    try {
      // 使用 CloudBase 认证模块初始化
      const cloudbaseAuth = require('./utils/cloudbase-auth');
      const success = await cloudbaseAuth.initCloudBase({
        env: CLOUDBASE_ENV_ID,
        region: 'ap-shanghai'
      });

      if (success) {
        // 设置云托管环境 ID
        const cloudbaseRequest = require('./utils/cloudbase-request');
        cloudbaseRequest.setEnvId(CLOUDBASE_ENV_ID);
        
        this.globalData.cloudbaseInitialized = true;
        console.log('[App] CloudBase 初始化成功');
      } else {
        throw new Error('CloudBase 初始化返回失败');
      }
    } catch (err) {
      console.error('[App] CloudBase 初始化失败:', err);
      this.globalData.cloudbaseInitialized = false;
      // 初始化失败时回退到传统 HTTP 请求
      this.globalData.useCloudBase = false;
    }
  },

  /**
   * 自动登录
   * 检查登录状态，如果未登录或已过期则自动执行静默登录
   */
  async autoLogin() {
    try {
      const cloudbaseAuth = require('./utils/cloudbase-auth');
      
      // 检查登录状态
      const isValid = await cloudbaseAuth.checkLoginState();
      
      if (isValid) {
        // 登录状态有效，恢复用户信息
        const userInfo = await cloudbaseAuth.getCurrentUser();
        if (userInfo) {
          this.globalData.userId = userInfo.userId;
          this.globalData.openid = userInfo.openid || '';
          this.globalData.userInfo = userInfo;
          console.log('[App] 登录状态有效，用户:', userInfo.userId);
          
          // 后台同步用户信息
          cloudbaseAuth.syncUserInfo().catch(err => {
            console.warn('[App] 后台同步用户信息失败:', err);
          });
          return;
        }
      }
      
      // 登录状态无效，执行静默登录
      console.log('[App] 登录状态无效，执行静默登录...');
      await this.login();
    } catch (err) {
      console.error('[App] 自动登录失败:', err);
      // 自动登录失败不阻断应用启动，等待页面触发登录
    }
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
   * 检查登录状态（兼容旧方法）
   * 从本地存储读取用户信息，更新全局状态
   * @returns {boolean} 是否已登录
   */
  checkLoginStatus() {
    try {
      const cloudbaseAuth = require('./utils/cloudbase-auth');
      const loginState = cloudbaseAuth.getLoginState();
      
      if (loginState && loginState.userId) {
        this.globalData.userId = loginState.userId;
        this.globalData.openid = loginState.openid || '';
        this.globalData.userInfo = {
          userId: loginState.userId,
          openid: loginState.openid,
          paymentStatus: loginState.paymentStatus || 'free'
        };
        console.log('[App] 已登录用户:', loginState.userId);
        return true;
      } else {
        console.log('[App] 用户未登录');
        return false;
      }
    } catch (err) {
      console.error('[App] 检查登录状态失败:', err);
      return false;
    }
  },

  /**
   * 执行登录
   * 调用 CloudBase 认证模块进行静默登录
   * @returns {Promise<Object>} 登录结果
   */
  async login() {
    const cloudbaseAuth = require('./utils/cloudbase-auth');
    try {
      console.log('[App] 开始登录...');
      const loginState = await cloudbaseAuth.signInWithUnionId();
      
      // 更新全局状态
      this.globalData.userId = loginState.userId;
      this.globalData.openid = loginState.openid || '';
      this.globalData.userInfo = {
        userId: loginState.userId,
        openid: loginState.openid,
        paymentStatus: loginState.paymentStatus || 'free'
      };
      
      console.log('[App] 登录成功:', loginState.userId);
      
      // 后台同步用户信息
      cloudbaseAuth.syncUserInfo().catch(err => {
        console.warn('[App] 后台同步用户信息失败:', err);
      });
      
      return loginState;
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
    const cloudbaseAuth = require('./utils/cloudbase-auth');
    try {
      const userInfo = await cloudbaseAuth.ensureLogin();
      
      // 更新全局状态
      this.globalData.userId = userInfo.userId;
      this.globalData.openid = userInfo.openid || '';
      this.globalData.userInfo = userInfo;
      
      return userInfo;
    } catch (err) {
      console.error('[App] ensureLogin 失败:', err);
      throw err;
    }
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
  async logout() {
    const cloudbaseAuth = require('./utils/cloudbase-auth');
    
    try {
      // 调用 CloudBase 认证模块的退出登录
      await cloudbaseAuth.signOut();
      
      // 清除全局状态
      this.globalData.userInfo = null;
      this.globalData.userId = '';
      this.globalData.openid = '';
      this.globalData.usageCount = 0;
      this.globalData.userType = 'free';
      
      console.log('[App] 已退出登录');
    } catch (err) {
      console.error('[App] 退出登录失败:', err);
      // 即使失败也清除全局状态
      this.globalData.userInfo = null;
      this.globalData.userId = '';
      this.globalData.openid = '';
      this.globalData.usageCount = 0;
      this.globalData.userType = 'free';
    }
  },

  /**
   * 更新使用次数
   * 从服务器获取最新的使用次数并更新全局状态
   * @returns {Promise<Object>} { usageCount, userType, paymentStatus, canGenerate }
   */
  async updateUsageCount() {
    try {
      const userId = this.globalData.userId;
      if (!userId) {
        console.warn('[App] 用户未登录，无法更新使用次数');
        // 返回默认值
        return {
          usageCount: 3,
          userType: 'free',
          paymentStatus: 'free',
          canGenerate: true
        };
      }

      const cloudbaseRequest = require('./utils/cloudbase-request');
      const res = await cloudbaseRequest.get(`/api/usage/check/${userId}`);

      if (res && res.success) {
        const { usage_count, user_type, can_generate } = res.data;
        
        // 从本地存储获取paymentStatus
        const paymentStatus = wx.getStorageSync('paymentStatus') || 'free';
        
        // 更新全局状态
        this.globalData.usageCount = usage_count;
        this.globalData.userType = user_type;
        
        console.log('[App] 使用次数已更新:', usage_count, '类型:', user_type);
        
        // 通知所有页面更新
        this.notifyPagesUsageUpdate({
          usageCount: usage_count,
          userType: user_type,
          paymentStatus: paymentStatus,
          canGenerate: can_generate
        });
        
        return {
          usageCount: usage_count,
          userType: user_type,
          paymentStatus: paymentStatus,
          canGenerate: can_generate
        };
      } else {
        console.error('[App] 更新使用次数失败:', res);
        // 返回默认值
        return {
          usageCount: 3,
          userType: 'free',
          paymentStatus: 'free',
          canGenerate: true
        };
      }
    } catch (err) {
      console.error('[App] 更新使用次数异常:', err);
      // 返回默认值
      return {
        usageCount: 3,
        userType: 'free',
        paymentStatus: 'free',
        canGenerate: true
      };
    }
  },

  /**
   * 通知所有页面使用次数已更新
   * @param {Object} data - 使用次数数据
   */
  notifyPagesUsageUpdate(data) {
    try {
      const pages = getCurrentPages();
      pages.forEach(page => {
        if (typeof page.onUsageCountUpdate === 'function') {
          page.onUsageCountUpdate(data);
        }
      });
    } catch (err) {
      console.error('[App] 通知页面更新失败:', err);
    }
  },

  /**
   * 扣减使用次数
   * @param {string} generationId - 生成记录ID
   * @returns {Promise<Object>} { success, remainingCount }
   */
  async decrementUsageCount(generationId) {
    try {
      const userId = this.globalData.userId;
      if (!userId) {
        throw new Error('用户未登录');
      }

      const cloudbaseRequest = require('./utils/cloudbase-request');
      const res = await cloudbaseRequest.post('/api/usage/decrement', {
        userId,
        generationId
      });

      if (res && res.success) {
        const { remaining_count } = res;
        
        // 更新全局状态
        this.globalData.usageCount = remaining_count;
        
        console.log('[App] 使用次数已扣减，剩余:', remaining_count);
        
        // 从本地存储获取paymentStatus
        const paymentStatus = wx.getStorageSync('paymentStatus') || 'free';
        
        // 通知页面更新
        this.notifyPagesUsageUpdate({
          usageCount: remaining_count,
          userType: this.globalData.userType,
          paymentStatus: paymentStatus,
          canGenerate: remaining_count > 0
        });
        
        return {
          success: true,
          remainingCount: remaining_count
        };
      } else {
        throw new Error(res.message || '扣减使用次数失败');
      }
    } catch (err) {
      console.error('[App] 扣减使用次数失败:', err);
      throw err;
    }
  },

  /**
   * 恢复使用次数（生成失败时）
   * @param {string} generationId - 生成记录ID
   * @returns {Promise<Object>} { success, remainingCount }
   */
  async restoreUsageCount(generationId) {
    try {
      const userId = this.globalData.userId;
      if (!userId) {
        throw new Error('用户未登录');
      }

      const cloudbaseRequest = require('./utils/cloudbase-request');
      const res = await cloudbaseRequest.post('/api/usage/restore', {
        userId,
        generationId
      });

      if (res && res.success) {
        const { remaining_count } = res;
        
        // 更新全局状态
        this.globalData.usageCount = remaining_count;
        
        console.log('[App] 使用次数已恢复，剩余:', remaining_count);
        
        // 通知页面更新
        this.notifyPagesUsageUpdate({
          usageCount: remaining_count,
          userType: this.globalData.userType,
          canGenerate: remaining_count > 0
        });
        
        return {
          success: true,
          remainingCount: remaining_count
        };
      } else {
        throw new Error(res.message || '恢复使用次数失败');
      }
    } catch (err) {
      console.error('[App] 恢复使用次数失败:', err);
      throw err;
    }
  }
});
