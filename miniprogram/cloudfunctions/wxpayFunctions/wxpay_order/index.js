/**
 * 微信支付 - 下单
 */
const cloud = require('wx-server-sdk');
const db = require('../db/mysql');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const PACKAGES = {
  basic: { name: '9.9元尝鲜包', amount: 990, description: 'AI全家福-尝鲜包' },
  premium: { name: '29.9元尊享包', amount: 2990, description: 'AI全家福-尊享包' }
};

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { packageType, generationId, userId, description, amount } = event;
  
  const packageConfig = PACKAGES[packageType];
  if (!packageConfig && !amount) {
    return { code: -1, msg: '无效的套餐类型或未指定金额' };
  }
  
  const orderAmount = amount || packageConfig.amount;
  const orderDescription = description || packageConfig.description;
  const outTradeNo = `${Date.now()}${Math.round(Math.random() * 10000)}`;
  
  try {
    // 存储订单到 MySQL
    await db.insert('orders', {
      out_trade_no: outTradeNo,
      package_type: packageType,
      generation_id: generationId || null,
      user_id: userId || null,
      openid: wxContext.OPENID,
      amount: orderAmount,
      description: orderDescription,
      status: 'pending'
    });
    
    // 调用微信支付下单
    const res = await cloud.callFunction({
      name: 'cloudbase_module',
      data: {
        name: 'wxpay_order',
        data: {
          description: orderDescription,
          amount: { total: orderAmount, currency: 'CNY' },
          out_trade_no: outTradeNo,
          payer: { openid: wxContext.OPENID }
        }
      }
    });
    
    if (res.result && res.result.payment) {
      return {
        code: 0,
        msg: 'success',
        data: {
          timeStamp: res.result.payment.timeStamp,
          nonceStr: res.result.payment.nonceStr,
          packageVal: res.result.payment.package,
          paySign: res.result.payment.paySign,
          outTradeNo
        }
      };
    }
    
    return res.result;
  } catch (error) {
    console.error('创建订单失败:', error);
    return { code: -1, msg: error.message || '创建订单失败' };
  }
};
