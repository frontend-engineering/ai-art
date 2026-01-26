/**
 * 微信支付 - 下单
 * 支持两种支付模式：
 * - JSAPI: 小程序支付（默认）
 * - NATIVE: PC 扫码支付
 */
const cloud = require('wx-server-sdk');
const { safeDb } = require('../db/mysql');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 微信支付 SDK（用于 Native 支付）
let WxPay = null;
let wechatPayment = null;

/**
 * 初始化微信支付 SDK（仅用于 Native 支付）
 */
function initWechatPaymentSDK() {
  if (wechatPayment) {
    return wechatPayment;
  }
  
  // 检查必要的配置
  const hasRequiredConfig = !!(
    process.env.WECHAT_APPID &&
    process.env.WECHAT_MCHID &&
    process.env.WECHAT_SERIAL_NO &&
    process.env.WECHAT_PRIVATE_KEY &&
    process.env.WECHAT_APIV3_KEY
  );
  
  if (!hasRequiredConfig) {
    console.warn('[wxpay_order] Native 支付配置未完整设置');
    return null;
  }
  
  try {
    if (!WxPay) {
      WxPay = require('wechatpay-node-v3');
    }
    
    // 处理私钥 - 处理换行符
    let privateKey = process.env.WECHAT_PRIVATE_KEY;
    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    wechatPayment = new WxPay({
      appid: process.env.WECHAT_APPID,
      mchid: process.env.WECHAT_MCHID,
      serial_no: process.env.WECHAT_SERIAL_NO,
      privateKey: privateKey,
      key: process.env.WECHAT_APIV3_KEY,
    });
    
    console.log('[wxpay_order] 微信支付 SDK 初始化成功');
    return wechatPayment;
  } catch (error) {
    console.error('[wxpay_order] 微信支付 SDK 初始化失败:', error.message);
    return null;
  }
}

// 降级方案 - 本地默认价格
const FALLBACK_PACKAGES = {
  basic: { name: '0.01元尝鲜包', amount: 1, description: 'AI全家福-尝鲜包' },
  premium: { name: '29.9元尊享包', amount: 2990, description: 'AI全家福-尊享包' }
};

// 价格缓存
let priceCache = null;
let priceCacheTime = 0;
const PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// API基础URL - 从环境变量获取
const API_BASE_URL = process.env.API_BASE_URL;

/**
 * 从API获取价格配置
 */
async function fetchPricesFromAPI() {
  // 如果未配置 API_BASE_URL，直接使用降级方案
  if (!API_BASE_URL) {
    console.warn('[wxpay_order] API_BASE_URL 未配置，使用降级价格方案');
    return FALLBACK_PACKAGES;
  }
  
  try {
    // 检查缓存
    const now = Date.now();
    if (priceCache && (now - priceCacheTime) < PRICE_CACHE_DURATION) {
      console.log('[wxpay_order] 使用缓存的价格配置');
      return priceCache;
    }

    console.log('[wxpay_order] 从API获取价格配置');
    
    const response = await axios.get(`${API_BASE_URL}/api/prices/current`, {
      timeout: 5000
    });

    if (response.data && response.data.success && response.data.data) {
      const apiPrices = response.data.data;
      
      // 转换API返回的价格格式
      const packages = {
        basic: {
          name: '0.01元尝鲜包',
          amount: Math.round((apiPrices.packages?.basic || 0.01) * 100),
          description: 'AI全家福-尝鲜包'
        },
        premium: {
          name: '29.9元尊享包',
          amount: Math.round((apiPrices.packages?.premium || 29.9) * 100),
          description: 'AI全家福-尊享包'
        }
      };

      // 更新缓存
      priceCache = packages;
      priceCacheTime = now;
      
      console.log('[wxpay_order] 价格配置获取成功', packages);
      return packages;
    }

    throw new Error('API返回数据格式错误');
  } catch (error) {
    console.warn('[wxpay_order] 从API获取价格失败，使用降级方案', error.message);
    return FALLBACK_PACKAGES;
  }
}

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
 * 尝试通过 cloudbase_module 调用，如果不支持则使用直接调用方式
 * 
 * @param {Object} params - 支付参数
 * @param {string} params.orderDescription - 订单描述
 * @param {number} params.orderAmount - 订单金额（分）
 * @param {string} params.outTradeNo - 商户订单号
 * @param {string} params.packageType - 套餐类型（用于日志）
 * @param {string} params.userId - 用户ID（用于日志）
 * @param {string} params.generationId - 生成任务ID（用于日志）
 */
async function createNativeOrder(params) {
  const { orderDescription, orderAmount, outTradeNo } = params;
  
  console.log('[wxpay_order] 创建 Native 支付订单...');
  
  // 方案 1: 尝试通过 cloudbase_module 调用（优先，复用已有配置）
  try {
    console.log('[wxpay_order] 尝试通过 cloudbase_module 调用 Native 支付...');
    
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
    
    console.log('[wxpay_order] cloudbase_module Native 返回:', JSON.stringify(res.result));
    
    // 检查返回结果
    if (res.result && res.result.code_url) {
      return {
        code: 0,
        data: {
          tradeType: TRADE_TYPES.NATIVE,
          codeUrl: res.result.code_url,
          outTradeNo
        }
      };
    } else if (res.result && res.result.code === 0 && res.result.data && res.result.data.code_url) {
      return {
        code: 0,
        data: {
          tradeType: TRADE_TYPES.NATIVE,
          codeUrl: res.result.data.code_url,
          outTradeNo
        }
      };
    }
    
    // cloudbase_module 不支持或返回错误
    console.warn('[wxpay_order] cloudbase_module 不支持 Native 支付或返回错误:', res.result);
  } catch (cloudbaseError) {
    console.warn('[wxpay_order] cloudbase_module 调用失败:', cloudbaseError.message);
  }
  
  // 方案 2: 使用直接调用方式（需要配置环境变量）
  try {
    console.log('[wxpay_order] 尝试直接调用微信支付 API...');
    
    const payment = initWechatPaymentSDK();
    
    if (!payment) {
      return { 
        code: -1, 
        msg: 'Native 支付不可用。cloudbase_module 不支持，且未配置直接调用所需的环境变量。\n' +
             '请在云函数环境变量中配置: WECHAT_APPID, WECHAT_MCHID, WECHAT_SERIAL_NO, WECHAT_PRIVATE_KEY, WECHAT_APIV3_KEY\n' +
             '（可复用扩展能力中已配置的相同值）'
      };
    }
    
    const paymentParams = {
      description: orderDescription,
      out_trade_no: outTradeNo,
      notify_url: process.env.WECHAT_NOTIFY_URL || (API_BASE_URL ? `${API_BASE_URL}/api/payment/callback` : undefined),
      amount: { 
        total: orderAmount, 
        currency: 'CNY' 
      }
    };
    
    // 检查回调地址
    if (!paymentParams.notify_url) {
      console.warn('[wxpay_order] 未配置回调地址，支付成功后无法自动更新订单状态');
    }
    
    console.log('[wxpay_order] 调用微信支付 Native API');
    
    const result = await payment.transactions_native(paymentParams);
    
    console.log('[wxpay_order] 微信支付 Native 返回成功');
    
    if (result && result.code_url) {
      return {
        code: 0,
        data: {
          tradeType: TRADE_TYPES.NATIVE,
          codeUrl: result.code_url,
          outTradeNo: outTradeNo
        }
      };
    } else {
      return { 
        code: -1, 
        msg: '微信支付返回格式异常',
        data: result
      };
    }
  } catch (error) {
    console.error('[wxpay_order] Native 支付调用失败:', error);
    return { 
      code: -1, 
      msg: error.message || 'Native 支付调用失败',
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
  
  // 从API获取价格配置（带降级方案）
  const PACKAGES = await fetchPricesFromAPI();
  
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
        outTradeNo,
        packageType,
        userId,
        generationId
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
