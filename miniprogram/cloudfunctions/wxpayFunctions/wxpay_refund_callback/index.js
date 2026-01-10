/**
 * 微信支付 - 退款结果回调
 */
const cloud = require('wx-server-sdk');
const db = require('../db/mysql');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const REFUND_STATUS = {
  SUCCESS: 'success',
  CLOSED: 'closed',
  ABNORMAL: 'abnormal'
};

exports.main = async (event, context) => {
  console.log('收到退款回调:', JSON.stringify(event));
  
  try {
    const eventType = event.event_type;
    
    let refundStatus;
    if (eventType === 'REFUND.SUCCESS') {
      refundStatus = REFUND_STATUS.SUCCESS;
    } else if (eventType === 'REFUND.CLOSED') {
      refundStatus = REFUND_STATUS.CLOSED;
    } else if (eventType === 'REFUND.ABNORMAL') {
      refundStatus = REFUND_STATUS.ABNORMAL;
    } else {
      return { code: 'SUCCESS', message: '处理成功' };
    }
    
    const resource = event.resource || event;
    const outTradeNo = resource.out_trade_no;
    const outRefundNo = resource.out_refund_no;
    const refundId = resource.refund_id;
    const amount = resource.amount;
    
    if (!outRefundNo) {
      return { code: 'FAIL', message: '缺少退款单号' };
    }
    
    console.log('处理退款:', { outRefundNo, refundStatus });
    
    // 查询退款记录
    const refundRecord = await db.findOne('refunds', 'out_refund_no = ?', [outRefundNo]);
    
    if (!refundRecord) {
      return { code: 'SUCCESS', message: '退款记录不存在，忽略' };
    }
    
    if (refundRecord.status === 'success') {
      return { code: 'SUCCESS', message: '退款已处理' };
    }
    
    // 更新退款状态
    await db.update('refunds', {
      status: refundStatus,
      refund_id: refundId,
      refund_amount: amount?.refund,
      refunded_at: new Date()
    }, 'out_refund_no = ?', [outRefundNo]);
    
    // 退款成功时更新订单和用户
    if (refundStatus === REFUND_STATUS.SUCCESS && outTradeNo) {
      await updateOrderAfterRefund(outTradeNo, amount);
    }
    
    // 记录日志
    await db.insert('payment_logs', {
      type: 'refund_callback',
      out_trade_no: outTradeNo,
      out_refund_no: outRefundNo,
      event_type: eventType,
      amount_total: amount?.refund
    });
    
    return { code: 'SUCCESS', message: '处理成功' };
    
  } catch (error) {
    console.error('处理退款回调失败:', error);
    return { code: 'FAIL', message: error.message || '处理失败' };
  }
};

async function updateOrderAfterRefund(outTradeNo, amount) {
  try {
    const order = await db.findOne('orders', 'out_trade_no = ?', [outTradeNo]);
    if (!order) return;
    
    const isFullRefund = amount?.refund >= order.amount;
    const newStatus = isFullRefund ? 'refunded' : 'partial_refunded';
    
    await db.update('orders', {
      status: newStatus,
      refunded_amount: amount?.refund,
      refunded_at: new Date()
    }, 'out_trade_no = ?', [outTradeNo]);
    
    // 全额退款撤销用户权益
    if (isFullRefund && order.openid) {
      const user = await db.findOne('users', 'openid = ?', [order.openid]);
      if (user && user.last_order_id === outTradeNo) {
        await db.update('users', {
          is_paid: 0,
          current_package: 'free',
          package_expires_at: null
        }, 'openid = ?', [order.openid]);
      }
    }
  } catch (error) {
    console.error('更新订单失败:', error);
    throw error;
  }
}
