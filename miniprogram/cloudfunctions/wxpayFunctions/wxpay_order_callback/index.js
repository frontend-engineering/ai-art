/**
 * 微信支付 - 支付结果回调
 */
const cloud = require('wx-server-sdk');
const { safeDb } = require('../db/mysql');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 微信支付 SDK（用于验证签名）
let WxPay = null;
let wechatPayment = null;

/**
 * 初始化微信支付 SDK
 */
function initWechatPaymentSDK() {
  if (wechatPayment) {
    return wechatPayment;
  }
  
  const hasRequiredConfig = !!(
    process.env.WECHAT_APPID &&
    process.env.WECHAT_MCHID &&
    process.env.WECHAT_SERIAL_NO &&
    process.env.WECHAT_PRIVATE_KEY &&
    process.env.WECHAT_APIV3_KEY
  );
  
  if (!hasRequiredConfig) {
    console.warn('[wxpay_order_callback] 微信支付配置未完整设置，无法验证签名');
    return null;
  }
  
  try {
    if (!WxPay) {
      WxPay = require('wechatpay-node-v3');
    }
    
    let privateKey = process.env.WECHAT_PRIVATE_KEY;
    if (privateKey) {
      privateKey = privateKey.replace(/\\\\n/g, '\n');
      privateKey = privateKey.replace(/\\n/g, '\n');
      if (!privateKey.includes('BEGIN PRIVATE KEY')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
      }
      privateKey = privateKey.trim();
    }
    
    let publicKey = process.env.WECHAT_PUBLIC_KEY;
    if (publicKey) {
      publicKey = publicKey.replace(/\\\\n/g, '\n');
      publicKey = publicKey.replace(/\\n/g, '\n');
      if (!publicKey.includes('BEGIN CERTIFICATE')) {
        publicKey = `-----BEGIN CERTIFICATE-----\n${publicKey}\n-----END CERTIFICATE-----`;
      }
      publicKey = publicKey.trim();
    }
    
    const config = {
      appid: process.env.WECHAT_APPID,
      mchid: process.env.WECHAT_MCHID,
      serial_no: process.env.WECHAT_SERIAL_NO,
      privateKey: privateKey,
      key: process.env.WECHAT_APIV3_KEY,
    };
    
    if (publicKey) {
      config.publicKey = publicKey;
    }
    
    wechatPayment = new WxPay(config);
    console.log('[wxpay_order_callback] 微信支付 SDK 初始化成功');
    return wechatPayment;
  } catch (error) {
    console.error('[wxpay_order_callback] 微信支付 SDK 初始化失败:', error.message);
    return null;
  }
}

exports.main = async (event, context) => {
  console.log('[wxpay_order_callback] 收到支付回调');
  
  try {
    // 验证签名（如果配置了 SDK）
    const payment = initWechatPaymentSDK();
    if (payment && event.signature && event.timestamp && event.nonce) {
      try {
        const isValid = await payment.verifySign({
          signature: event.signature,
          timestamp: event.timestamp,
          nonce: event.nonce,
          body: JSON.stringify(event.resource || event),
          serial: event.serial
        });
        
        if (!isValid) {
          console.error('[wxpay_order_callback] 签名验证失败');
          return { code: 'FAIL', message: '签名验证失败' };
        }
        
        console.log('[wxpay_order_callback] 签名验证成功');
      } catch (verifyError) {
        console.error('[wxpay_order_callback] 签名验证异常:', verifyError.message);
        // 签名验证失败，但不阻断流程（兼容旧版本）
      }
    } else {
      console.warn('[wxpay_order_callback] 未配置 SDK 或缺少签名参数，跳过签名验证');
    }
    
    const eventType = event.event_type;
    
    if (eventType !== 'TRANSACTION.SUCCESS') {
      console.log('[wxpay_order_callback] 非支付成功事件:', eventType);
      return { code: 'SUCCESS', message: '处理成功' };
    }
    
    const resource = event.resource || event;
    const outTradeNo = resource.out_trade_no || resource.outTradeNo;
    const transactionId = resource.transaction_id || resource.transactionId;
    const amount = resource.amount;
    const payer = resource.payer;
    
    if (!outTradeNo) {
      console.error('[wxpay_order_callback] 缺少订单号');
      return { code: 'SUCCESS', message: '缺少订单号，忽略' };
    }
    
    console.log('[wxpay_order_callback] 处理订单:', { outTradeNo, transactionId });
    
    // 查询订单
    let order = null;
    try {
      const { data: orders } = await safeDb.select('orders', 'out_trade_no', outTradeNo);
      order = orders && orders[0];
    } catch (dbError) {
      console.error('[wxpay_order_callback] 查询订单失败:', dbError.message);
    }
    
    if (!order) {
      console.warn('[wxpay_order_callback] 订单不存在:', outTradeNo);
      try {
        await safeDb.insert('orders', {
          out_trade_no: outTradeNo,
          transaction_id: transactionId,
          openid: payer?.openid,
          amount: amount?.total,
          status: 'paid',
          paid_at: new Date(),
          created_at: new Date()
        });
        console.log('[wxpay_order_callback] 已补录订单');
      } catch (e) {
        console.error('[wxpay_order_callback] 补录订单失败:', e.message);
      }
      return { code: 'SUCCESS', message: '订单已处理' };
    }
    
    if (order.status === 'paid') {
      console.log('[wxpay_order_callback] 订单已处理:', outTradeNo);
      return { code: 'SUCCESS', message: '订单已处理' };
    }
    
    // 更新订单状态
    try {
      await safeDb.update('orders', 'out_trade_no', outTradeNo, {
        status: 'paid',
        transaction_id: transactionId,
        paid_at: new Date(),
        paid_amount: amount?.total || order.amount
      });
      console.log('[wxpay_order_callback] 订单状态已更新:', outTradeNo);
    } catch (updateError) {
      console.error('[wxpay_order_callback] 更新订单失败:', updateError.message);
      return { code: 'FAIL', message: '更新订单失败' };
    }
    
    // 更新用户权益
    const openid = payer?.openid || order.openid;
    if (openid && order.package_type) {
      try {
        await updateUserBenefits(openid, order);
      } catch (benefitError) {
        console.error('[wxpay_order_callback] 更新用户权益失败:', benefitError.message);
      }
    }
    
    // 记录日志
    try {
      await safeDb.insert('payment_logs', {
        type: 'callback',
        out_trade_no: outTradeNo,
        transaction_id: transactionId,
        openid,
        package_type: order.package_type,
        generation_id: order.generation_id,
        event_type: eventType,
        amount_total: amount?.total,
        created_at: new Date()
      });
    } catch (logError) {
      console.error('[wxpay_order_callback] 记录日志失败:', logError.message);
    }
    
    // 异步通知后端（不阻塞返回）
    notifyBackend({
      outTradeNo,
      transactionId,
      status: 'paid',
      packageType: order.package_type,
      generationId: order.generation_id,
      openid
    }).catch(err => {
      console.error('[wxpay_order_callback] 通知后端失败:', err.message);
      // 不影响主流程，后端可以通过轮询获取订单状态
    });
    
    return { code: 'SUCCESS', message: '处理成功' };
    
  } catch (error) {
    console.error('[wxpay_order_callback] 处理支付回调失败:', error);
    return { code: 'FAIL', message: error.message || '处理失败' };
  }
};

/**
 * 异步通知后端服务器
 * @param {Object} paymentData 支付数据
 */
async function notifyBackend(paymentData) {
  const apiBaseUrl = process.env.API_BASE_URL;
  const internalSecret = process.env.INTERNAL_API_SECRET;
  
  if (!apiBaseUrl) {
    console.log('[wxpay_order_callback] API_BASE_URL 未配置，跳过后端通知');
    return;
  }
  
  try {
    const url = `${apiBaseUrl}/api/payment/internal/notify`;
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // 如果配置了内部密钥，添加到请求头
    if (internalSecret) {
      headers['X-Internal-Secret'] = internalSecret;
    }
    
    console.log('[wxpay_order_callback] 通知后端:', url);
    
    const response = await axios.post(url, paymentData, {
      timeout: 5000,
      headers
    });
    
    console.log('[wxpay_order_callback] 后端通知成功:', response.data);
  } catch (error) {
    // 记录错误但不抛出，不影响主流程
    if (error.code === 'ECONNREFUSED') {
      console.error('[wxpay_order_callback] 后端服务器连接被拒绝，请检查服务器是否运行');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('[wxpay_order_callback] 后端服务器响应超时');
    } else {
      console.error('[wxpay_order_callback] 通知后端失败:', error.message);
    }
  }
}

async function updateUserBenefits(openid, order) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  
  const { data: users } = await safeDb.select('users', 'openid', openid);
  const user = users && users[0];
  
  const benefitData = {
    is_paid: 1,
    current_package: order.package_type,
    package_expires_at: expiresAt,
    last_order_id: order.out_trade_no,
    updated_at: new Date()
  };
  
  if (user) {
    const packageLevel = { free: 0, basic: 1, premium: 2 };
    const currentLevel = packageLevel[user.current_package] || 0;
    const newLevel = packageLevel[order.package_type] || 0;
    
    if (newLevel >= currentLevel) {
      await safeDb.update('users', 'openid', openid, benefitData);
      console.log('[wxpay_order_callback] 用户权益已更新:', { openid, package: order.package_type });
    } else {
      console.log('[wxpay_order_callback] 用户已有更高等级套餐，跳过更新');
    }
  } else {
    await safeDb.insert('users', { openid, ...benefitData, created_at: new Date() });
    console.log('[wxpay_order_callback] 新用户权益已创建:', { openid, package: order.package_type });
  }
}
