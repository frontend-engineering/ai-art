/**
 * 本地存储工具模块
 * 封装 wx.setStorageSync/getStorageSync，实现历史记录存储等功能
 */

/**
 * 存储键名常量
 */
const STORAGE_KEYS = {
  USER_ID: 'userId',
  OPENID: 'openid',
  TOKEN: 'token',
  PAYMENT_STATUS: 'paymentStatus',
  LOGIN_TIME: 'loginTime',
  IS_ELDER_MODE: 'isElderMode',
  IS_MUSIC_PLAYING: 'isMusicPlaying',
  HISTORY_LIST: 'historyList',
  DRAFT_IMAGES: 'draftImages',
  LAST_TEMPLATE: 'lastTemplate',
  SETTINGS: 'settings'
};

/**
 * 历史记录最大数量
 */
const MAX_HISTORY_COUNT = 50;

/**
 * 设置存储项
 * @param {string} key 键名
 * @param {any} value 值
 * @returns {boolean} 是否成功
 */
const set = (key, value) => {
  try {
    wx.setStorageSync(key, value);
    return true;
  } catch (err) {
    console.error('[Storage] 存储失败:', key, err);
    return false;
  }
};

/**
 * 获取存储项
 * @param {string} key 键名
 * @param {any} [defaultValue] 默认值
 * @returns {any} 存储的值
 */
const get = (key, defaultValue = null) => {
  try {
    const value = wx.getStorageSync(key);
    return value !== '' && value !== undefined ? value : defaultValue;
  } catch (err) {
    console.error('[Storage] 读取失败:', key, err);
    return defaultValue;
  }
};

/**
 * 删除存储项
 * @param {string} key 键名
 * @returns {boolean} 是否成功
 */
const remove = (key) => {
  try {
    wx.removeStorageSync(key);
    return true;
  } catch (err) {
    console.error('[Storage] 删除失败:', key, err);
    return false;
  }
};

/**
 * 清除所有存储
 * @returns {boolean} 是否成功
 */
const clear = () => {
  try {
    wx.clearStorageSync();
    return true;
  } catch (err) {
    console.error('[Storage] 清除失败:', err);
    return false;
  }
};

/**
 * 获取存储信息
 * @returns {Object} 存储信息
 */
const getInfo = () => {
  try {
    const info = wx.getStorageInfoSync();
    return {
      keys: info.keys,
      currentSize: info.currentSize,
      limitSize: info.limitSize
    };
  } catch (err) {
    console.error('[Storage] 获取存储信息失败:', err);
    return { keys: [], currentSize: 0, limitSize: 0 };
  }
};

// ==================== 历史记录相关 ====================

/**
 * 历史记录项结构
 * @typedef {Object} HistoryItem
 * @property {string} id - 记录ID
 * @property {string[]} originalImages - 原始图片URL数组
 * @property {string} generatedImage - 生成的图片URL
 * @property {string} selectedImage - 选中的图片URL
 * @property {string} templateId - 模板ID
 * @property {string} mode - 模式 ('puzzle' | 'transform')
 * @property {boolean} isPaid - 是否已付费
 * @property {number} createdAt - 创建时间戳
 */

/**
 * 获取历史记录列表
 * @param {string} [mode] 模式筛选
 * @returns {HistoryItem[]} 历史记录列表
 */
const getHistoryList = (mode) => {
  const list = get(STORAGE_KEYS.HISTORY_LIST, []);
  
  if (mode) {
    return list.filter(item => item.mode === mode);
  }
  
  return list;
};

/**
 * 添加历史记录
 * @param {HistoryItem} item 历史记录项
 * @returns {boolean} 是否成功
 */
const addHistory = (item) => {
  try {
    const list = getHistoryList();
    
    // 生成唯一ID
    const newItem = {
      ...item,
      id: item.id || `history_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      createdAt: item.createdAt || Date.now()
    };
    
    // 检查是否已存在相同的记录（防止重复）
    // 如果提供了 ID，检查是否已存在该 ID 的记录
    if (item.id) {
      const existingIndex = list.findIndex(r => r.id === item.id);
      if (existingIndex !== -1) {
        console.log('[Storage] 记录已存在，跳过添加:', item.id);
        return true;
      }
    }
    
    // 添加到列表开头
    list.unshift(newItem);
    
    // 限制最大数量
    if (list.length > MAX_HISTORY_COUNT) {
      list.splice(MAX_HISTORY_COUNT);
    }
    
    set(STORAGE_KEYS.HISTORY_LIST, list);
    console.log('[Storage] 添加历史记录成功:', newItem.id);
    return true;
  } catch (err) {
    console.error('[Storage] 添加历史记录失败:', err);
    return false;
  }
};

/**
 * 获取历史记录详情
 * @param {string} historyId 历史记录ID
 * @returns {HistoryItem|null} 历史记录项
 */
const getHistoryById = (historyId) => {
  const list = getHistoryList();
  return list.find(item => item.id === historyId) || null;
};

/**
 * 更新历史记录
 * @param {string} historyId 历史记录ID
 * @param {Partial<HistoryItem>} updates 更新内容
 * @returns {boolean} 是否成功
 */
const updateHistory = (historyId, updates) => {
  try {
    const list = getHistoryList();
    const index = list.findIndex(item => item.id === historyId);
    
    if (index === -1) {
      console.warn('[Storage] 历史记录不存在:', historyId);
      return false;
    }
    
    list[index] = { ...list[index], ...updates };
    set(STORAGE_KEYS.HISTORY_LIST, list);
    console.log('[Storage] 更新历史记录成功:', historyId);
    return true;
  } catch (err) {
    console.error('[Storage] 更新历史记录失败:', err);
    return false;
  }
};

/**
 * 删除历史记录
 * @param {string} historyId 历史记录ID
 * @returns {boolean} 是否成功
 */
const deleteHistory = (historyId) => {
  try {
    const list = getHistoryList();
    const newList = list.filter(item => item.id !== historyId);
    
    if (newList.length === list.length) {
      console.warn('[Storage] 历史记录不存在:', historyId);
      return false;
    }
    
    set(STORAGE_KEYS.HISTORY_LIST, newList);
    console.log('[Storage] 删除历史记录成功:', historyId);
    return true;
  } catch (err) {
    console.error('[Storage] 删除历史记录失败:', err);
    return false;
  }
};

/**
 * 清空历史记录
 * @param {string} [mode] 模式筛选，不传则清空全部
 * @returns {boolean} 是否成功
 */
const clearHistory = (mode) => {
  try {
    if (mode) {
      const list = getHistoryList();
      const newList = list.filter(item => item.mode !== mode);
      set(STORAGE_KEYS.HISTORY_LIST, newList);
    } else {
      remove(STORAGE_KEYS.HISTORY_LIST);
    }
    console.log('[Storage] 清空历史记录成功');
    return true;
  } catch (err) {
    console.error('[Storage] 清空历史记录失败:', err);
    return false;
  }
};

// ==================== 草稿相关 ====================

/**
 * 保存草稿图片
 * @param {string[]} images 图片路径数组
 * @param {string} mode 模式
 * @returns {boolean} 是否成功
 */
const saveDraftImages = (images, mode) => {
  return set(STORAGE_KEYS.DRAFT_IMAGES, { images, mode, savedAt: Date.now() });
};

/**
 * 获取草稿图片
 * @param {string} [mode] 模式筛选
 * @returns {Object|null} 草稿数据
 */
const getDraftImages = (mode) => {
  const draft = get(STORAGE_KEYS.DRAFT_IMAGES);
  
  if (!draft) return null;
  
  // 检查是否过期（24小时）
  if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
    remove(STORAGE_KEYS.DRAFT_IMAGES);
    return null;
  }
  
  if (mode && draft.mode !== mode) {
    return null;
  }
  
  return draft;
};

/**
 * 清除草稿图片
 * @returns {boolean} 是否成功
 */
const clearDraftImages = () => {
  return remove(STORAGE_KEYS.DRAFT_IMAGES);
};

// ==================== 设置相关 ====================

/**
 * 获取设置
 * @returns {Object} 设置对象
 */
const getSettings = () => {
  return get(STORAGE_KEYS.SETTINGS, {
    isElderMode: false,
    isMusicPlaying: false,
    autoSave: true,
    showTips: true
  });
};

/**
 * 更新设置
 * @param {Object} updates 更新内容
 * @returns {boolean} 是否成功
 */
const updateSettings = (updates) => {
  const settings = getSettings();
  return set(STORAGE_KEYS.SETTINGS, { ...settings, ...updates });
};

/**
 * 获取老年模式状态
 * @returns {boolean} 是否开启老年模式
 */
const getElderMode = () => {
  return get(STORAGE_KEYS.IS_ELDER_MODE, false);
};

/**
 * 设置老年模式状态
 * @param {boolean} isElderMode 是否开启
 * @returns {boolean} 是否成功
 */
const setElderMode = (isElderMode) => {
  return set(STORAGE_KEYS.IS_ELDER_MODE, isElderMode);
};

/**
 * 获取音乐播放状态
 * @returns {boolean} 是否正在播放
 */
const getMusicPlaying = () => {
  return get(STORAGE_KEYS.IS_MUSIC_PLAYING, false);
};

/**
 * 设置音乐播放状态
 * @param {boolean} isPlaying 是否播放
 * @returns {boolean} 是否成功
 */
const setMusicPlaying = (isPlaying) => {
  return set(STORAGE_KEYS.IS_MUSIC_PLAYING, isPlaying);
};

/**
 * 保存上次使用的模板
 * @param {string} mode 模式
 * @param {string} templateId 模板ID
 * @returns {boolean} 是否成功
 */
const saveLastTemplate = (mode, templateId) => {
  const lastTemplates = get(STORAGE_KEYS.LAST_TEMPLATE, {});
  lastTemplates[mode] = templateId;
  return set(STORAGE_KEYS.LAST_TEMPLATE, lastTemplates);
};

/**
 * 获取上次使用的模板
 * @param {string} mode 模式
 * @returns {string|null} 模板ID
 */
const getLastTemplate = (mode) => {
  const lastTemplates = get(STORAGE_KEYS.LAST_TEMPLATE, {});
  return lastTemplates[mode] || null;
};

module.exports = {
  // 常量
  STORAGE_KEYS,
  MAX_HISTORY_COUNT,
  
  // 基础方法
  set,
  get,
  remove,
  clear,
  getInfo,
  
  // 历史记录
  getHistoryList,
  addHistory,
  getHistoryById,
  updateHistory,
  deleteHistory,
  clearHistory,
  
  // 历史记录别名（兼容）
  getHistory: getHistoryList,
  saveHistory: addHistory,
  
  // 草稿
  saveDraftImages,
  getDraftImages,
  clearDraftImages,
  
  // 设置
  getSettings,
  updateSettings,
  getElderMode,
  setElderMode,
  getMusicPlaying,
  setMusicPlaying,
  saveLastTemplate,
  getLastTemplate
};
