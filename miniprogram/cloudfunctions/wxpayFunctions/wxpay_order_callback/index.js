/**
 * 微信支付 - 支付结果回调
 * 
 * 接收微信支付通知，更新订单状态和用户权益
 * 
 * 接收参数 (微信支付通知):
 * - event_type: 事件类型 (TRANSACTION.SUCCESS 表示支付成功)
 * - resource: 加密的通知数据
 *   - ciphertext: 密文
 *   - nonce: 随机串
 *   - associated_data: 附加数据
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 云函数入口函数
exports.main = async (event, context) => {
  const db = cloud.database();
  
  console.log('收到支付回调:', JSON.stringify(event));
  
  try {
    // 验证事件类型
    const eventType = event.event_type;
    
    if (eventType !== 'TRANSACTION.SUCCESS') {
      console.log('非支付成功事件:', eventType);
      return {
        code: 'SUCCESS',
        message: '处理成功'
      };
    }
    
    // 解密通知数据 (CloudBase 会自动解密)
    const resource = event.resource || event;
    const outTradeNo = resource.out_trade_no;
    const transactionId = resource.transaction_id;
    const tradeState = resource.trade_state;
    const amount = resource.amount;
    const payer = resource.payer;
    
    if (!outTradeNo) {
      console.error('缺少订单号');
      return {
        code: 'FAIL',
        message: '缺少订单号'
      };
    }
    
    console.log('处理订单:', { outTradeNo, transactionId, tradeState });
    
    // 查询订单
    const orderResult = await db.collection('orders').where({
      outTradeNo
    }).get();
    
    if (!orderResult.data || orderResult.data.length === 0) {
      console.error('订单不存在:', outTradeNo);
      return {
        code: 'SUCCESS',
        message: '订单不存在，忽略'
      };
    }
    
    const order = orderResult.data[0];
    
    // 检查订单是否已处理
    if (order.status === 'paid') {
      console.log('订单已处理:', outTradeNo);
      return {
        code: 'SUCCESS',
        message: '订单已处理'
      };
    }
    
    // 更新订单状态
    await db.collection('orders').where({
      outTradeNo
    }).update({
      data: {
        status: 'paid',
        transactionId,
        paidAt: db.serverDate(),
        paidAmount: amount?.total || order.amount,
        updatedAt: db.serverDate()
      }
    });
    
    console.log('订单状态已更新:', outTradeNo);
    
    // 更新用户权益
    const openid = payer?.openid || order.openid;
    if (openid && order.packageType) {
      await updateUserBenefits(db, openid, order);
    }
    
    // 记录支付回调日志
    await db.collection('payment_logs').add({
      data: {
        type: 'callback',
        outTradeNo,
        transactionId,
        tradeState,
        amount,
        openid,
        packageType: order.packageType,
        generationId: order.generationId,
        createdAt: db.serverDate()
      }
    });
    
    return {
      code: 'SUCCESS',
      message: '处理成功'
    };
    
  } catch (error) {
    console.error('处理支付回调失败:', error);
    
    // 返回失败，微信会重试
    return {
      code: 'FAIL',
      message: error.message || '处理失败'
    };
  }
};

/**
 * 更新用户权益
 * @param {Object} db 数据库实例
 * @param {string} openid 用户openid
 * @param {Object} order 订单信息
 */
async function updateUserBenefits(db, openid, order) {
  try {
    // 查询用户
    const userResult = await db.collection('users').where({
      openid
    }).get();
    
    const now = new Date();
    const packageType = order.packageType;
    
    // 计算权益有效期 (30天)
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const benefitsData = {
      packageType,
      paidAt: db.serverDate(),
      expiresAt,
      orderId: order.outTradeNo,
      generationId: order.generationId
    };
    
    if (userResult.data && userResult.data.length > 0) {
      // 更新现有用户
      await db.collection('users').where({
        openid
      }).update({
        data: {
          isPaid: true,
          currentPackage: packageType,
          benefits: benefitsData,
          updatedAt: db.serverDate()
        }
      });
    } else {
      // 创建新用户记录
      await db.collection('users').add({
        data: {
          openid,
          isPaid: true,
          currentPackage: packageType,
          benefits: benefitsData,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      });
    }
    
    console.log('用户权益已更新:', { openid, packageType });
    
  } catch (error) {
    console.error('更新用户权益失败:', error);
    throw error;
  }
}
