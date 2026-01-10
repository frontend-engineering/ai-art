/**
 * 微信支付 - 退款结果回调
 * 
 * 接收微信退款通知，更新退款状态和用户权益
 * 配置方式：在 CloudBase 控制台配置退款通知 URL 指向 scf:wxpayRefundCallback
 * 
 * 接收参数 (微信退款通知):
 * - event_type: 事件类型 (REFUND.SUCCESS / REFUND.ABNORMAL / REFUND.CLOSED)
 * - resource: 通知数据
 *   - out_trade_no: 商户订单号
 *   - transaction_id: 微信交易号
 *   - out_refund_no: 商户退款单号
 *   - refund_id: 微信退款单号
 *   - refund_status: 退款状态
 *   - amount: 金额信息
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 退款状态映射
const REFUND_STATUS = {
  SUCCESS: 'success',      // 退款成功
  CLOSED: 'closed',        // 退款关闭
  ABNORMAL: 'abnormal'     // 退款异常
};

// 云函数入口函数
exports.main = async (event, context) => {
  const db = cloud.database();
  
  console.log('收到退款回调:', JSON.stringify(event));
  
  try {
    // 验证事件类型
    const eventType = event.event_type;
    
    // 解析退款状态
    let refundStatus;
    if (eventType === 'REFUND.SUCCESS') {
      refundStatus = REFUND_STATUS.SUCCESS;
    } else if (eventType === 'REFUND.CLOSED') {
      refundStatus = REFUND_STATUS.CLOSED;
    } else if (eventType === 'REFUND.ABNORMAL') {
      refundStatus = REFUND_STATUS.ABNORMAL;
    } else {
      console.log('未知退款事件类型:', eventType);
      return {
        code: 'SUCCESS',
        message: '处理成功'
      };
    }
    
    // 解析通知数据
    const resource = event.resource || event;
    const outTradeNo = resource.out_trade_no;
    const transactionId = resource.transaction_id;
    const outRefundNo = resource.out_refund_no;
    const refundId = resource.refund_id;
    const amount = resource.amount;
    
    if (!outRefundNo) {
      console.error('缺少退款单号');
      return {
        code: 'FAIL',
        message: '缺少退款单号'
      };
    }
    
    console.log('处理退款:', { outRefundNo, refundStatus, outTradeNo });
    
    // 查询退款记录
    const refundResult = await db.collection('refunds').where({
      out_refund_no: outRefundNo
    }).get();
    
    if (!refundResult.data || refundResult.data.length === 0) {
      console.error('退款记录不存在:', outRefundNo);
      return {
        code: 'SUCCESS',
        message: '退款记录不存在，忽略'
      };
    }
    
    const refundRecord = refundResult.data[0];
    
    // 检查是否已处理
    if (refundRecord.status === 'success') {
      console.log('退款已处理:', outRefundNo);
      return {
        code: 'SUCCESS',
        message: '退款已处理'
      };
    }
    
    // 更新退款状态
    await db.collection('refunds').where({
      out_refund_no: outRefundNo
    }).update({
      data: {
        status: refundStatus,
        refund_id: refundId,
        refund_amount: amount?.refund,
        refundedAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });
    
    console.log('退款状态已更新:', outRefundNo);
    
    // 如果退款成功，更新订单状态和用户权益
    if (refundStatus === REFUND_STATUS.SUCCESS && outTradeNo) {
      await updateOrderAndUserAfterRefund(db, outTradeNo, amount);
    }
    
    // 记录退款回调日志
    await db.collection('payment_logs').add({
      data: {
        type: 'refund_callback',
        outTradeNo,
        transactionId,
        outRefundNo,
        refundId,
        refundStatus,
        amount,
        eventType,
        createdAt: db.serverDate()
      }
    });
    
    return {
      code: 'SUCCESS',
      message: '处理成功'
    };
    
  } catch (error) {
    console.error('处理退款回调失败:', error);
    
    return {
      code: 'FAIL',
      message: error.message || '处理失败'
    };
  }
};

/**
 * 退款成功后更新订单和用户权益
 * @param {Object} db 数据库实例
 * @param {string} outTradeNo 商户订单号
 * @param {Object} amount 退款金额信息
 */
async function updateOrderAndUserAfterRefund(db, outTradeNo, amount) {
  try {
    // 查询订单
    const orderResult = await db.collection('orders').where({
      outTradeNo
    }).get();
    
    if (!orderResult.data || orderResult.data.length === 0) {
      console.log('订单不存在，跳过更新:', outTradeNo);
      return;
    }
    
    const order = orderResult.data[0];
    
    // 判断是全额退款还是部分退款
    const isFullRefund = amount?.refund >= order.amount;
    const newStatus = isFullRefund ? 'refunded' : 'partial_refunded';
    
    // 更新订单状态
    await db.collection('orders').where({
      outTradeNo
    }).update({
      data: {
        status: newStatus,
        refundedAmount: amount?.refund,
        refundedAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });
    
    console.log('订单状态已更新:', { outTradeNo, newStatus });
    
    // 如果是全额退款，撤销用户权益
    if (isFullRefund && order.openid) {
      await revokeUserBenefits(db, order.openid, order);
    }
    
  } catch (error) {
    console.error('更新订单和用户权益失败:', error);
    throw error;
  }
}

/**
 * 撤销用户权益
 * @param {Object} db 数据库实例
 * @param {string} openid 用户openid
 * @param {Object} order 订单信息
 */
async function revokeUserBenefits(db, openid, order) {
  try {
    // 查询用户
    const userResult = await db.collection('users').where({
      openid
    }).get();
    
    if (!userResult.data || userResult.data.length === 0) {
      console.log('用户不存在，跳过撤销权益:', openid);
      return;
    }
    
    const user = userResult.data[0];
    
    // 检查当前权益是否来自该订单
    if (user.benefits?.orderId !== order.outTradeNo) {
      console.log('用户当前权益非该订单，跳过撤销:', openid);
      return;
    }
    
    // 撤销权益，恢复为免费用户
    await db.collection('users').where({
      openid
    }).update({
      data: {
        isPaid: false,
        currentPackage: 'free',
        benefits: null,
        updatedAt: db.serverDate()
      }
    });
    
    console.log('用户权益已撤销:', { openid, orderId: order.outTradeNo });
    
  } catch (error) {
    console.error('撤销用户权益失败:', error);
    throw error;
  }
}
