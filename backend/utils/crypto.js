/**
 * 加密签名工具模块
 * 用于火山引擎API签名等加密操作
 */

const crypto = require('crypto');

// 不参与加签过程的 header key
const HEADER_KEYS_TO_IGNORE = new Set([
  "authorization",
  "content-length",
  "user-agent",
  "presigned-expires",
  "expect",
]);

/**
 * 生成当前时间戳
 * @returns 格式化的日期时间字符串
 */
function getDateTimeNow() {
  const now = new Date();
  return now.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

/**
 * HMAC-SHA256签名
 * @param secret 密钥
 * @param s 待签名字符串
 * @returns 签名结果
 */
function hmac(secret, s) {
  return crypto.createHmac('sha256', secret).update(s).digest();
}

/**
 * SHA256哈希
 * @param s 待哈希字符串
 * @returns 哈希结果
 */
function hash(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

/**
 * URI转义
 * @param str 待转义字符串
 * @returns 转义后的字符串
 */
function uriEscape(str) {
  try {
    return encodeURIComponent(str)
      .replace(/[^A-Za-z0-9_.~\-%]+/g, (match) => {
        return match.split('').map(char => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`).join('');
      })
      .replace(/[*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
  } catch (e) {
    return '';
  }
}

/**
 * 查询参数转字符串 (按ASCII排序)
 * @param params 查询参数对象
 * @returns 格式化的查询参数字符串
 */
function queryParamsToString(params) {
  return Object.keys(params)
    .sort()
    .map((key) => {
      const val = params[key];
      if (typeof val === 'undefined' || val === null) {
        return `${uriEscape(key)}=`;
      }
      const escapedKey = uriEscape(key);
      if (!escapedKey) {
        return '';
      }
      if (Array.isArray(val)) {
        return `${escapedKey}=${val.map(uriEscape).sort().join(`&${escapedKey}=`)}`;
      }
      return `${escapedKey}=${uriEscape(val)}`;
    })
    .filter((v) => v)
    .join('&');
}

/**
 * 获取签名头
 * @param originHeaders 原始headers
 * @param needSignHeaders 需要签名的headers
 * @returns [签名头keys, 规范化headers]
 */
function getSignHeaders(originHeaders, needSignHeaders = []) {
  function trimHeaderValue(header) {
    return header.toString?.().trim().replace(/\s+/g, ' ') ?? '';
  }

  let h = Object.keys(originHeaders);
  if (Array.isArray(needSignHeaders)) {
    const needSignSet = new Set([...needSignHeaders, 'x-date', 'host'].map((k) => k.toLowerCase()));
    h = h.filter((k) => needSignSet.has(k.toLowerCase()));
  }
  h = h.filter((k) => !HEADER_KEYS_TO_IGNORE.has(k.toLowerCase()));
  const signedHeaderKeys = h
    .slice()
    .map((k) => k.toLowerCase())
    .sort()
    .join(';');
  const canonicalHeaders = h
    .sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1))
    .map((k) => `${k.toLowerCase()}:${trimHeaderValue(originHeaders[k])}`)
    .join('\n');
  return [signedHeaderKeys, canonicalHeaders];
}

/**
 * 火山引擎API签名函数
 * @param params 签名参数
 * @returns 签名字符串
 */
function sign(params) {
  const {
    headers = {},
    query = {},
    region = '',
    serviceName = '',
    method = '',
    pathName = '/',
    accessKeyId = '',
    secretAccessKey = '',
    needSignHeaderKeys = [],
    bodySha,
  } = params;
  
  const datetime = headers["X-Date"] || headers["x-date"];
  const date = datetime.substring(0, 8);
  
  const [signedHeaders, canonicalHeaders] = getSignHeaders(headers, needSignHeaderKeys);
  const canonicalRequest = [
    method.toUpperCase(),
    pathName,
    queryParamsToString(query) || '',
    `${canonicalHeaders}\n`,
    signedHeaders,
    bodySha || hash(''),
  ].join('\n');
  
  const credentialScope = [date, region, serviceName, "request"].join('/');
  const stringToSign = ["HMAC-SHA256", datetime, credentialScope, hash(canonicalRequest)].join('\n');
  
  const kDate = hmac(secretAccessKey, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, "request");
  const signature = hmac(kSigning, stringToSign);
  const signatureHex = signature.toString('hex');

  return [
    "HMAC-SHA256",
    `Credential=${accessKeyId}/${credentialScope},`,
    `SignedHeaders=${signedHeaders},`,
    `Signature=${signatureHex}`,
  ].join(' ');
}

module.exports = {
  getDateTimeNow,
  hmac,
  hash,
  uriEscape,
  queryParamsToString,
  getSignHeaders,
  sign,
  HEADER_KEYS_TO_IGNORE
};
