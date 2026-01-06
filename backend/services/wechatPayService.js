/**
 * 微信支付服务模块
 * 处理微信支付相关功能
 */

const { Payment } = require('wechatpay-node-v3');

let wechatPayment = null;

/**
 * 初始化微信支付实例
 */
function initWechatPayment() {
  if (wechatPayment) {
    return wechatPayment;
  }
  
  if (process.env.WECHAT_MCHID && process.env.WECHAT_SERIAL_NO && 
      process.env.WECHAT_PRIVATE_KEY && process.env.WECHAT_APIV3_KEY) {
    try {
      wechatPayment = new Payment({
        appid: process.env.WECHAT_APPID,
        mchid: process.env.WECHAT_MCHID,
        serial_no: process.env.WECHAT_SERIAL_NO,
        privateKey: process.env.WECHAT_PRIVATE_KEY,
        apiv3_private_key: process.env.WECHAT_APIV3_KEY,
      });
      console.log('微信支付SDK初始化成功');
    } catch (error) {
      console.error('微信支付SDK初始化失败:', error);
    }
  } else {
    console.warn('微信支付配置未完整设置，支付功能将不可用');
  }
  
  return wechatPayment;
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
 * 发起JSAPI支付
 * @param params 支付参数
 */
async function createJsapiPayment(params) {
  const payment = getWechatPayment();
  if (!payment) {
    throw new Error('微信支付服务不可用');
  }
  return payment.transactions_jsapi(params);
}

/**
 * 验证回调签名
 * @param signParams 签名参数
 */
async function verifyCallbackSign(signParams) {
  const payment = getWechatPayment();
  if (!payment) {
    throw new Error('微信支付服务不可用');
  }
  return payment.verifySign(signParams);
}

/**
 * 解密回调数据
 * @param ciphertext 密文
 * @param associatedData 附加数据
 * @param nonce 随机串
 */
function decipherCallback(ciphertext, associatedData, nonce) {
  const payment = getWechatPayment();
  if (!payment) {
    throw new Error('微信支付服务不可用');
  }
  return payment.decipher_gcm(ciphertext, associatedData, nonce);
}

module.exports = {
  initWechatPayment,
  getWechatPayment,
  isWechatPaymentAvailable,
  createJsapiPayment,
  verifyCallbackSign,
  decipherCallback
};
