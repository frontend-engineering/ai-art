/**
 * 微信支付 - 下单
 */
const cloud = require('wx-server-sdk');
const { safeDb } = require('../db/mysql');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const PACKAGES = {
  basic: { name: '9.9元尝鲜包', amount: 990, description: 'AI全家福-尝鲜包' },
  premium: { name: '29.9元尊享包', amount: 2990, description: 'AI全家福-尊享包' }
};

function generateOutTradeNo() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${timestamp}${random}`;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { packageType, generationId, userId, description, amount } = event;
  
  // 打印环境信息用于调试
  console.log('[wxpay_order] 环境信息:', {
    ENV: wxContext.ENV,
    APPID: wxContext.APPID,
    OPENID: wxContext.OPENID,
    UNIONID: wxContext.UNIONID,
    CLIENTIP: wxContext.CLIENTIP,
    CLIENTIPV6: wxContext.CLIENTIPV6,
    SOURCE: wxContext.SOURCE
  });
  console.log('[wxpay_order] 云函数环境变量:', {
    TCB_ENV: process.env.TCB_ENV,
    TCB_ENVID: process.env.TCB_ENVID,
    SCF_NAMESPACE: process.env.SCF_NAMESPACE,
    TENCENTCLOUD_APPID: process.env.TENCENTCLOUD_APPID
  });
  
  console.log('[wxpay_order] 收到请求:', { packageType, generationId, userId, openid: wxContext.OPENID });
  
  const packageConfig = PACKAGES[packageType];
  if (!packageConfig && !amount) {
    return { code: -1, msg: '无效的套餐类型或未指定金额' };
  }
  
  const orderAmount = amount || packageConfig.amount;
  const orderDescription = description || packageConfig.description;
  const outTradeNo = generateOutTradeNo();
  
  console.log('[wxpay_order] 订单信息:', { outTradeNo, orderAmount, orderDescription });
  
  // 调用微信支付下单（核心流程）
  let paymentResult;
  try {
    console.log('[wxpay_order] 调用 cloudbase_module 下单...');
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
    
    console.log('[wxpay_order] cloudbase_module 返回:', JSON.stringify(res.result));
    
    if (!res.result) {
      return { code: -1, msg: '支付服务返回为空' };
    }
    
    // 检查各种可能的返回格式
    if (res.result.payment) {
      // 标准成功格式 (payment 对象)
      paymentResult = {
        timeStamp: res.result.payment.timeStamp,
        nonceStr: res.result.payment.nonceStr,
        packageVal: res.result.payment.package || res.result.payment.packageVal,
        paySign: res.result.payment.paySign,
        outTradeNo
      };
    } else if (res.result.code === 0 && res.result.data) {
      // 新版返回格式 (data 对象)
      const data = res.result.data;
      paymentResult = {
        timeStamp: data.timeStamp,
        nonceStr: data.nonceStr,
        packageVal: data.package || data.packageVal,
        paySign: data.paySign,
        outTradeNo
      };
    } else if (res.result.timeStamp && res.result.paySign) {
      // 直接返回支付参数
      paymentResult = {
        timeStamp: res.result.timeStamp,
        nonceStr: res.result.nonceStr,
        packageVal: res.result.package || res.result.packageVal,
        paySign: res.result.paySign,
        outTradeNo
      };
    } else if (res.result.errcode && res.result.errmsg) {
      // 错误格式
      return { 
        code: -1, 
        msg: res.result.errmsg || '支付下单失败',
        errcode: res.result.errcode,
        data: res.result
      };
    } else {
      // 未知格式
      return { 
        code: -1, 
        msg: '支付服务返回格式异常，请查看data字段',
        data: res.result
      };
    }
  } catch (error) {
    console.error('[wxpay_order] 调用支付服务失败:', error);
    return { code: -1, msg: error.message || '调用支付服务失败' };
  }
  
  // 存储订单到数据库（非核心流程，失败不影响支付）
  try {
    await safeDb.insert('orders', {
      out_trade_no: outTradeNo,
      package_type: packageType,
      generation_id: generationId || null,
      user_id: userId || null,
      openid: wxContext.OPENID,
      amount: orderAmount,
      description: orderDescription,
      status: 'pending',
      created_at: new Date()
    });
    console.log('[wxpay_order] 订单已存储到数据库');
  } catch (dbError) {
    console.error('[wxpay_order] 数据库存储失败（不影响支付）:', dbError.message);
  }
  
  return { code: 0, msg: 'success', data: paymentResult };
};
