/**
 * 微信支付 - 退款结果回调
 */
const cloud = require('wx-server-sdk');
const { safeDb } = require('../db/mysql');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const REFUND_STATUS = { SUCCESS: 'success', CLOSED: 'closed', ABNORMAL: 'abnormal' };

exports.main = async (event, context) => {
  console.log('[wxpay_refund_callback] 收到退款回调:', JSON.stringify(event));
  
  try {
    const eventType = event.event_type;
    
    let refundStatus;
    if (eventType === 'REFUND.SUCCESS') refundStatus = REFUND_STATUS.SUCCESS;
    else if (eventType === 'REFUND.CLOSED') refundStatus = REFUND_STATUS.CLOSED;
    else if (eventType === 'REFUND.ABNORMAL') refundStatus = REFUND_STATUS.ABNORMAL;
    else {
      console.log('[wxpay_refund_callback] 未知事件类型:', eventType);
      return { code: 'SUCCESS', message: '处理成功' };
    }
    
    const resource = event.resource || event;
    const outTradeNo = resource.out_trade_no || resource.outTradeNo;
    const outRefundNo = resource.out_refund_no || resource.outRefundNo;
    const refundId = resource.refund_id || resource.refundId;
    const amount = resource.amount;
    
    if (!outRefundNo) {
      return { code: 'SUCCESS', message: '缺少退款单号，忽略' };
    }
    
    // 查询退款记录
    let refundRecord = null;
    try {
      const { data: refunds } = await safeDb.select('refunds', 'out_refund_no', outRefundNo);
      refundRecord = refunds && refunds[0];
    } catch (e) {}
    
    if (refundRecord && refundRecord.status === 'success') {
      return { code: 'SUCCESS', message: '退款已处理' };
    }
    
    // 更新退款状态
    try {
      if (refundRecord) {
        await safeDb.update('refunds', 'out_refund_no', outRefundNo, {
          status: refundStatus, refund_id: refundId, refund_amount: amount?.refund,
          refunded_at: new Date(), updated_at: new Date()
        });
      } else {
        await safeDb.insert('refunds', {
          out_refund_no: outRefundNo, out_trade_no: outTradeNo, refund_id: refundId,
          refund_amount: amount?.refund, total_amount: amount?.total, status: refundStatus,
          refunded_at: new Date(), created_at: new Date()
        });
      }
    } catch (e) {
      console.error('[wxpay_refund_callback] 更新退款状态失败:', e.message);
      return { code: 'FAIL', message: '更新退款状态失败' };
    }
    
    // 退款成功时更新订单
    if (refundStatus === REFUND_STATUS.SUCCESS && outTradeNo) {
      try {
        await updateOrderAfterRefund(outTradeNo, amount);
      } catch (e) {
        console.error('[wxpay_refund_callback] 更新订单失败:', e.message);
      }
    }
    
    // 记录日志
    try {
      await safeDb.insert('payment_logs', {
        type: 'refund_callback', out_trade_no: outTradeNo, out_refund_no: outRefundNo,
        event_type: eventType, amount_total: amount?.refund, created_at: new Date()
      });
    } catch (e) {}
    
    return { code: 'SUCCESS', message: '处理成功' };
  } catch (error) {
    console.error('[wxpay_refund_callback] 处理退款回调失败:', error);
    return { code: 'FAIL', message: error.message || '处理失败' };
  }
};

async function updateOrderAfterRefund(outTradeNo, amount) {
  const { data: orders } = await safeDb.select('orders', 'out_trade_no', outTradeNo);
  const order = orders && orders[0];
  if (!order) return;
  
  const isFullRefund = amount?.refund >= order.amount;
  const newStatus = isFullRefund ? 'refunded' : 'partial_refunded';
  
  await safeDb.update('orders', 'out_trade_no', outTradeNo, {
    status: newStatus,
    refunded_amount: (order.refunded_amount || 0) + (amount?.refund || 0),
    refunded_at: new Date(), updated_at: new Date()
  });
  
  if (isFullRefund && order.openid) {
    try {
      const { data: users } = await safeDb.select('users', 'openid', order.openid);
      const user = users && users[0];
      if (user && user.last_order_id === outTradeNo) {
        await safeDb.update('users', 'openid', order.openid, {
          is_paid: 0, current_package: 'free', package_expires_at: null, updated_at: new Date()
        });
      }
    } catch (e) {}
  }
}
