/**
 * 微信支付 - 支付结果回调
 */
const cloud = require('wx-server-sdk');
const db = require('../db/mysql');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  console.log('收到支付回调:', JSON.stringify(event));
  
  try {
    const eventType = event.event_type;
    
    if (eventType !== 'TRANSACTION.SUCCESS') {
      console.log('非支付成功事件:', eventType);
      return { code: 'SUCCESS', message: '处理成功' };
    }
    
    const resource = event.resource || event;
    const outTradeNo = resource.out_trade_no;
    const transactionId = resource.transaction_id;
    const amount = resource.amount;
    const payer = resource.payer;
    
    if (!outTradeNo) {
      return { code: 'FAIL', message: '缺少订单号' };
    }
    
    console.log('处理订单:', { outTradeNo, transactionId });
    
    // 查询订单
    const order = await db.findOne('orders', 'out_trade_no = ?', [outTradeNo]);
    
    if (!order) {
      console.error('订单不存在:', outTradeNo);
      return { code: 'SUCCESS', message: '订单不存在，忽略' };
    }
    
    if (order.status === 'paid') {
      console.log('订单已处理:', outTradeNo);
      return { code: 'SUCCESS', message: '订单已处理' };
    }
    
    // 更新订单状态
    await db.update('orders', {
      status: 'paid',
      transaction_id: transactionId,
      paid_at: new Date(),
      paid_amount: amount?.total || order.amount
    }, 'out_trade_no = ?', [outTradeNo]);
    
    console.log('订单状态已更新:', outTradeNo);
    
    // 更新用户权益
    const openid = payer?.openid || order.openid;
    if (openid && order.package_type) {
      await updateUserBenefits(openid, order);
    }
    
    // 记录日志
    await db.insert('payment_logs', {
      type: 'callback',
      out_trade_no: outTradeNo,
      transaction_id: transactionId,
      openid,
      package_type: order.package_type,
      generation_id: order.generation_id,
      event_type: eventType,
      amount_total: amount?.total
    });
    
    return { code: 'SUCCESS', message: '处理成功' };
    
  } catch (error) {
    console.error('处理支付回调失败:', error);
    return { code: 'FAIL', message: error.message || '处理失败' };
  }
};

async function updateUserBenefits(openid, order) {
  try {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const user = await db.findOne('users', 'openid = ?', [openid]);
    
    if (user) {
      await db.update('users', {
        is_paid: 1,
        current_package: order.package_type,
        package_expires_at: expiresAt,
        last_order_id: order.out_trade_no
      }, 'openid = ?', [openid]);
    } else {
      await db.insert('users', {
        openid,
        is_paid: 1,
        current_package: order.package_type,
        package_expires_at: expiresAt,
        last_order_id: order.out_trade_no
      });
    }
    
    console.log('用户权益已更新:', { openid, package: order.package_type });
  } catch (error) {
    console.error('更新用户权益失败:', error);
    throw error;
  }
}
