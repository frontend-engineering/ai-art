/**
 * AI全家福·团圆照相馆 - 小程序入口
 * 
 * 全局状态管理：
 * - userInfo: 用户信息对象
 * - userId: 用户ID
 * - openid: 微信openid
 * - isElderMode: 老年模式开关
 * - isMusicPlaying: 背景音乐播放状态
 * - audioContext: 音频上下文
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
    isElderMode: false,  // 老年模式
    isMusicPlaying: false, // 背景音乐播放状态
    audioContext: null   // 音频上下文
  },

  /**
   * 小程序启动时执行
   * 初始化音频、恢复设置、检查登录状态
   */
  onLaunch() {
    console.log('[App] 小程序启动');
    
    // 初始化音频上下文
    this.initAudioContext();
    
    // 恢复老年模式设置
    this.restoreElderMode();
    
    // 恢复音乐播放状态
    this.restoreMusicState();
    
    // 检查登录状态
    this.checkLoginStatus();
  },

  /**
   * 小程序显示时执行（从后台切换到前台）
   */
  onShow() {
    console.log('[App] 小程序显示');
    // 如果之前在播放音乐，恢复播放
    if (this.globalData.isMusicPlaying && this.globalData.audioContext) {
      this.globalData.audioContext.play();
    }
  },

  /**
   * 小程序隐藏时执行（切换到后台）
   */
  onHide() {
    console.log('[App] 小程序隐藏');
    // 暂停音乐播放
    if (this.globalData.audioContext && this.globalData.isMusicPlaying) {
      this.globalData.audioContext.pause();
    }
  },

  /**
   * 初始化音频上下文
   * 创建背景音乐播放器
   */
  initAudioContext() {
    try {
      this.globalData.audioContext = wx.createInnerAudioContext();
      this.globalData.audioContext.src = '/assets/audio/bgm.mp3';
      this.globalData.audioContext.loop = true;
      this.globalData.audioContext.volume = 0.5;
      
      // 监听音频播放错误
      this.globalData.audioContext.onError((err) => {
        // 音频文件不存在时静默处理，不影响其他功能
        if (err && err.errMsg && err.errMsg.includes('not found')) {
          console.warn('[App] 背景音乐文件不存在，音乐功能已禁用');
          this.globalData.audioContext = null;
          this.globalData.isMusicPlaying = false;
        } else {
          console.error('[App] 音频播放错误:', err);
        }
      });
      
      // 监听音频播放结束（虽然设置了loop，但以防万一）
      this.globalData.audioContext.onEnded(() => {
        if (this.globalData.isMusicPlaying) {
          this.globalData.audioContext.play();
        }
      });
      
      console.log('[App] 音频上下文初始化成功');
    } catch (err) {
      console.error('[App] 初始化音频失败:', err);
      this.globalData.audioContext = null;
    }
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
   * 恢复音乐播放状态
   * 从本地存储读取音乐播放状态（但不自动播放，需要用户交互）
   */
  restoreMusicState() {
    try {
      const isMusicPlaying = wx.getStorageSync('isMusicPlaying');
      // 只恢复状态，不自动播放（小程序限制需要用户交互才能播放音频）
      this.globalData.isMusicPlaying = false;
      console.log('[App] 音乐播放状态已重置（需用户交互启动）');
    } catch (err) {
      console.error('[App] 恢复音乐状态失败:', err);
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
   * 切换背景音乐
   * 切换播放/暂停状态
   * @returns {boolean} 切换后的播放状态
   */
  toggleMusic() {
    // 确保音频上下文已初始化
    if (!this.globalData.audioContext) {
      this.initAudioContext();
    }
    
    if (this.globalData.isMusicPlaying) {
      // 暂停播放
      this.globalData.audioContext.pause();
      this.globalData.isMusicPlaying = false;
    } else {
      // 开始播放
      this.globalData.audioContext.play();
      this.globalData.isMusicPlaying = true;
    }
    
    // 保存状态到本地存储
    try {
      wx.setStorageSync('isMusicPlaying', this.globalData.isMusicPlaying);
    } catch (err) {
      console.error('[App] 保存音乐状态失败:', err);
    }
    
    console.log('[App] 背景音乐:', this.globalData.isMusicPlaying ? '播放' : '暂停');
    return this.globalData.isMusicPlaying;
  },

  /**
   * 播放背景音乐
   * @returns {boolean} 是否成功
   */
  playMusic() {
    if (!this.globalData.audioContext) {
      this.initAudioContext();
    }
    
    try {
      this.globalData.audioContext.play();
      this.globalData.isMusicPlaying = true;
      wx.setStorageSync('isMusicPlaying', true);
      console.log('[App] 背景音乐开始播放');
      return true;
    } catch (err) {
      console.error('[App] 播放音乐失败:', err);
      return false;
    }
  },

  /**
   * 暂停背景音乐
   * @returns {boolean} 是否成功
   */
  pauseMusic() {
    if (!this.globalData.audioContext) {
      return true;
    }
    
    try {
      this.globalData.audioContext.pause();
      this.globalData.isMusicPlaying = false;
      wx.setStorageSync('isMusicPlaying', false);
      console.log('[App] 背景音乐已暂停');
      return true;
    } catch (err) {
      console.error('[App] 暂停音乐失败:', err);
      return false;
    }
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
