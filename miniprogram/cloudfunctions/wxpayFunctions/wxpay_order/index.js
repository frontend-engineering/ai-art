/**
 * 微信支付 - 下单
 * 支持两种支付模式：
 * - JSAPI: 小程序支付（默认）
 * - NATIVE: PC 扫码支付
 */
const cloud = require('wx-server-sdk');
const { safeDb } = require('../db/mysql');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const PACKAGES = {
  basic: { name: '9.9元尝鲜包', amount: 990, description: 'AI全家福-尝鲜包' },
  premium: { name: '29.9元尊享包', amount: 2990, description: 'AI全家福-尊享包' }
};

// 支付模式
const TRADE_TYPES = {
  JSAPI: 'JSAPI',   // 小程序支付
  NATIVE: 'NATIVE'  // PC 扫码支付
};

function generateOutTradeNo() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${timestamp}${random}`;
}

/**
 * 小程序支付下单 (JSAPI)
 */
async function createJsapiOrder(params) {
  const { orderDescription, orderAmount, outTradeNo, openid } = params;
  
  console.log('[wxpay_order] 调用 cloudbase_module 下单 (JSAPI)...');
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      name: 'wxpay_order',
      data: {
        description: orderDescription,
        amount: { total: orderAmount, currency: 'CNY' },
        out_trade_no: outTradeNo,
        payer: { openid }
      }
    }
  });
  
  console.log('[wxpay_order] cloudbase_module 返回:', JSON.stringify(res.result));
  
  if (!res.result) {
    return { code: -1, msg: '支付服务返回为空' };
  }
  
  // 检查各种可能的返回格式
  if (res.result.payment) {
    return {
      code: 0,
      data: {
        tradeType: TRADE_TYPES.JSAPI,
        timeStamp: res.result.payment.timeStamp,
        nonceStr: res.result.payment.nonceStr,
        packageVal: res.result.payment.package || res.result.payment.packageVal,
        paySign: res.result.payment.paySign,
        outTradeNo
      }
    };
  } else if (res.result.code === 0 && res.result.data) {
    const data = res.result.data;
    return {
      code: 0,
      data: {
        tradeType: TRADE_TYPES.JSAPI,
        timeStamp: data.timeStamp,
        nonceStr: data.nonceStr,
        packageVal: data.package || data.packageVal,
        paySign: data.paySign,
        outTradeNo
      }
    };
  } else if (res.result.timeStamp && res.result.paySign) {
    return {
      code: 0,
      data: {
        tradeType: TRADE_TYPES.JSAPI,
        timeStamp: res.result.timeStamp,
        nonceStr: res.result.nonceStr,
        packageVal: res.result.package || res.result.packageVal,
        paySign: res.result.paySign,
        outTradeNo
      }
    };
  } else if (res.result.errcode && res.result.errmsg) {
    return { 
      code: -1, 
      msg: res.result.errmsg || '支付下单失败',
      errcode: res.result.errcode,
      data: res.result
    };
  }
  
  return { 
    code: -1, 
    msg: '支付服务返回格式异常',
    data: res.result
  };
}

/**
 * PC 扫码支付下单 (NATIVE)
 * 注意：cloudbase_module 可能不支持 wxpay_native_order
 * 如果不支持，需要通过后端服务调用微信支付 API v3
 */
async function createNativeOrder(params) {
  const { orderDescription, orderAmount, outTradeNo } = params;
  
  console.log('[wxpay_order] 尝试调用 cloudbase_module 下单 (NATIVE)...');
  
  try {
    const res = await cloud.callFunction({
      name: 'cloudbase_module',
      data: {
        name: 'wxpay_native_order',
        data: {
          description: orderDescription,
          amount: { total: orderAmount, currency: 'CNY' },
          out_trade_no: outTradeNo
        }
      }
    });
    
    console.log('[wxpay_order] cloudbase_module NATIVE 返回:', JSON.stringify(res.result));
    
    if (!res.result) {
      return { code: -1, msg: '支付服务返回为空' };
    }
    
    // Native 支付返回 code_url
    if (res.result.code_url) {
      return {
        code: 0,
        data: {
          tradeType: TRADE_TYPES.NATIVE,
          codeUrl: res.result.code_url,
          outTradeNo
        }
      };
    } else if (res.result.code === 0 && res.result.data && res.result.data.code_url) {
      return {
        code: 0,
        data: {
          tradeType: TRADE_TYPES.NATIVE,
          codeUrl: res.result.data.code_url,
          outTradeNo
        }
      };
    } else if (res.result.errcode && res.result.errmsg) {
      return { 
        code: -1, 
        msg: res.result.errmsg || 'Native支付下单失败',
        errcode: res.result.errcode,
        data: res.result
      };
    }
    
    // cloudbase_module 可能不支持 native 支付
    return { 
      code: -1, 
      msg: 'cloudbase_module 可能不支持 Native 支付，请使用后端 API',
      data: res.result
    };
  } catch (error) {
    console.error('[wxpay_order] Native 支付调用失败:', error);
    // 如果 cloudbase_module 不支持，返回提示
    return { 
      code: -1, 
      msg: 'Native 支付需要通过后端服务实现，请调用后端 /api/payment/native 接口',
      error: error.message
    };
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { 
    packageType, 
    generationId, 
    userId, 
    description, 
    amount,
    tradeType = TRADE_TYPES.JSAPI,  // 默认小程序支付
    openid: customOpenid  // 允许外部传入 openid（用于 Web 端）
  } = event;
  
  // 打印环境信息用于调试
  console.log('[wxpay_order] 环境信息:', {
    ENV: wxContext.ENV,
    APPID: wxContext.APPID,
    OPENID: wxContext.OPENID,
    SOURCE: wxContext.SOURCE
  });
  
  console.log('[wxpay_order] 收到请求:', { 
    packageType, generationId, userId, tradeType,
    openid: wxContext.OPENID || customOpenid
  });
  
  const packageConfig = PACKAGES[packageType];
  if (!packageConfig && !amount) {
    return { code: -1, msg: '无效的套餐类型或未指定金额' };
  }
  
  const orderAmount = amount || packageConfig.amount;
  const orderDescription = description || packageConfig.description;
  const outTradeNo = generateOutTradeNo();
  const effectiveOpenid = wxContext.OPENID || customOpenid;
  
  console.log('[wxpay_order] 订单信息:', { outTradeNo, orderAmount, orderDescription, tradeType });
  
  // 根据支付类型调用不同的下单方法
  let paymentResult;
  try {
    if (tradeType === TRADE_TYPES.NATIVE) {
      // PC 扫码支付
      paymentResult = await createNativeOrder({
        orderDescription,
        orderAmount,
        outTradeNo
      });
    } else {
      // 小程序支付（默认）
      if (!effectiveOpenid) {
        return { code: -1, msg: 'JSAPI支付需要用户openid' };
      }
      paymentResult = await createJsapiOrder({
        orderDescription,
        orderAmount,
        outTradeNo,
        openid: effectiveOpenid
      });
    }
    
    if (paymentResult.code !== 0) {
      return paymentResult;
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
      openid: effectiveOpenid || null,
      amount: orderAmount,
      description: orderDescription,
      trade_type: tradeType,
      status: 'pending',
      created_at: new Date()
    });
    console.log('[wxpay_order] 订单已存储到数据库');
  } catch (dbError) {
    console.error('[wxpay_order] 数据库存储失败（不影响支付）:', dbError.message);
  }
  
  return { code: 0, msg: 'success', data: paymentResult.data };
};
