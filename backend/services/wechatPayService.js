/**
 * 微信支付服务模块
 * 处理微信支付相关功能
 * 
 * 使用 wechatpay-node-v3 SDK
 * 文档: https://github.com/klover2/wechatpay-node-v3
 */

const fs = require('fs');
const path = require('path');

let wechatPayment = null;

/**
 * 初始化微信支付实例
 */
function initWechatPayment() {
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
    console.warn('微信支付配置未完整设置，支付功能将不可用');
    console.warn('需要配置: WECHAT_APPID, WECHAT_MCHID, WECHAT_SERIAL_NO, WECHAT_PRIVATE_KEY, WECHAT_APIV3_KEY');
    return null;
  }
  
  try {
    // wechatpay-node-v3 使用默认导出
    const WxPay = require('wechatpay-node-v3');
    
    // 处理私钥 - 可能是文件路径或直接的密钥内容
    let privateKey = process.env.WECHAT_PRIVATE_KEY;
    
    // 如果是文件路径，读取文件内容
    if (privateKey && !privateKey.includes('-----BEGIN')) {
      const keyPath = path.resolve(privateKey);
      if (fs.existsSync(keyPath)) {
        privateKey = fs.readFileSync(keyPath, 'utf8');
      }
    }
    
    // 处理换行符（环境变量中的 \n 需要转换）
    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    wechatPayment = new WxPay({
      appid: process.env.WECHAT_APPID,
      mchid: process.env.WECHAT_MCHID,
      serial_no: process.env.WECHAT_SERIAL_NO,
      privateKey: privateKey,
      key: process.env.WECHAT_APIV3_KEY, // APIv3 密钥，用于解密回调
    });
    
    console.log('微信支付SDK初始化成功');
    return wechatPayment;
  } catch (error) {
    console.error('微信支付SDK初始化失败:', error.message);
    return null;
  }
}

/**
 * 获取微信支付实例
 */
function getWechatPayment() {
  return wechatPayment || initWechatPayment();
}

/**
 * 检查微信支付是否可用
 */
function isWechatPaymentAvailable() {
  return !!getWechatPayment();
}

/**
 * 发起JSAPI支付（小程序支付）
 * @param {Object} params 支付参数
 * @param {string} params.description 商品描述
 * @param {string} params.out_trade_no 商户订单号
 * @param {string} params.notify_url 回调地址
 * @param {Object} params.amount 金额信息
 * @param {number} params.amount.total 总金额（分）
 * @param {Object} params.payer 支付者信息
 * @param {string} params.payer.openid 用户openid
 */
async function createJsapiPayment(params) {
  const payment = getWechatPayment();
  if (!payment) {
    throw new Error('微信支付服务不可用，请检查配置');
  }
  
  try {
    const result = await payment.transactions_jsapi(params);
    return result;
  } catch (error) {
    console.error('JSAPI支付创建失败:', error);
    throw error;
  }
}

/**
 * 发起Native支付（PC扫码支付）
 * @param {Object} params 支付参数
 * @param {string} params.description 商品描述
 * @param {string} params.out_trade_no 商户订单号
 * @param {string} params.notify_url 回调地址
 * @param {Object} params.amount 金额信息
 * @param {number} params.amount.total 总金额（分）
 * @returns {Promise<{code_url: string}>} 返回二维码链接
 */
async function createNativePayment(params) {
  const payment = getWechatPayment();
  if (!payment) {
    throw new Error('微信支付服务不可用，请检查配置');
  }
  
  try {
    const result = await payment.transactions_native(params);
    return result;
  } catch (error) {
    console.error('Native支付创建失败:', error);
    throw error;
  }
}

/**
 * 查询订单
 * @param {Object} params 查询参数
 */
async function queryOrder(params) {
  const payment = getWechatPayment();
  if (!payment) {
    throw new Error('微信支付服务不可用');
  }
  
  try {
    const result = await payment.query(params);
    return result;
  } catch (error) {
    console.error('查询订单失败:', error);
    throw error;
  }
}

/**
 * 关闭订单
 * @param {string} out_trade_no 商户订单号
 */
async function closeOrder(out_trade_no) {
  const payment = getWechatPayment();
  if (!payment) {
    throw new Error('微信支付服务不可用');
  }
  
  try {
    const result = await payment.close(out_trade_no);
    return result;
  } catch (error) {
    console.error('关闭订单失败:', error);
    throw error;
  }
}

/**
 * 申请退款
 * @param {Object} params 退款参数
 */
async function refunds(params) {
  const payment = getWechatPayment();
  if (!payment) {
    throw new Error('微信支付服务不可用');
  }
  
  try {
    const result = await payment.refunds(params);
    return result;
  } catch (error) {
    console.error('申请退款失败:', error);
    throw error;
  }
}

/**
 * 查询退款
 * @param {string} out_refund_no 商户退款单号
 */
async function findRefunds(out_refund_no) {
  const payment = getWechatPayment();
  if (!payment) {
    throw new Error('微信支付服务不可用');
  }
  
  try {
    const result = await payment.find_refunds(out_refund_no);
    return result;
  } catch (error) {
    console.error('查询退款失败:', error);
    throw error;
  }
}

/**
 * 验证回调签名
 * @param {Object} signParams 签名参数
 */
async function verifyCallbackSign(signParams) {
  const payment = getWechatPayment();
  if (!payment) {
    throw new Error('微信支付服务不可用');
  }
  
  try {
    return payment.verifySign(signParams);
  } catch (error) {
    console.error('验证签名失败:', error);
    return false;
  }
}

/**
 * 解密回调数据
 * @param {string} ciphertext 密文
 * @param {string} associatedData 附加数据
 * @param {string} nonce 随机串
 */
function decipherCallback(ciphertext, associatedData, nonce) {
  const payment = getWechatPayment();
  if (!payment) {
    throw new Error('微信支付服务不可用');
  }
  
  try {
    return payment.decipher_gcm(ciphertext, associatedData, nonce);
  } catch (error) {
    console.error('解密回调数据失败:', error);
    throw error;
  }
}

module.exports = {
  initWechatPayment,
  getWechatPayment,
  isWechatPaymentAvailable,
  createJsapiPayment,
  createNativePayment,
  queryOrder,
  closeOrder,
  refunds,
  findRefunds,
  verifyCallbackSign,
  decipherCallback
};
