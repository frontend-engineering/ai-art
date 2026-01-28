/**
 * 更新用户信息云函数
 * 允许用户更新自己的基本信息
 */
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 复用支付云函数的数据库连接
const { safeDb } = require('../wxpayFunctions/db/mysql');

// 允许更新的字段白名单
const ALLOWED_FIELDS = [
  'nickname', 
  'avatar_url', 
  'phone'
];

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { userId, updates } = event;
  
  console.log('[wechat_update_user] 收到更新请求:', { userId, hasUpdates: !!updates });
  
  if (!userId) {
    return { code: -1, msg: '缺少 userId' };
  }
  
  if (!updates || typeof updates !== 'object') {
    return { code: -1, msg: '缺少更新数据' };
  }
  
  try {
    // 1. 查询用户并验证权限
    const { data: users, skipped, error: selectError } = await safeDb.select('users', 'id', userId);
    
    if (selectError) {
      console.error('[wechat_update_user] 查询用户失败:', selectError);
      return { code: -1, msg: '查询用户失败' };
    }
    
    if (skipped || !users || users.length === 0) {
      return { code: -1, msg: '用户不存在' };
    }
    
    const user = users[0];
    
    // 验证权限：只能更新自己的信息
    if (user.openid !== wxContext.OPENID) {
      console.warn('[wechat_update_user] 权限验证失败:', {
        userOpenid: user.openid,
        requestOpenid: wxContext.OPENID
      });
      return { code: -1, msg: '无权限更新其他用户信息' };
    }
    
    // 2. 过滤允许更新的字段
    const filteredUpdates = {};
    for (const key of ALLOWED_FIELDS) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }
    
    if (Object.keys(filteredUpdates).length === 0) {
      return { code: -1, msg: '没有可更新的字段' };
    }
    
    console.log('[wechat_update_user] 准备更新字段:', Object.keys(filteredUpdates));
    
    // 3. 更新用户信息
    const result = await safeDb.update('users', 'id', userId, filteredUpdates);
    
    if (result.error) {
      console.error('[wechat_update_user] 更新失败:', result.error);
      return { code: -1, msg: '更新失败' };
    }
    
    if (result.skipped) {
      console.warn('[wechat_update_user] 数据库不可用，更新被跳过');
      return { code: -1, msg: '数据库不可用' };
    }
    
    console.log('[wechat_update_user] 更新成功:', userId);
    
    return { code: 0, msg: 'success' };
    
  } catch (error) {
    console.error('[wechat_update_user] 更新用户信息失败:', error);
    return { code: -1, msg: error.message || '更新失败' };
  }
};
