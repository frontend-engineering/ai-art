/**
 * 微信支付 - 申请退款
 */
const cloud = require('wx-server-sdk');
const db = require('../db/mysql');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { transaction_id, out_refund_no, amount } = event;
  
  if (!transaction_id) {
    return { code: -1, msg: '缺少微信交易号参数' };
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
  
  const refundNo = out_refund_no || `refund_${Date.now()}${Math.round(Math.random() * 1000)}`;
  
  try {
    // 记录退款请求到 MySQL
    await db.insert('refunds', {
      out_refund_no: refundNo,
      transaction_id,
      refund_amount: amount.refund,
      total_amount: amount.total,
      status: 'processing'
    });
    
    // 调用微信退款接口
    const res = await cloud.callFunction({
      name: 'cloudbase_module',
      data: {
        name: 'wxpay_refund',
        data: {
          transaction_id,
          out_refund_no: refundNo,
          amount: {
            refund: amount.refund,
            total: amount.total,
            currency: amount.currency || 'CNY'
          }
        }
      }
    });
    
    // 更新退款状态
    if (res.result && res.result.status) {
      await db.update('refunds', 
        { status: res.result.status, refund_id: res.result.refund_id },
        'out_refund_no = ?', [refundNo]
      );
    }
    
    if (res.result) {
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
    
    return res.result;
  } catch (error) {
    console.error('退款申请失败:', error);
    return { code: -1, msg: error.message || '退款申请失败' };
  }
};
