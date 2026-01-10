/**
 * 微信支付 - 申请退款
 */
const cloud = require('wx-server-sdk');
const { safeDb } = require('../db/mysql');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { transaction_id, out_trade_no, out_refund_no, amount } = event;
  
  console.log('[wxpay_refund] 收到退款请求:', { transaction_id, out_trade_no, amount });
  
  if (!transaction_id && !out_trade_no) {
    return { code: -1, msg: '缺少微信交易号或商户订单号' };
  }
  
  if (!amount || !amount.refund || !amount.total) {
    return { code: -1, msg: '缺少退款金额参数' };
  }
  
  if (amount.refund > amount.total) {
    return { code: -1, msg: '退款金额不能大于原订单金额' };
  }
  
  if (amount.refund <= 0) {
    return { code: -1, msg: '退款金额必须大于0' };
  }
  
  const refundNo = out_refund_no || `refund_${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  
  try {
    // 记录退款请求
    try {
      await safeDb.insert('refunds', {
        out_refund_no: refundNo,
        transaction_id: transaction_id || null,
        out_trade_no: out_trade_no || null,
        refund_amount: amount.refund,
        total_amount: amount.total,
        status: 'processing',
        created_at: new Date()
      });
    } catch (dbError) {
      console.error('[wxpay_refund] 存储退款记录失败:', dbError.message);
    }
    
    // 调用微信退款接口
    const refundData = {
      out_refund_no: refundNo,
      amount: { refund: amount.refund, total: amount.total, currency: amount.currency || 'CNY' }
    };
    
    if (transaction_id) {
      refundData.transaction_id = transaction_id;
    } else {
      refundData.out_trade_no = out_trade_no;
    }
    
    const res = await cloud.callFunction({
      name: 'cloudbase_module',
      data: { name: 'wxpay_refund', data: refundData }
    });
    
    console.log('[wxpay_refund] cloudbase_module 返回:', JSON.stringify(res.result));
    
    if (res.result) {
      try {
        await safeDb.update('refunds', 'out_refund_no', refundNo, { 
          status: res.result.status || 'submitted',
          refund_id: res.result.refund_id,
          updated_at: new Date()
        });
      } catch (e) {}
      
      return {
        code: 0,
        msg: 'success',
        data: {
          refund_id: res.result.refund_id,
          out_refund_no: refundNo,
          status: res.result.status,
          amount: res.result.amount
        }
      };
    }
    
    return { code: -1, msg: '退款服务返回为空' };
  } catch (error) {
    console.error('[wxpay_refund] 退款申请失败:', error);
    try {
      await safeDb.update('refunds', 'out_refund_no', refundNo, { 
        status: 'failed', error_msg: error.message, updated_at: new Date()
      });
    } catch (e) {}
    return { code: -1, msg: error.message || '退款申请失败' };
  }
};
