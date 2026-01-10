/**
 * 微信支付 - 支付结果回调
 */
const cloud = require('wx-server-sdk');
const { safeDb } = require('../db/mysql');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  console.log('[wxpay_order_callback] 收到支付回调:', JSON.stringify(event));
  
  try {
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
    
    return { code: 'SUCCESS', message: '处理成功' };
    
  } catch (error) {
    console.error('[wxpay_order_callback] 处理支付回调失败:', error);
    return { code: 'FAIL', message: error.message || '处理失败' };
  }
};

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
