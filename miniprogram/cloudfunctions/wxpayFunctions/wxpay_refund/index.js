/**
 * 微信支付 - 申请退款
 * 
 * 接收参数:
 * - transaction_id: 微信交易号
 * - out_refund_no: 商户退款单号 (可选，自动生成)
 * - amount: 退款金额信息
 *   - refund: 退款金额(分)
 *   - total: 原订单金额(分)
 *   - currency: 货币类型 (默认 CNY)
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 云函数入口函数
exports.main = async (event, context) => {
  const db = cloud.database();
  const { transaction_id, out_refund_no, amount } = event;
  
  // 验证参数
  if (!transaction_id) {
    return {
      code: -1,
      msg: '缺少微信交易号参数'
    };
  }
  
  if (!amount || !amount.refund || !amount.total) {
    return {
      code: -1,
      msg: '缺少退款金额参数'
    };
  }
  
  // 验证退款金额
  if (amount.refund > amount.total) {
    return {
      code: -1,
      msg: '退款金额不能大于原订单金额'
    };
  }
  
  if (amount.refund <= 0) {
    return {
      code: -1,
      msg: '退款金额必须大于0'
    };
  }
  
  // 生成退款单号
  const refundNo = out_refund_no || `refund_${Date.now()}${Math.round(Math.random() * 1000)}`;
  
  try {
    // 记录退款请求到数据库
    const refundData = {
      transaction_id,
      out_refund_no: refundNo,
      refund_amount: amount.refund,
      total_amount: amount.total,
      status: 'processing',
      createdAt: db.serverDate()
    };
    
    await db.collection('refunds').add({ data: refundData });
    
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
            currency: amount.currency || 'CNY',
          },
        },
      },
    });
    
    // 更新退款状态
    if (res.result && res.result.status) {
      await db.collection('refunds').where({
        out_refund_no: refundNo
      }).update({
        data: {
          status: res.result.status,
          refund_id: res.result.refund_id,
          updatedAt: db.serverDate()
        }
      });
    }
    
    // 格式化返回结果
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
    return {
      code: -1,
      msg: error.message || '退款申请失败'
    };
  }
};