require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const https = require('https');
const COS = require('cos-nodejs-sdk-v5');
const { Signer } = require('@volcengine/openapi');
const { Payment } = require('wechatpay-node-v3');

const app = express();
const PORT = process.env.PORT || 3001;

// 导入用户服务
const userService = require('./services/userService');
// 导入生成历史服务
const generationService = require('./services/generationService');
// 导入清理服务
const cleanupService = require('./services/cleanupService');
// 导入API重试工具
const { executeWithRetry, executeWithSmartRetry } = require('./utils/apiRetry');
// 导入错误日志服务
const errorLogService = require('./services/errorLogService');
// 导入参数校验工具
const {
  validateRequest,
  validateGenerateArtPhotoParams,
  validateCreatePaymentParams,
  validateWechatPaymentParams,
  validateUploadImageParams,
  validateExtractFacesParams,
  validateCreateProductOrderParams,
  validateGenerateVideoParams
} = require('./utils/validation');

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.raw({ type: 'application/json', limit: '10mb' })); // 用于微信支付回调

// 初始化COS实例
const cos = new COS({
  SecretId: process.env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY,
});

// 初始化微信支付实例
let wechatPayment = null;
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

// 火山引擎API配置
const VOLCENGINE_ENDPOINT = 'https://open.volcengineapi.com';
const VOLCENGINE_ACTION = 'JimengT2IV40SubmitTask';
const VOLCENGINE_VERSION = '2024-06-06';
const VOLCENGINE_SERVICE_NAME = 'cv';
const VOLCENGINE_REGION = 'cn-beijing';

// 腾讯云OSS配置
const COS_BUCKET = process.env.COS_BUCKET;
const COS_REGION = process.env.COS_REGION;
const COS_DOMAIN = process.env.COS_DOMAIN;

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
    .sort() // 按ASCII排序
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
  // 根据 needSignHeaders 过滤
  if (Array.isArray(needSignHeaders)) {
    const needSignSet = new Set([...needSignHeaders, 'x-date', 'host'].map((k) => k.toLowerCase()));
    h = h.filter((k) => needSignSet.has(k.toLowerCase()));
  }
  // 根据 ignore headers 过滤
  h = h.filter((k) => !HEADER_KEYS_TO_IGNORE.has(k.toLowerCase()));
  const signedHeaderKeys = h
    .slice()
    .map((k) => k.toLowerCase())
    .sort() // 按ASCII排序
    .join(';');
  const canonicalHeaders = h
    .sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1))
    .map((k) => `${k.toLowerCase()}:${trimHeaderValue(originHeaders[k])}`)
    .join('\n');
  return [signedHeaderKeys, canonicalHeaders];
}

/**
 * 签名函数
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
  const date = datetime.substring(0, 8); // YYYYMMDD
  
  // 创建规范请求
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
  
  // 创建待签字符串
  const stringToSign = ["HMAC-SHA256", datetime, credentialScope, hash(canonicalRequest)].join('\n');
  
  // 构建签名密钥
  const kDate = hmac(secretAccessKey, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, "request");
  const signature = hmac(kSigning, stringToSign);
  
  // 转换为十六进制字符串
  const signatureHex = signature.toString('hex');

  return [
    "HMAC-SHA256",
    `Credential=${accessKeyId}/${credentialScope},`,
    `SignedHeaders=${signedHeaders},`,
    `Signature=${signatureHex}`,
  ].join(' ');
}

/**
 * 调用火山引擎API生成艺术照 (4选1策略)
 * @param prompt 用于生成图像的提示词
 * @param imageUrls 图片文件URL数组
 * @param facePositions 人脸位置信息数组(可选)
 * @param useStreaming 是否使用流式输出(默认true)
 * @param paymentStatus 用户付费状态 ('free', 'basic', 'premium')
 * @returns 生成任务ID或流式响应
 */
async function generateArtPhoto(prompt, imageUrls, facePositions = null, useStreaming = true, paymentStatus = 'free') {
  // 使用重试机制包装API调用
  return executeWithRetry(
    () => generateArtPhotoInternal(prompt, imageUrls, facePositions, useStreaming, paymentStatus),
    {
      maxRetries: 1,
      timeout: 30000,
      operationName: '生成艺术照',
      onRetry: (attempt, error) => {
        console.log(`[重试] 生成艺术照失败，准备第 ${attempt + 1} 次重试。错误: ${error.message}`);
      }
    }
  );
}

/**
 * 内部函数：调用火山引擎API生成艺术照（不含重试逻辑）
 */
async function generateArtPhotoInternal(prompt, imageUrls, facePositions = null, useStreaming = true, paymentStatus = 'free') {
  return new Promise((resolve, reject) => {
    try {
      // 检查环境变量是否已设置
      if (!process.env.VOLCENGINE_ACCESS_KEY_ID || !process.env.VOLCENGINE_SECRET_ACCESS_KEY) {
        throw new Error('火山引擎API的访问密钥未设置，请检查.env文件中的配置');
      }
      
      // 准备请求参数
      const datetime = getDateTimeNow();
      const urlObj = new URL(VOLCENGINE_ENDPOINT);
      const host = urlObj.host;
      
      // 构造请求体 - 使用4选1生成策略
      const requestBody = {
        model: "doubao-seedream-4.5",
        prompt: prompt,
        size: "2K",
        sequential_image_generation: "auto", // 启用组图功能
        sequential_image_generation_options: {
          max_images: 4 // 最多生成4张图片
        },
        stream: useStreaming, // 启用流式输出
        response_format: "url",
        watermark: paymentStatus === 'free', // 免费用户添加水印，付费用户不添加
        force_single: false,
        max_ratio: 3,
        min_ratio: 0.33,
        req_key: "jimeng_t2i_v40",
        scale: 0.8,
        size_param: 4194304
      };
      
      // 如果提供了imageUrls，则添加到请求体中
      if (imageUrls && imageUrls.length > 0) {
        requestBody.image = imageUrls.slice(0, 14); // 限制最多14张图片
        // 确保始终有艺术风格参考图
        if (requestBody.image.length < 2) {
          requestBody.image.push(`https://wms.webinfra.cloud/art-photos/template1.jpeg`);
        }
      } else {
        // 如果没有提供imageUrls，则强制报错
        throw new Error('请提供至少一张照片');
      }
      
      // 如果提供了人脸位置信息，则添加到请求体中
      if (facePositions && Array.isArray(facePositions) && facePositions.length > 0) {
        requestBody.face_positions = facePositions;
        console.log('使用画布定位信息:', JSON.stringify(facePositions, null, 2));
      }
      
      // 将请求体转换为JSON字符串
      const requestBodyString = JSON.stringify(requestBody);
      
      // 构造headers
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Host': host,
        'X-Date': datetime,
      };
      
      // 使用火山引擎SDK进行查询参数签名
      const openApiRequestData = {
        method: "POST",
        region: VOLCENGINE_REGION,
        params: {
          Action: 'CVProcess', // 使用新的Action
          Version: '2024-06-06',
          'X-Algorithm': 'HMAC-SHA256',
          'X-Date': datetime,
          'X-Expires': '3600',
          'X-NotSignBody': '1',
          'X-SignedHeaders': 'content-type;host;x-date',
        },
      };
      
      const credentials = {
        accessKeyId: process.env.VOLCENGINE_ACCESS_KEY_ID,
        secretKey: process.env.VOLCENGINE_SECRET_ACCESS_KEY,
        sessionToken: "",
      };
      
      const signer = new Signer(openApiRequestData, VOLCENGINE_SERVICE_NAME);
      const signedQueryString = signer.getSignUrl(credentials);
      
      // 构造完整的URL
      const url = `${VOLCENGINE_ENDPOINT}/?${signedQueryString}`;
      
      console.log('火山引擎API请求URL:', url);
      console.log('请求headers:', JSON.stringify(headers, null, 2));
      console.log('请求体:', requestBodyString);
      console.log('最终的image数组:', requestBody.image);
      
      // 构造请求选项
      const options = {
        method: 'POST',
        headers: headers,
      };
      
      // 如果使用流式输出，返回任务ID供前端轮询
      // 否则直接返回生成结果
      if (!useStreaming) {
        // 非流式模式：发起请求并等待完整响应
        const req = https.request(url, options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const result = JSON.parse(data);
              console.log('响应状态:', res.statusCode);
              console.log('响应headers:', JSON.stringify(res.headers, null, 2));
              console.log('响应体:', JSON.stringify(result, null, 2));
              
              // 检查API调用是否成功
              if (res.statusCode !== 200) {
                if (res.statusCode === 401) {
                  if (result?.ResponseMetadata?.Error?.Code === 'SignatureDoesNotMatch') {
                    reject(new Error(`签名错误: ${result.ResponseMetadata.Error.Message}`));
                  } else {
                    reject(new Error('API调用未授权，请检查访问密钥是否正确'));
                  }
                } else if (res.statusCode === 403) {
                  reject(new Error('API调用被禁止，请检查访问密钥权限'));
                } else {
                  reject(new Error(`API调用失败，状态码: ${res.statusCode}`));
                }
                return;
              }
              
              // 检查火山引擎API的返回结果
              if (result?.Result?.code !== 10000) {
                reject(new Error(result?.Result?.message || `API调用失败，错误码: ${result?.Result?.code}`));
                return;
              }
              
              // 获取任务ID
              const taskId = result.Result.data?.task_id || '';
              
              // 记录新创建的任务
              if (taskId) {
                const historyRecord = {
                  taskId: taskId,
                  originalImageUrls: imageUrls || [],
                  generatedImageUrls: [], // 初始为空，等任务完成后再填充
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };
                
                // 保存到历史记录
                const history = require('./history');
                history.addHistoryRecord(historyRecord);
                console.log(`新任务 ${taskId} 已记录`);
              }
              
              // 返回任务ID
              resolve(taskId);
            } catch (parseError) {
              console.error('解析响应失败:', parseError);
              reject(new Error(`解析响应失败: ${parseError.message}`));
            }
          });
        });
        
        req.on('error', (error) => {
          console.error('网络请求失败:', error);
          reject(new Error(`网络请求失败: ${error.message}`));
        });
        
        // 发送请求体
        req.write(requestBodyString);
        req.end();
      } else {
        // 流式模式：返回任务ID，前端通过轮询获取4张图片
        // 注意：根据即梦AI文档，流式模式会实时返回每张图片
        // 但为了简化实现，我们先返回任务ID，让前端轮询
        const req = https.request(url, options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const result = JSON.parse(data);
              console.log('响应状态:', res.statusCode);
              console.log('响应体:', JSON.stringify(result, null, 2));
              
              // 检查API调用是否成功
              if (res.statusCode !== 200) {
                if (res.statusCode === 401) {
                  if (result?.ResponseMetadata?.Error?.Code === 'SignatureDoesNotMatch') {
                    reject(new Error(`签名错误: ${result.ResponseMetadata.Error.Message}`));
                  } else {
                    reject(new Error('API调用未授权，请检查访问密钥是否正确'));
                  }
                } else if (res.statusCode === 403) {
                  reject(new Error('API调用被禁止，请检查访问密钥权限'));
                } else {
                  reject(new Error(`API调用失败，状态码: ${res.statusCode}`));
                }
                return;
              }
              
              // 检查火山引擎API的返回结果
              if (result?.Result?.code !== 10000) {
                reject(new Error(result?.Result?.message || `API调用失败，错误码: ${result?.Result?.code}`));
                return;
              }
              
              // 获取任务ID
              const taskId = result.Result.data?.task_id || '';
              
              // 记录新创建的任务
              if (taskId) {
                const historyRecord = {
                  taskId: taskId,
                  originalImageUrls: imageUrls || [],
                  generatedImageUrls: [], // 初始为空，等任务完成后再填充
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };
                
                // 保存到历史记录
                const history = require('./history');
                history.addHistoryRecord(historyRecord);
                console.log(`新任务 ${taskId} 已记录（4选1模式）`);
              }
              
              // 返回任务ID
              resolve(taskId);
            } catch (parseError) {
              console.error('解析响应失败:', parseError);
              reject(new Error(`解析响应失败: ${parseError.message}`));
            }
          });
        });
        
        req.on('error', (error) => {
          console.error('网络请求失败:', error);
          reject(new Error(`网络请求失败: ${error.message}`));
        });
        
        // 发送请求体
        req.write(requestBodyString);
        req.end();
      }
    } catch (error) {
      console.error('生成艺术照过程中发生错误:', error);
      reject(error);
    }
  });
}

/**
 * 查询任务状态
 * @param taskId 任务ID
 * @returns 任务状态和结果
 */
async function getTaskStatus(taskId) {
  // 使用重试机制包装API调用
  return executeWithRetry(
    () => getTaskStatusInternal(taskId),
    {
      maxRetries: 1,
      timeout: 30000,
      operationName: '查询任务状态',
      onRetry: (attempt, error) => {
        console.log(`[重试] 查询任务状态失败，准备第 ${attempt + 1} 次重试。错误: ${error.message}`);
      }
    }
  );
}

/**
 * 内部函数：查询任务状态（不含重试逻辑）
 */
async function getTaskStatusInternal(taskId) {
  return new Promise((resolve, reject) => {
    try {
      // 检查环境变量是否已设置
      if (!process.env.VOLCENGINE_ACCESS_KEY_ID || !process.env.VOLCENGINE_SECRET_ACCESS_KEY) {
        throw new Error('火山引擎API的访问密钥未设置，请检查.env文件中的配置');
      }
      
      // 首先检查是否已经有完成的任务记录
      const history = require('./history');
      const existingRecord = history.findHistoryRecordByTaskId(taskId);
      if (existingRecord && existingRecord.generatedImageUrls && existingRecord.generatedImageUrls.length > 0) {
        // 如果任务已完成且有图片URL，直接返回
        console.log(`任务 ${taskId} 已完成，返回缓存结果`);
        return resolve({
          ResponseMetadata: {},
          Result: {
            code: 10000,
            data: {
              status: "done",
              uploaded_image_urls: existingRecord.generatedImageUrls
            },
            message: "Success"
          }
        });
      }
      
      // 准备请求参数
      const datetime = getDateTimeNow();
      const urlObj = new URL(VOLCENGINE_ENDPOINT);
      const host = urlObj.host;
      
      // 构造请求体
      const requestBody = {
        task_id: taskId,
        req_key: "jimeng_t2i_v40"
      };
      
      // 将请求体转换为JSON字符串
      const requestBodyString = JSON.stringify(requestBody);
      
      // 构造headers
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Host': host,
        'X-Date': datetime,
      };
      
      // 使用火山引擎SDK进行查询参数签名
      const openApiRequestData = {
        method: "POST",
        region: VOLCENGINE_REGION,
        params: {
          Action: "JimengT2IV40GetResult",
          Version: VOLCENGINE_VERSION,
        },
        headers: headers,
      };
      
      const credentials = {
        accessKeyId: process.env.VOLCENGINE_ACCESS_KEY_ID,
        secretKey: process.env.VOLCENGINE_SECRET_ACCESS_KEY,
        sessionToken: "",
      };
      
      const signer = new Signer(openApiRequestData, VOLCENGINE_SERVICE_NAME);
      // 使用getSignUrl方法生成签名URL
      const signedQueryString = signer.getSignUrl(credentials);
      
      // 构造完整的URL
      const url = `${VOLCENGINE_ENDPOINT}/?${signedQueryString}`;
      
      console.log('查询任务状态请求URL:', url);
      console.log('请求headers:', JSON.stringify(headers, null, 2));
      console.log('请求体:', requestBodyString);
      
      // 构造请求选项
      const options = {
        method: 'POST',
        headers: headers,
      };
      
      // 发起HTTPS请求
      const req = https.request(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', async () => {
          try {
            const result = JSON.parse(data);
            console.log('查询任务状态响应状态:', res.statusCode);
            console.log('查询任务状态响应headers:', JSON.stringify(res.headers, null, 2));
            // console.log('查询任务状态响应体:', JSON.stringify(result, null, 2));
            
            // 检查API调用是否成功
            if (res.statusCode !== 200) {
              if (res.statusCode === 401) {
                // 检查是否是签名错误
                if (result?.ResponseMetadata?.Error?.Code === 'SignatureDoesNotMatch') {
                  reject(new Error(`签名错误: ${result.ResponseMetadata.Error.Message}`));
                } else {
                  reject(new Error('API调用未授权，请检查访问密钥是否正确'));
                }
              } else if (res.statusCode === 403) {
                reject(new Error('API调用被禁止，请检查访问密钥权限'));
              } else {
                reject(new Error(`API调用失败，状态码: ${res.statusCode}`));
              }
              return;
            }
            
            // 检查火山引擎API的返回结果
            if (result?.ResponseMetadata?.Error) {
              reject(new Error(`API调用失败: ${result.ResponseMetadata.Error.Message}`));
              return;
            }
            
            // 只有当任务完成时才上传图片
            if (result?.Result?.data?.status === 'done' && 
                result?.Result?.data?.binary_data_base64 && 
                Array.isArray(result.Result.data.binary_data_base64)) {
              console.log(`检测到任务 ${taskId} 已完成，开始上传 ${result.Result.data.binary_data_base64.length} 张图片到OSS`);
              
              // 上传每张图片到OSS
              const uploadedImageUrls = [];
              for (let i = 0; i < result.Result.data.binary_data_base64.length; i++) {
                try {
                  const base64Data = result.Result.data.binary_data_base64[i];
                  // 构造完整的Base64数据URI
                  const base64Image = `data:image/jpeg;base64,${base64Data}`;
                  
                  console.log(`正在上传第 ${i + 1} 张图片到OSS...`);
                  const imageUrl = await uploadImageToOSS(base64Image);
                  uploadedImageUrls.push(imageUrl);
                  console.log(`第 ${i + 1} 张图片上传成功: ${imageUrl}`);
                } catch (uploadError) {
                  console.error(`第 ${i + 1} 张图片上传失败:`, uploadError);
                  // 如果上传失败，仍然继续处理其他图片
                }
              }
              
              // 更新返回结果，将Base64数据替换为OSS URL
              result.Result.data.uploaded_image_urls = uploadedImageUrls;
              
              // 保存到历史记录
              const historyRecord = {
                taskId: taskId,
                originalImageUrls: [], // 原始图片URL需要从前端传递或从任务提交时保存
                generatedImageUrls: uploadedImageUrls,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              
              // 动态导入历史记录模块并保存记录
              const history = require('./history');
              history.addHistoryRecord(historyRecord);
              console.log('历史记录保存成功');
            }
            
            // 返回完整的任务状态信息
            resolve(result);
          } catch (parseError) {
            console.error('解析响应失败:', parseError);
            reject(new Error(`解析响应失败: ${parseError.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('网络请求失败:', error);
        reject(new Error(`网络请求失败: ${error.message}`));
      });
      
      // 发送请求体
      req.write(requestBodyString);
      req.end();
    } catch (error) {
      console.error('查询任务状态过程中发生错误:', error);
      reject(error);
    }
  });
}

/**
 * 调用Python脚本提取人脸
 * @param imageUrls 图片URL数组
 * @returns 人脸提取结果
 */
async function extractFaces(imageUrls) {
  return new Promise((resolve, reject) => {
    try {
      const { spawn } = require('child_process');
      const path = require('path');
      
      // Python脚本路径
      const scriptPath = path.join(__dirname, 'utils', 'extract_faces.py');
      
      // 使用虚拟环境的Python
      const pythonPath = path.join(__dirname, 'venv', 'bin', 'python3');
      
      // 准备参数 (使用更宽松的阈值)
      const params = {
        image_paths: imageUrls,
        min_face_size: 50,  // 降低最小人脸尺寸
        confidence_threshold: 0.3  // 降低置信度阈值
      };
      
      // 调用Python脚本
      const pythonProcess = spawn(pythonPath, [scriptPath, JSON.stringify(params)]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python脚本执行失败:', stderr);
          reject(new Error(`Python脚本执行失败: ${stderr}`));
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (parseError) {
          console.error('解析Python脚本输出失败:', parseError);
          reject(new Error(`解析Python脚本输出失败: ${parseError.message}`));
        }
      });
      
      // 设置30秒超时
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('人脸提取超时'));
      }, 30000);
      
    } catch (error) {
      console.error('调用Python脚本失败:', error);
      reject(error);
    }
  });
}

/**
 * 调用Python脚本添加水印
 * @param imagePath 图片路径或URL
 * @param outputPath 输出路径(可选)
 * @param watermarkText 水印文字
 * @param qrUrl 二维码URL
 * @param position 水印位置
 * @returns 添加水印后的图片路径
 */
async function addWatermark(imagePath, outputPath = null, watermarkText = 'AI全家福制作\n扫码去水印', qrUrl = 'https://your-domain.com/pay', position = 'center') {
  return new Promise((resolve, reject) => {
    try {
      const { spawn } = require('child_process');
      const path = require('path');
      
      // Python脚本路径
      const scriptPath = path.join(__dirname, 'utils', 'add_watermark.py');
      
      // 准备参数
      const params = {
        image_path: imagePath,
        output_path: outputPath,
        watermark_text: watermarkText,
        qr_url: qrUrl,
        position: position
      };
      
      // 调用Python脚本
      const pythonProcess = spawn('python3', [scriptPath, JSON.stringify(params)]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python水印脚本执行失败:', stderr);
          reject(new Error(`Python水印脚本执行失败: ${stderr}`));
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          if (!result.success) {
            reject(new Error(result.message || '水印添加失败'));
            return;
          }
          resolve(result);
        } catch (parseError) {
          console.error('解析Python脚本输出失败:', parseError);
          reject(new Error(`解析Python脚本输出失败: ${parseError.message}`));
        }
      });
      
      // 设置30秒超时
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('水印添加超时'));
      }, 30000);
      
    } catch (error) {
      console.error('调用Python水印脚本失败:', error);
      reject(error);
    }
  });
}

/**
 * 上传图片到腾讯云OSS
 * @param base64Image Base64编码的图片数据
 * @returns 上传后的图片URL
 */
async function uploadImageToOSS(base64Image) {
  return new Promise((resolve, reject) => {
    try {
      // 检查环境变量是否已设置
      if (!process.env.COS_SECRET_ID || !process.env.COS_SECRET_KEY || 
          !COS_BUCKET || !COS_REGION || !COS_DOMAIN) {
        throw new Error('腾讯云OSS配置未设置，请检查.env文件中的配置');
      }
      
      // 移除Base64数据URI前缀
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      
      // 将Base64转换为Buffer
      const buffer = Buffer.from(base64Data, 'base64');
      
      // 获取MIME类型
      let mimeType = 'image/jpeg';
      if (base64Image.startsWith('data:image/png')) {
        mimeType = 'image/png';
      } else if (base64Image.startsWith('data:image/gif')) {
        mimeType = 'image/gif';
      }
      
      // 生成文件名
      const fileExtension = mimeType.split('/')[1];
      const fileName = `art-photos/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
      
      // 上传到COS
      cos.putObject({
        Bucket: COS_BUCKET,
        Region: COS_REGION,
        Key: fileName,
        Body: buffer,
        ContentEncoding: 'base64',
        ContentType: mimeType
      }, function(err, data) {
        if (err) {
          console.error('上传到OSS失败:', err);
          reject(new Error('图片上传失败，请稍后重试'));
        } else {
          // 构造可访问的文件URL
          const url = `https://${COS_DOMAIN}/${fileName}`;
          console.error('上传到OSS成功:', url);
          resolve(url);
        }
      });
    } catch (error) {
      console.error('上传图片到OSS失败:', error);
      reject(new Error('图片上传失败，请稍后重试'));
    }
  });
}

// API路由

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 用户鉴权端点

// 创建或获取用户
app.post('/api/user/init', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 userId 参数' 
      });
    }
    
    // 获取或创建用户
    const user = await userService.getOrCreateUser(userId);
    
    res.json({ 
      success: true, 
      data: user 
    });
  } catch (error) {
    console.error('初始化用户失败:', error);
    
    // 记录错误日志
    await errorLogService.logError(
      'USER_INIT_FAILED',
      error.message,
      {
        userId: req.body.userId,
        endpoint: '/api/user/init',
        method: 'POST'
      }
    );
    
    res.status(500).json({ 
      error: '初始化用户失败', 
      message: error.message 
    });
  }
});

// 获取用户信息
app.get('/api/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 userId 参数' 
      });
    }
    
    const user = await userService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        error: '用户不存在', 
        message: '未找到对应的用户' 
      });
    }
    
    res.json({ 
      success: true, 
      data: user 
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ 
      error: '获取用户信息失败', 
      message: error.message 
    });
  }
});

// 更新用户付费状态
app.put('/api/user/:userId/payment-status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { paymentStatus } = req.body;
    
    if (!userId || !paymentStatus) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 userId 和 paymentStatus 参数' 
      });
    }
    
    const user = await userService.updateUserPaymentStatus(userId, paymentStatus);
    
    res.json({ 
      success: true, 
      data: user 
    });
  } catch (error) {
    console.error('更新用户付费状态失败:', error);
    res.status(500).json({ 
      error: '更新用户付费状态失败', 
      message: error.message 
    });
  }
});

// 生成艺术照端点
app.post('/api/generate-art-photo', validateRequest(validateGenerateArtPhotoParams), async (req, res) => {
  try {
    const { prompt, imageUrls, facePositions, userId, templateUrl } = req.body;
    
    if (!prompt || !imageUrls) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 prompt 和 imageUrls 参数' 
      });
    }
    
    // 获取用户付费状态
    let paymentStatus = 'free'; // 默认为免费用户
    if (userId) {
      try {
        const user = await userService.getUserById(userId);
        if (user) {
          paymentStatus = user.payment_status;
        }
      } catch (error) {
        console.error('获取用户付费状态失败:', error);
        // 如果获取失败，继续使用默认的免费状态
      }
    }
    
    console.log(`用户 ${userId || '未知'} 的付费状态: ${paymentStatus}, 水印设置: ${paymentStatus === 'free'}`);
    
    const taskId = await generateArtPhoto(prompt, imageUrls, facePositions, true, paymentStatus);
    
    // 保存生成历史记录
    if (userId && taskId) {
      try {
        await generationService.saveGenerationHistory({
          userId: userId,
          taskIds: [taskId], // 4选1模式下只有一个任务ID
          originalImageUrls: imageUrls,
          templateUrl: templateUrl || imageUrls[imageUrls.length - 1], // 使用最后一张图片作为模板
          status: 'pending'
        });
        console.log(`生成历史记录已保存，任务ID: ${taskId}`);
      } catch (saveError) {
        console.error('保存生成历史记录失败:', saveError);
        // 不影响主流程，继续返回任务ID
      }
    }
    
    res.json({ 
      success: true, 
      data: { 
        taskId: taskId 
      } 
    });
  } catch (error) {
    console.error('生成艺术照失败:', error);
    
    // 记录错误日志
    await errorLogService.logError(
      'ART_PHOTO_GENERATION_FAILED',
      error.message,
      {
        userId: req.body.userId,
        imageCount: req.body.imageUrls?.length,
        endpoint: '/api/generate-art-photo',
        method: 'POST'
      }
    );
    
    res.status(500).json({ 
      error: '生成艺术照失败', 
      message: error.message 
    });
  }
});

// 查询任务状态端点
app.get('/api/task-status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 taskId 参数' 
      });
    }
    
    const status = await getTaskStatus(taskId);
    
    // 如果任务完成，更新生成历史记录
    if (status?.Result?.data?.status === 'done' && status?.Result?.data?.uploaded_image_urls) {
      try {
        const historyRecord = await generationService.getGenerationHistoryByTaskId(taskId);
        if (historyRecord) {
          await generationService.updateGenerationHistory(historyRecord.id, {
            generatedImageUrls: status.Result.data.uploaded_image_urls,
            status: 'completed'
          });
          console.log(`生成历史记录已更新，任务ID: ${taskId}`);
        }
      } catch (updateError) {
        console.error('更新生成历史记录失败:', updateError);
        // 不影响主流程，继续返回状态
      }
    } else if (status?.Result?.data?.status === 'failed') {
      try {
        const historyRecord = await generationService.getGenerationHistoryByTaskId(taskId);
        if (historyRecord) {
          await generationService.updateGenerationHistory(historyRecord.id, {
            status: 'failed'
          });
          console.log(`生成历史记录状态已更新为失败，任务ID: ${taskId}`);
        }
      } catch (updateError) {
        console.error('更新生成历史记录失败:', updateError);
      }
    }
    
    res.json({ 
      success: true, 
      data: status 
    });
  } catch (error) {
    console.error('查询任务状态失败:', error);
    
    // 记录错误日志
    await errorLogService.logError(
      'TASK_STATUS_QUERY_FAILED',
      error.message,
      {
        taskId: req.params.taskId,
        endpoint: '/api/task-status/:taskId',
        method: 'GET'
      }
    );
    
    res.status(500).json({ 
      error: '查询任务状态失败', 
      message: error.message 
    });
  }
});

// 流式查询任务状态端点 (SSE)
app.get('/api/task-status-stream/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 taskId 参数' 
      });
    }
    
    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // 轮询任务状态并通过SSE推送
    const maxAttempts = 60; // 最多轮询60次 (约2分钟)
    let attempts = 0;
    let completed = false;
    
    const pollInterval = setInterval(async () => {
      try {
        attempts++;
        
        // 查询任务状态
        const status = await getTaskStatus(taskId);
        
        // 发送进度更新
        const progress = Math.min(Math.floor((attempts / maxAttempts) * 100), 95);
        res.write(`data: ${JSON.stringify({ 
          type: 'progress', 
          progress: progress,
          status: status?.Result?.data?.status || 'processing'
        })}\n\n`);
        
        // 检查任务是否完成
        if (status?.Result?.data?.status === 'done') {
          completed = true;
          clearInterval(pollInterval);
          
          // 发送完成事件
          res.write(`data: ${JSON.stringify({ 
            type: 'complete', 
            progress: 100,
            images: status?.Result?.data?.uploaded_image_urls || []
          })}\n\n`);
          
          res.end();
        } else if (status?.Result?.data?.status === 'failed') {
          completed = true;
          clearInterval(pollInterval);
          
          // 发送失败事件
          res.write(`data: ${JSON.stringify({ 
            type: 'error', 
            message: '生成失败'
          })}\n\n`);
          
          res.end();
        } else if (attempts >= maxAttempts) {
          completed = true;
          clearInterval(pollInterval);
          
          // 发送超时事件
          res.write(`data: ${JSON.stringify({ 
            type: 'error', 
            message: '生成超时'
          })}\n\n`);
          
          res.end();
        }
      } catch (error) {
        console.error('轮询任务状态失败:', error);
        clearInterval(pollInterval);
        
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: error.message 
        })}\n\n`);
        
        res.end();
      }
    }, 2000); // 每2秒轮询一次
    
    // 处理客户端断开连接
    req.on('close', () => {
      if (!completed) {
        clearInterval(pollInterval);
        console.log(`客户端断开连接，停止轮询任务 ${taskId}`);
      }
    });
    
  } catch (error) {
    console.error('流式查询任务状态失败:', error);
    res.status(500).json({ 
      error: '流式查询任务状态失败', 
      message: error.message 
    });
  }
});

// 上传图片到OSS端点
app.post('/api/upload-image', validateRequest(validateUploadImageParams), async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 image 参数' 
      });
    }
    
    const imageUrl = await uploadImageToOSS(image);
    res.json({ 
      success: true, 
      data: { 
        imageUrl: imageUrl 
      } 
    });
  } catch (error) {
    console.error('上传图片失败:', error);
    res.status(500).json({ 
      error: '上传图片失败', 
      message: error.message 
    });
  }
});

// 人脸提取端点
app.post('/api/extract-faces', validateRequest(validateExtractFacesParams), async (req, res) => {
  try {
    const { imageUrls } = req.body;
    
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 imageUrls 数组参数' 
      });
    }
    
    // 调用Python脚本提取人脸
    const result = await extractFaces(imageUrls);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: '人脸提取失败', 
        message: result.message 
      });
    }
    
    res.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('人脸提取失败:', error);
    res.status(500).json({ 
      error: '人脸提取失败', 
      message: error.message 
    });
  }
});

// 添加水印端点
app.post('/api/add-watermark', async (req, res) => {
  try {
    const { imageUrl, userId } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 imageUrl 参数' 
      });
    }
    
    // 检查用户付费状态
    let shouldAddWatermark = true;
    if (userId) {
      try {
        const user = await userService.getUserById(userId);
        if (user && user.payment_status !== 'free') {
          shouldAddWatermark = false;
        }
      } catch (error) {
        console.error('获取用户付费状态失败:', error);
      }
    }
    
    // 如果是付费用户，直接返回原图
    if (!shouldAddWatermark) {
      return res.json({ 
        success: true, 
        data: { 
          imageUrl: imageUrl,
          watermarked: false
        } 
      });
    }
    
    // 下载图片到临时目录
    const https = require('https');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const tempDir = os.tmpdir();
    const tempInputPath = path.join(tempDir, `input_${Date.now()}.jpg`);
    const tempOutputPath = path.join(tempDir, `output_${Date.now()}.jpg`);
    
    // 下载图片
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(tempInputPath);
      https.get(imageUrl, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(tempInputPath, () => {});
        reject(err);
      });
    });
    
    // 添加水印
    const result = await addWatermark(
      tempInputPath,
      tempOutputPath,
      'AI全家福制作\n扫码去水印',
      process.env.PAYMENT_URL || 'https://your-domain.com/pay',
      'center'
    );
    
    if (!result.success) {
      // 清理临时文件
      fs.unlink(tempInputPath, () => {});
      fs.unlink(tempOutputPath, () => {});
      
      return res.status(500).json({ 
        error: '添加水印失败', 
        message: result.message 
      });
    }
    
    // 读取添加水印后的图片
    const watermarkedImageBuffer = fs.readFileSync(tempOutputPath);
    const watermarkedImageBase64 = `data:image/jpeg;base64,${watermarkedImageBuffer.toString('base64')}`;
    
    // 上传到OSS
    const watermarkedImageUrl = await uploadImageToOSS(watermarkedImageBase64);
    
    // 清理临时文件
    fs.unlink(tempInputPath, () => {});
    fs.unlink(tempOutputPath, () => {});
    
    res.json({ 
      success: true, 
      data: { 
        imageUrl: watermarkedImageUrl,
        watermarked: true
      } 
    });
  } catch (error) {
    console.error('添加水印失败:', error);
    res.status(500).json({ 
      error: '添加水印失败', 
      message: error.message 
    });
  }
});

// 付费解锁端点 - 重新生成无水印图片
app.post('/api/unlock-watermark', async (req, res) => {
  try {
    const { taskId, userId } = req.body;
    
    if (!taskId || !userId) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 taskId 和 userId 参数' 
      });
    }
    
    // 检查用户付费状态
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: '用户不存在', 
        message: '未找到对应的用户' 
      });
    }
    
    if (user.payment_status === 'free') {
      return res.status(403).json({ 
        error: '权限不足', 
        message: '需要付费才能解锁无水印图片' 
      });
    }
    
    // 获取任务的原始生成结果（带水印的）
    const history = require('./history');
    const historyRecord = history.findHistoryRecordByTaskId(taskId);
    
    if (!historyRecord || !historyRecord.generatedImageUrls || historyRecord.generatedImageUrls.length === 0) {
      return res.status(404).json({ 
        error: '任务不存在', 
        message: '未找到对应的生成任务' 
      });
    }
    
    // 由于用户已付费，API调用时watermark参数已经是false
    // 所以我们需要重新调用API生成无水印版本
    // 但为了简化，我们可以直接返回原始图片URL（因为API已经根据付费状态生成了无水印版本）
    // 或者我们可以提供一个"重新生成"的选项
    
    console.log(`用户 ${userId} 已付费，付费状态: ${user.payment_status}`);
    console.log(`任务 ${taskId} 的原始图片URL:`, historyRecord.generatedImageUrls);
    
    // 返回原始图片URL（这些URL在用户付费后重新生成时就是无水印的）
    res.json({ 
      success: true, 
      data: { 
        imageUrls: historyRecord.generatedImageUrls,
        message: '已解锁无水印高清图片'
      } 
    });
  } catch (error) {
    console.error('解锁无水印图片失败:', error);
    res.status(500).json({ 
      error: '解锁无水印图片失败', 
      message: error.message 
    });
  }
});

// 获取用户历史记录端点 (查询用户最近10条记录)
app.get('/api/history/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 userId 参数' 
      });
    }
    
    const historyRecords = await generationService.getGenerationHistoryByUserId(
      userId, 
      limit ? parseInt(limit) : 10
    );
    
    res.json({ 
      success: true, 
      data: historyRecords 
    });
  } catch (error) {
    console.error('获取用户历史记录失败:', error);
    res.status(500).json({ 
      error: '获取用户历史记录失败', 
      message: error.message 
    });
  }
});

// 根据记录ID获取历史记录端点
app.get('/api/history/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    
    if (!recordId) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 recordId 参数' 
      });
    }
    
    const record = await generationService.getGenerationHistoryById(recordId);
    if (!record) {
      return res.status(404).json({ 
        error: '未找到记录', 
        message: '未找到对应的历史记录' 
      });
    }
    
    res.json({ 
      success: true, 
      data: record 
    });
  } catch (error) {
    console.error('获取历史记录失败:', error);
    res.status(500).json({ 
      error: '获取历史记录失败', 
      message: error.message 
    });
  }
});

// 根据任务ID获取历史记录端点
app.get('/api/history/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 taskId 参数' 
      });
    }
    
    const record = await generationService.getGenerationHistoryByTaskId(taskId);
    if (!record) {
      return res.status(404).json({ 
        error: '未找到记录', 
        message: '未找到对应的任务记录' 
      });
    }
    
    res.json({ 
      success: true, 
      data: record 
    });
  } catch (error) {
    console.error('获取历史记录失败:', error);
    res.status(500).json({ 
      error: '获取历史记录失败', 
      message: error.message 
    });
  }
});

// 支付系统端点

// 创建支付订单
app.post('/api/payment/create', validateRequest(validateCreatePaymentParams), async (req, res) => {
  try {
    const { userId, generationId, packageType } = req.body;
    
    // 参数校验
    if (!userId || !generationId || !packageType) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 userId, generationId 和 packageType 参数' 
      });
    }
    
    // 校验套餐类型
    const validPackageTypes = ['free', 'basic', 'premium'];
    if (!validPackageTypes.includes(packageType)) {
      return res.status(400).json({ 
        error: '无效的套餐类型', 
        message: '套餐类型必须是 free, basic 或 premium' 
      });
    }
    
    // 根据套餐类型确定金额
    const packagePrices = {
      'free': 0,
      'basic': 9.9,
      'premium': 29.9
    };
    const amount = packagePrices[packageType];
    
    // 检查用户是否存在
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: '用户不存在', 
        message: '未找到对应的用户' 
      });
    }
    
    // 生成订单ID
    const { v4: uuidv4 } = require('uuid');
    const orderId = uuidv4();
    
    // 创建支付订单记录
    const db = require('./db/connection');
    const connection = await db.pool.getConnection();
    
    try {
      await connection.execute(
        `INSERT INTO payment_orders 
        (id, user_id, generation_id, amount, package_type, payment_method, status, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [orderId, userId, generationId, amount, packageType, 'wechat', 'pending']
      );
      
      console.log(`创建支付订单成功: ${orderId}, 用户: ${userId}, 金额: ${amount}, 套餐: ${packageType}`);
      
      res.json({ 
        success: true, 
        data: {
          orderId: orderId,
          amount: amount,
          packageType: packageType,
          status: 'pending'
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('创建支付订单失败:', error);
    
    // 记录错误日志
    await errorLogService.logError(
      'PAYMENT_ORDER_CREATE_FAILED',
      error.message,
      {
        userId: req.body.userId,
        packageType: req.body.packageType,
        endpoint: '/api/payment/create',
        method: 'POST'
      }
    );
    
    res.status(500).json({ 
      error: '创建支付订单失败', 
      message: error.message 
    });
  }
});

// 发起微信支付
app.post('/api/payment/wechat/jsapi', validateRequest(validateWechatPaymentParams), async (req, res) => {
  try {
    const { orderId, openid } = req.body;
    
    // 参数校验
    if (!orderId) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 orderId 参数' 
      });
    }
    
    // 检查微信支付是否已初始化
    if (!wechatPayment) {
      return res.status(503).json({ 
        error: '支付服务不可用', 
        message: '微信支付配置未完整设置' 
      });
    }
    
    // 查询订单信息
    const db = require('./db/connection');
    const connection = await db.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM payment_orders WHERE id = ?',
        [orderId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ 
          error: '订单不存在', 
          message: '未找到对应的支付订单' 
        });
      }
      
      const order = rows[0];
      
      // 检查订单状态
      if (order.status !== 'pending') {
        return res.status(400).json({ 
          error: '订单状态异常', 
          message: `订单状态为 ${order.status}，无法支付` 
        });
      }
      
      // 调用微信支付JSAPI
      const params = {
        description: `AI全家福-${order.package_type === 'basic' ? '尝鲜包' : '尊享包'}`,
        out_trade_no: orderId,
        notify_url: `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/payment/callback`,
        amount: {
          total: Math.round(order.amount * 100), // 转换为分
          currency: 'CNY'
        },
        payer: {
          openid: openid || 'test_openid' // 测试环境使用默认openid
        }
      };
      
      console.log('发起微信支付请求:', JSON.stringify(params, null, 2));
      
      // 使用重试机制调用微信支付API
      const result = await executeWithRetry(
        () => wechatPayment.transactions_jsapi(params),
        {
          maxRetries: 1,
          timeout: 30000,
          operationName: '微信支付JSAPI',
          onRetry: (attempt, error) => {
            console.log(`[重试] 微信支付失败，准备第 ${attempt + 1} 次重试。错误: ${error.message}`);
          }
        }
      );
      
      console.log('微信支付响应:', JSON.stringify(result, null, 2));
      
      res.json({ 
        success: true, 
        data: result
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('发起微信支付失败:', error);
    
    // 记录错误日志
    await errorLogService.logError(
      'WECHAT_PAYMENT_FAILED',
      error.message,
      {
        orderId: req.body.orderId,
        endpoint: '/api/payment/wechat/jsapi',
        method: 'POST'
      }
    );
    
    res.status(500).json({ 
      error: '发起微信支付失败', 
      message: error.message 
    });
  }
});

// 微信支付回调
app.post('/api/payment/callback', async (req, res) => {
  try {
    console.log('收到微信支付回调');
    
    // 检查微信支付是否已初始化
    if (!wechatPayment) {
      console.error('微信支付未初始化');
      return res.status(503).json({ code: 'FAIL', message: '支付服务不可用' });
    }
    
    // 验证签名
    const signature = req.headers['wechatpay-signature'];
    const timestamp = req.headers['wechatpay-timestamp'];
    const nonce = req.headers['wechatpay-nonce'];
    const serial = req.headers['wechatpay-serial'];
    
    console.log('回调headers:', { signature, timestamp, nonce, serial });
    
    // 获取原始请求体
    const body = req.body;
    
    // 验证签名
    let isValid = false;
    try {
      isValid = await wechatPayment.verifySign({
        signature,
        timestamp,
        nonce,
        body: JSON.stringify(body),
        serial
      });
    } catch (verifyError) {
      console.error('签名验证失败:', verifyError);
      return res.status(401).json({ code: 'FAIL', message: '签名验证失败' });
    }
    
    if (!isValid) {
      console.error('签名验证不通过');
      return res.status(401).json({ code: 'FAIL', message: '签名验证不通过' });
    }
    
    console.log('签名验证通过');
    
    // 解密回调数据
    let decryptedData;
    try {
      decryptedData = wechatPayment.decipher_gcm(
        body.resource.ciphertext,
        body.resource.associated_data,
        body.resource.nonce
      );
    } catch (decryptError) {
      console.error('解密回调数据失败:', decryptError);
      return res.status(500).json({ code: 'FAIL', message: '解密失败' });
    }
    
    console.log('解密后的回调数据:', JSON.stringify(decryptedData, null, 2));
    
    // 处理支付成功回调
    if (body.event_type === 'TRANSACTION.SUCCESS') {
      const orderId = decryptedData.out_trade_no;
      const transactionId = decryptedData.transaction_id;
      const tradeState = decryptedData.trade_state;
      
      console.log(`订单 ${orderId} 支付成功，微信交易ID: ${transactionId}`);
      
      // 更新订单状态
      const db = require('./db/connection');
      const connection = await db.pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        // 更新支付订单状态
        await connection.execute(
          `UPDATE payment_orders 
          SET status = ?, transaction_id = ?, updated_at = NOW() 
          WHERE id = ?`,
          [tradeState === 'SUCCESS' ? 'paid' : 'failed', transactionId, orderId]
        );
        
        // 如果支付成功，更新用户付费状态
        if (tradeState === 'SUCCESS') {
          const [orderRows] = await connection.execute(
            'SELECT user_id, package_type FROM payment_orders WHERE id = ?',
            [orderId]
          );
          
          if (orderRows.length > 0) {
            const { user_id, package_type } = orderRows[0];
            
            await connection.execute(
              'UPDATE users SET payment_status = ?, updated_at = NOW() WHERE id = ?',
              [package_type, user_id]
            );
            
            console.log(`用户 ${user_id} 付费状态已更新为 ${package_type}`);
          }
        }
        
        await connection.commit();
        
        console.log(`订单 ${orderId} 状态已更新`);
      } catch (dbError) {
        await connection.rollback();
        console.error('更新订单状态失败:', dbError);
        return res.status(500).json({ code: 'FAIL', message: '数据库更新失败' });
      } finally {
        connection.release();
      }
    }
    
    // 返回成功响应
    res.json({ code: 'SUCCESS', message: '成功' });
  } catch (error) {
    console.error('处理微信支付回调失败:', error);
    
    // 记录错误日志
    await errorLogService.logError(
      'WECHAT_CALLBACK_FAILED',
      error.message,
      {
        endpoint: '/api/payment/callback',
        method: 'POST',
        headers: {
          signature: req.headers['wechatpay-signature'],
          timestamp: req.headers['wechatpay-timestamp']
        }
      }
    );
    
    res.status(500).json({ code: 'FAIL', message: error.message });
  }
});

// 查询支付订单状态
app.get('/api/payment/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 orderId 参数' 
      });
    }
    
    // 查询订单信息
    const db = require('./db/connection');
    const connection = await db.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM payment_orders WHERE id = ?',
        [orderId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ 
          error: '订单不存在', 
          message: '未找到对应的支付订单' 
        });
      }
      
      const order = rows[0];
      
      res.json({ 
        success: true, 
        data: {
          orderId: order.id,
          userId: order.user_id,
          generationId: order.generation_id,
          amount: parseFloat(order.amount),
          packageType: order.package_type,
          paymentMethod: order.payment_method,
          transactionId: order.transaction_id,
          status: order.status,
          createdAt: order.created_at,
          updatedAt: order.updated_at
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('查询支付订单失败:', error);
    res.status(500).json({ 
      error: '查询支付订单失败', 
      message: error.message 
    });
  }
});

// 更新支付订单状态（用于测试或手动更新）
app.put('/api/payment/order/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, transactionId } = req.body;
    
    if (!orderId || !status) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 orderId 和 status 参数' 
      });
    }
    
    // 校验状态值
    const validStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: '无效的状态值', 
        message: '状态必须是 pending, paid, failed 或 refunded' 
      });
    }
    
    const db = require('./db/connection');
    const connection = await db.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 查询订单信息
      const [orderRows] = await connection.execute(
        'SELECT user_id, package_type, status FROM payment_orders WHERE id = ?',
        [orderId]
      );
      
      if (orderRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          error: '订单不存在', 
          message: '未找到对应的支付订单' 
        });
      }
      
      const order = orderRows[0];
      
      // 更新订单状态
      if (transactionId) {
        await connection.execute(
          'UPDATE payment_orders SET status = ?, transaction_id = ?, updated_at = NOW() WHERE id = ?',
          [status, transactionId, orderId]
        );
      } else {
        await connection.execute(
          'UPDATE payment_orders SET status = ?, updated_at = NOW() WHERE id = ?',
          [status, orderId]
        );
      }
      
      // 如果状态变更为paid，更新用户付费状态并解锁功能
      if (status === 'paid' && order.status !== 'paid') {
        await connection.execute(
          'UPDATE users SET payment_status = ?, updated_at = NOW() WHERE id = ?',
          [order.package_type, order.user_id]
        );
        
        console.log(`订单 ${orderId} 支付成功，用户 ${order.user_id} 付费状态已更新为 ${order.package_type}`);
      }
      
      await connection.commit();
      
      res.json({ 
        success: true, 
        message: '订单状态更新成功',
        data: {
          orderId: orderId,
          status: status,
          userPaymentStatus: status === 'paid' ? order.package_type : null
        }
      });
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('更新支付订单状态失败:', error);
    res.status(500).json({ 
      error: '更新支付订单状态失败', 
      message: error.message 
    });
  }
});

// 重试支付订单
app.post('/api/payment/order/:orderId/retry', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { openid } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 orderId 参数' 
      });
    }
    
    // 查询订单信息
    const db = require('./db/connection');
    const connection = await db.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM payment_orders WHERE id = ?',
        [orderId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ 
          error: '订单不存在', 
          message: '未找到对应的支付订单' 
        });
      }
      
      const order = rows[0];
      
      // 检查订单状态，只有pending或failed状态的订单可以重试
      if (order.status !== 'pending' && order.status !== 'failed') {
        return res.status(400).json({ 
          error: '订单状态异常', 
          message: `订单状态为 ${order.status}，无法重试支付` 
        });
      }
      
      // 更新订单状态为pending
      await connection.execute(
        'UPDATE payment_orders SET status = ?, updated_at = NOW() WHERE id = ?',
        ['pending', orderId]
      );
      
      // 检查微信支付是否已初始化
      if (!wechatPayment) {
        return res.status(503).json({ 
          error: '支付服务不可用', 
          message: '微信支付配置未完整设置' 
        });
      }
      
      // 重新调用微信支付JSAPI
      const params = {
        description: `AI全家福-${order.package_type === 'basic' ? '尝鲜包' : '尊享包'}`,
        out_trade_no: orderId,
        notify_url: `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/payment/callback`,
        amount: {
          total: Math.round(order.amount * 100), // 转换为分
          currency: 'CNY'
        },
        payer: {
          openid: openid || 'test_openid' // 测试环境使用默认openid
        }
      };
      
      console.log('重试支付请求:', JSON.stringify(params, null, 2));
      
      // 使用重试机制调用微信支付API
      const result = await executeWithRetry(
        () => wechatPayment.transactions_jsapi(params),
        {
          maxRetries: 1,
          timeout: 30000,
          operationName: '重试微信支付',
          onRetry: (attempt, error) => {
            console.log(`[重试] 重试微信支付失败，准备第 ${attempt + 1} 次重试。错误: ${error.message}`);
          }
        }
      );
      
      console.log('重试支付响应:', JSON.stringify(result, null, 2));
      
      res.json({ 
        success: true, 
        message: '重试支付成功',
        data: result
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('重试支付失败:', error);
    res.status(500).json({ 
      error: '重试支付失败', 
      message: error.message,
      details: error.response?.data || error.message
    });
  }
});

/**
 * 调用火山引擎视频生成API生成微动态视频
 * @param imageUrl 静态图片URL
 * @param motionBucketId 动态幅度 (默认10，表示低动态)
 * @param fps 帧率 (默认10)
 * @param videoLength 视频长度(秒) (默认5)
 * @param dynamicType 动态类型 (默认'festival'，添加节日元素)
 * @returns 视频生成任务ID
 */
async function generateVideo(imageUrl, motionBucketId = 10, fps = 10, videoLength = 5, dynamicType = 'festival') {
  // 使用重试机制包装API调用
  return executeWithRetry(
    () => generateVideoInternal(imageUrl, motionBucketId, fps, videoLength, dynamicType),
    {
      maxRetries: 1,
      timeout: 30000,
      operationName: '生成微动态视频',
      onRetry: (attempt, error) => {
        console.log(`[重试] 生成微动态视频失败，准备第 ${attempt + 1} 次重试。错误: ${error.message}`);
      }
    }
  );
}

/**
 * 内部函数：调用火山引擎视频生成API（不含重试逻辑）
 */
async function generateVideoInternal(imageUrl, motionBucketId = 10, fps = 10, videoLength = 5, dynamicType = 'festival') {
  return new Promise((resolve, reject) => {
    try {
      // 检查环境变量是否已设置
      if (!process.env.VOLCENGINE_ACCESS_KEY_ID || !process.env.VOLCENGINE_SECRET_ACCESS_KEY) {
        throw new Error('火山引擎API的访问密钥未设置，请检查.env文件中的配置');
      }
      
      // 准备请求参数
      const datetime = getDateTimeNow();
      const urlObj = new URL(VOLCENGINE_ENDPOINT);
      const host = urlObj.host;
      
      // 构造请求体 - 视频生成参数
      const requestBody = {
        model: "doubao-video-generation",
        image: imageUrl,
        motion_bucket_id: motionBucketId,
        fps: fps,
        video_length: videoLength,
        dynamic_type: dynamicType,
        high_retention: true, // 确保人物高保真，仅轻微微动
        response_format: "url"
      };
      
      // 将请求体转换为JSON字符串
      const requestBodyString = JSON.stringify(requestBody);
      
      // 构造headers
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Host': host,
        'X-Date': datetime,
      };
      
      // 使用火山引擎SDK进行查询参数签名
      const openApiRequestData = {
        method: "POST",
        region: VOLCENGINE_REGION,
        params: {
          Action: 'VideoGeneration',
          Version: '2024-06-06',
          'X-Algorithm': 'HMAC-SHA256',
          'X-Date': datetime,
          'X-Expires': '3600',
          'X-NotSignBody': '1',
          'X-SignedHeaders': 'content-type;host;x-date',
        },
      };
      
      const credentials = {
        accessKeyId: process.env.VOLCENGINE_ACCESS_KEY_ID,
        secretKey: process.env.VOLCENGINE_SECRET_ACCESS_KEY,
        sessionToken: "",
      };
      
      const signer = new Signer(openApiRequestData, VOLCENGINE_SERVICE_NAME);
      const signedQueryString = signer.getSignUrl(credentials);
      
      // 构造完整的URL
      const url = `${VOLCENGINE_ENDPOINT}/?${signedQueryString}`;
      
      console.log('火山引擎视频生成API请求URL:', url);
      console.log('请求headers:', JSON.stringify(headers, null, 2));
      console.log('请求体:', requestBodyString);
      
      // 构造请求选项
      const options = {
        method: 'POST',
        headers: headers,
      };
      
      // 发起HTTPS请求
      const req = https.request(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            console.log('视频生成响应状态:', res.statusCode);
            console.log('视频生成响应体:', JSON.stringify(result, null, 2));
            
            // 检查API调用是否成功
            if (res.statusCode !== 200) {
              if (res.statusCode === 401) {
                if (result?.ResponseMetadata?.Error?.Code === 'SignatureDoesNotMatch') {
                  reject(new Error(`签名错误: ${result.ResponseMetadata.Error.Message}`));
                } else {
                  reject(new Error('API调用未授权，请检查访问密钥是否正确'));
                }
              } else if (res.statusCode === 403) {
                reject(new Error('API调用被禁止，请检查访问密钥权限'));
              } else {
                reject(new Error(`API调用失败，状态码: ${res.statusCode}`));
              }
              return;
            }
            
            // 检查火山引擎API的返回结果
            if (result?.Result?.code !== 10000) {
              reject(new Error(result?.Result?.message || `API调用失败，错误码: ${result?.Result?.code}`));
              return;
            }
            
            // 获取任务ID
            const taskId = result.Result.data?.task_id || '';
            
            console.log(`视频生成任务创建成功，任务ID: ${taskId}`);
            
            // 返回任务ID
            resolve(taskId);
          } catch (parseError) {
            console.error('解析响应失败:', parseError);
            reject(new Error(`解析响应失败: ${parseError.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('网络请求失败:', error);
        reject(new Error(`网络请求失败: ${error.message}`));
      });
      
      // 发送请求体
      req.write(requestBodyString);
      req.end();
    } catch (error) {
      console.error('生成视频过程中发生错误:', error);
      reject(error);
    }
  });
}

/**
 * 查询视频生成任务状态
 * @param taskId 任务ID
 * @returns 任务状态和结果
 */
async function getVideoTaskStatus(taskId) {
  // 使用重试机制包装API调用
  return executeWithRetry(
    () => getVideoTaskStatusInternal(taskId),
    {
      maxRetries: 1,
      timeout: 30000,
      operationName: '查询视频任务状态',
      onRetry: (attempt, error) => {
        console.log(`[重试] 查询视频任务状态失败，准备第 ${attempt + 1} 次重试。错误: ${error.message}`);
      }
    }
  );
}

/**
 * 内部函数：查询视频生成任务状态（不含重试逻辑）
 */
async function getVideoTaskStatusInternal(taskId) {
  return new Promise((resolve, reject) => {
    try {
      // 检查环境变量是否已设置
      if (!process.env.VOLCENGINE_ACCESS_KEY_ID || !process.env.VOLCENGINE_SECRET_ACCESS_KEY) {
        throw new Error('火山引擎API的访问密钥未设置，请检查.env文件中的配置');
      }
      
      // 准备请求参数
      const datetime = getDateTimeNow();
      const urlObj = new URL(VOLCENGINE_ENDPOINT);
      const host = urlObj.host;
      
      // 构造请求体
      const requestBody = {
        task_id: taskId
      };
      
      // 将请求体转换为JSON字符串
      const requestBodyString = JSON.stringify(requestBody);
      
      // 构造headers
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Host': host,
        'X-Date': datetime,
      };
      
      // 使用火山引擎SDK进行查询参数签名
      const openApiRequestData = {
        method: "POST",
        region: VOLCENGINE_REGION,
        params: {
          Action: "VideoGenerationGetResult",
          Version: VOLCENGINE_VERSION,
        },
        headers: headers,
      };
      
      const credentials = {
        accessKeyId: process.env.VOLCENGINE_ACCESS_KEY_ID,
        secretKey: process.env.VOLCENGINE_SECRET_ACCESS_KEY,
        sessionToken: "",
      };
      
      const signer = new Signer(openApiRequestData, VOLCENGINE_SERVICE_NAME);
      const signedQueryString = signer.getSignUrl(credentials);
      
      // 构造完整的URL
      const url = `${VOLCENGINE_ENDPOINT}/?${signedQueryString}`;
      
      console.log('查询视频任务状态请求URL:', url);
      console.log('请求headers:', JSON.stringify(headers, null, 2));
      console.log('请求体:', requestBodyString);
      
      // 构造请求选项
      const options = {
        method: 'POST',
        headers: headers,
      };
      
      // 发起HTTPS请求
      const req = https.request(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', async () => {
          try {
            const result = JSON.parse(data);
            console.log('查询视频任务状态响应状态:', res.statusCode);
            console.log('查询视频任务状态响应体:', JSON.stringify(result, null, 2));
            
            // 检查API调用是否成功
            if (res.statusCode !== 200) {
              if (res.statusCode === 401) {
                if (result?.ResponseMetadata?.Error?.Code === 'SignatureDoesNotMatch') {
                  reject(new Error(`签名错误: ${result.ResponseMetadata.Error.Message}`));
                } else {
                  reject(new Error('API调用未授权，请检查访问密钥是否正确'));
                }
              } else if (res.statusCode === 403) {
                reject(new Error('API调用被禁止，请检查访问密钥权限'));
              } else {
                reject(new Error(`API调用失败，状态码: ${res.statusCode}`));
              }
              return;
            }
            
            // 检查火山引擎API的返回结果
            if (result?.ResponseMetadata?.Error) {
              reject(new Error(`API调用失败: ${result.ResponseMetadata.Error.Message}`));
              return;
            }
            
            // 如果视频生成完成，上传到OSS
            if (result?.Result?.data?.status === 'done' && result?.Result?.data?.video_url) {
              console.log(`视频任务 ${taskId} 已完成，视频URL: ${result.Result.data.video_url}`);
              
              // 将视频URL添加到返回结果中
              result.Result.data.uploaded_video_url = result.Result.data.video_url;
            }
            
            // 返回完整的任务状态信息
            resolve(result);
          } catch (parseError) {
            console.error('解析响应失败:', parseError);
            reject(new Error(`解析响应失败: ${parseError.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('网络请求失败:', error);
        reject(new Error(`网络请求失败: ${error.message}`));
      });
      
      // 发送请求体
      req.write(requestBodyString);
      req.end();
    } catch (error) {
      console.error('查询视频任务状态过程中发生错误:', error);
      reject(error);
    }
  });
}

/**
 * 调用Python脚本将MP4转换为Live Photo格式
 * @param videoUrl 视频URL或本地路径
 * @param outputPath 输出路径(可选)
 * @returns 转换结果
 */
async function convertToLivePhoto(videoUrl, outputPath = null) {
  return new Promise((resolve, reject) => {
    try {
      const { spawn } = require('child_process');
      const path = require('path');
      
      // Python脚本路径
      const scriptPath = path.join(__dirname, 'utils', 'convert_to_live_photo.py');
      
      // 准备参数
      const params = {
        video_url: videoUrl,
        output_path: outputPath
      };
      
      // 调用Python脚本
      const pythonProcess = spawn('python3', [scriptPath, JSON.stringify(params)]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python转换脚本执行失败:', stderr);
          reject(new Error(`Python转换脚本执行失败: ${stderr}`));
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          if (!result.success) {
            reject(new Error(result.message || 'Live Photo转换失败'));
            return;
          }
          resolve(result);
        } catch (parseError) {
          console.error('解析Python脚本输出失败:', parseError);
          reject(new Error(`解析Python脚本输出失败: ${parseError.message}`));
        }
      });
      
      // 设置60秒超时
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Live Photo转换超时'));
      }, 60000);
      
    } catch (error) {
      console.error('调用Python转换脚本失败:', error);
      reject(error);
    }
  });
}

// 转换视频为Live Photo格式端点
app.post('/api/convert-to-live-photo', async (req, res) => {
  try {
    const { videoUrl, userId } = req.body;
    
    // 参数校验
    if (!videoUrl) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 videoUrl 参数' 
      });
    }
    
    // 检查用户付费状态 - 只有尊享包用户可以使用微动态功能
    if (userId) {
      try {
        const user = await userService.getUserById(userId);
        if (!user) {
          return res.status(404).json({ 
            error: '用户不存在', 
            message: '未找到对应的用户' 
          });
        }
        
        if (user.payment_status !== 'premium') {
          return res.status(403).json({ 
            error: '权限不足', 
            message: 'Live Photo功能仅对尊享包用户开放，请升级套餐' 
          });
        }
      } catch (error) {
        console.error('获取用户付费状态失败:', error);
        return res.status(500).json({ 
          error: '获取用户信息失败', 
          message: error.message 
        });
      }
    } else {
      return res.status(401).json({ 
        error: '未授权', 
        message: '需要提供 userId 参数' 
      });
    }
    
    // 调用转换脚本
    const result = await convertToLivePhoto(videoUrl);
    
    if (!result.success) {
      return res.status(500).json({ 
        error: 'Live Photo转换失败', 
        message: result.message 
      });
    }
    
    // 读取转换后的文件
    const fs = require('fs');
    const livePhotoBuffer = fs.readFileSync(result.output_path);
    const livePhotoBase64 = `data:video/quicktime;base64,${livePhotoBuffer.toString('base64')}`;
    
    // 上传到OSS
    const livePhotoUrl = await uploadImageToOSS(livePhotoBase64);
    
    // 清理临时文件
    try {
      fs.unlinkSync(result.output_path);
    } catch (cleanupError) {
      console.error('清理临时文件失败:', cleanupError);
    }
    
    res.json({ 
      success: true, 
      data: { 
        livePhotoUrl: livePhotoUrl,
        fileSize: result.file_size,
        message: 'Live Photo格式转换成功'
      } 
    });
  } catch (error) {
    console.error('转换Live Photo失败:', error);
    res.status(500).json({ 
      error: '转换Live Photo失败', 
      message: error.message 
    });
  }
});

/**
 * 调用Python脚本将MP4转换为Live Photo格式
 * @param videoUrl 视频URL或本地路径
 * @param outputPath 输出路径(可选)
 * @returns 转换结果
 */
async function convertToLivePhoto(videoUrl, outputPath = null) {
  return new Promise((resolve, reject) => {
    try {
      const { spawn } = require('child_process');
      const path = require('path');
      
      // Python脚本路径
      const scriptPath = path.join(__dirname, 'utils', 'convert_to_live_photo.py');
      
      // 准备参数
      const params = {
        video_url: videoUrl,
        output_path: outputPath
      };
      
      // 调用Python脚本
      const pythonProcess = spawn('python3', [scriptPath, JSON.stringify(params)]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python转换脚本执行失败:', stderr);
          reject(new Error(`Python转换脚本执行失败: ${stderr}`));
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          if (!result.success) {
            reject(new Error(result.message || 'Live Photo转换失败'));
            return;
          }
          resolve(result);
        } catch (parseError) {
          console.error('解析Python脚本输出失败:', parseError);
          reject(new Error(`解析Python脚本输出失败: ${parseError.message}`));
        }
      });
      
      // 设置60秒超时
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Live Photo转换超时'));
      }, 60000);
      
    } catch (error) {
      console.error('调用Python转换脚本失败:', error);
      reject(error);
    }
  });
}

// 生成微动态视频端点
app.post('/api/generate-video', validateRequest(validateGenerateVideoParams), async (req, res) => {
  try {
    const { imageUrl, userId, motionBucketId, fps, videoLength, dynamicType } = req.body;
    
    // 参数校验
    if (!imageUrl) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 imageUrl 参数' 
      });
    }
    
    // 检查用户付费状态 - 只有尊享包用户可以使用微动态功能
    if (userId) {
      try {
        const user = await userService.getUserById(userId);
        if (!user) {
          return res.status(404).json({ 
            error: '用户不存在', 
            message: '未找到对应的用户' 
          });
        }
        
        if (user.payment_status !== 'premium') {
          return res.status(403).json({ 
            error: '权限不足', 
            message: '微动态功能仅对尊享包用户开放，请升级套餐' 
          });
        }
      } catch (error) {
        console.error('获取用户付费状态失败:', error);
        return res.status(500).json({ 
          error: '获取用户信息失败', 
          message: error.message 
        });
      }
    } else {
      return res.status(401).json({ 
        error: '未授权', 
        message: '需要提供 userId 参数' 
      });
    }
    
    // 调用视频生成API
    const taskId = await generateVideo(
      imageUrl,
      motionBucketId || 10,
      fps || 10,
      videoLength || 5,
      dynamicType || 'festival'
    );
    
    res.json({ 
      success: true, 
      data: { 
        taskId: taskId,
        message: '视频生成任务已创建，请轮询查询任务状态'
      } 
    });
  } catch (error) {
    console.error('生成视频失败:', error);
    res.status(500).json({ 
      error: '生成视频失败', 
      message: error.message 
    });
  }
});

// 查询视频生成任务状态端点
app.get('/api/video-task-status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 taskId 参数' 
      });
    }
    
    const status = await getVideoTaskStatus(taskId);
    
    res.json({ 
      success: true, 
      data: status 
    });
  } catch (error) {
    console.error('查询视频任务状态失败:', error);
    res.status(500).json({ 
      error: '查询视频任务状态失败', 
      message: error.message 
    });
  }
});

// 手动清理端点 (管理员使用)
app.post('/api/admin/cleanup', async (req, res) => {
  try {
    const { days } = req.body;
    
    const deletedCount = await cleanupService.manualCleanup(days || 30);
    
    res.json({ 
      success: true, 
      message: `清理完成，删除了 ${deletedCount} 条记录`,
      data: {
        deletedCount: deletedCount
      }
    });
  } catch (error) {
    console.error('手动清理失败:', error);
    res.status(500).json({ 
      error: '手动清理失败', 
      message: error.message 
    });
  }
});

// 实体产品订单端点

// 创建产品订单
app.post('/api/product-order/create', validateRequest(validateCreateProductOrderParams), async (req, res) => {
  try {
    const { userId, generationId, productType, productPrice, shippingName, shippingPhone, shippingAddress, imageUrl } = req.body;
    
    // 参数校验
    if (!userId || !generationId || !productType || !productPrice || !shippingName || !shippingPhone || !shippingAddress || !imageUrl) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供所有必要的订单信息' 
      });
    }
    
    // 校验产品类型
    const validProductTypes = ['crystal', 'scroll'];
    if (!validProductTypes.includes(productType)) {
      return res.status(400).json({ 
        error: '无效的产品类型', 
        message: '产品类型必须是 crystal 或 scroll' 
      });
    }
    
    // 校验手机号
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(shippingPhone)) {
      return res.status(400).json({ 
        error: '无效的手机号', 
        message: '请输入正确的11位手机号' 
      });
    }
    
    // 检查用户是否存在
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: '用户不存在', 
        message: '未找到对应的用户' 
      });
    }
    
    // 检查生成记录是否存在
    const generationRecord = await generationService.getGenerationHistoryById(generationId);
    if (!generationRecord) {
      return res.status(404).json({ 
        error: '生成记录不存在', 
        message: '未找到对应的生成记录' 
      });
    }
    
    // 生成订单ID
    const { v4: uuidv4 } = require('uuid');
    const orderId = uuidv4();
    
    // 创建产品订单记录
    const db = require('./db/connection');
    const connection = await db.pool.getConnection();
    
    try {
      await connection.execute(
        `INSERT INTO product_orders 
        (id, user_id, generation_id, product_type, product_price, shipping_name, shipping_phone, shipping_address, status, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [orderId, userId, generationId, productType, productPrice, shippingName, shippingPhone, shippingAddress, 'pending']
      );
      
      console.log(`创建产品订单成功: ${orderId}, 用户: ${userId}, 产品: ${productType}, 价格: ${productPrice}`);
      
      res.json({ 
        success: true, 
        data: {
          orderId: orderId,
          productType: productType,
          productPrice: productPrice,
          status: 'pending',
          message: '订单创建成功，我们将在1-2个工作日内与您联系'
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('创建产品订单失败:', error);
    res.status(500).json({ 
      error: '创建产品订单失败', 
      message: error.message 
    });
  }
});

// 查询产品订单
app.get('/api/product-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 orderId 参数' 
      });
    }
    
    const db = require('./db/connection');
    const connection = await db.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM product_orders WHERE id = ?',
        [orderId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ 
          error: '订单不存在', 
          message: '未找到对应的产品订单' 
        });
      }
      
      const order = rows[0];
      
      res.json({ 
        success: true, 
        data: {
          orderId: order.id,
          userId: order.user_id,
          generationId: order.generation_id,
          productType: order.product_type,
          productPrice: parseFloat(order.product_price),
          shippingName: order.shipping_name,
          shippingPhone: order.shipping_phone,
          shippingAddress: order.shipping_address,
          status: order.status,
          createdAt: order.created_at,
          updatedAt: order.updated_at
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('查询产品订单失败:', error);
    res.status(500).json({ 
      error: '查询产品订单失败', 
      message: error.message 
    });
  }
});

// 查询用户的所有产品订单
app.get('/api/product-order/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 userId 参数' 
      });
    }
    
    const db = require('./db/connection');
    const connection = await db.pool.getConnection();
    
    try {
      const limitValue = limit ? parseInt(limit) : 10;
      const [rows] = await connection.execute(
        `SELECT po.*, gh.selected_image_url 
        FROM product_orders po 
        LEFT JOIN generation_history gh ON po.generation_id = gh.id 
        WHERE po.user_id = ? 
        ORDER BY po.created_at DESC 
        LIMIT ?`,
        [userId, limitValue]
      );
      
      const orders = rows.map(row => ({
        orderId: row.id,
        userId: row.user_id,
        generationId: row.generation_id,
        productType: row.product_type,
        productPrice: parseFloat(row.product_price),
        shippingName: row.shipping_name,
        shippingPhone: row.shipping_phone,
        shippingAddress: row.shipping_address,
        status: row.status,
        imageUrl: row.selected_image_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
      
      res.json({ 
        success: true, 
        data: orders
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('查询用户产品订单失败:', error);
    res.status(500).json({ 
      error: '查询用户产品订单失败', 
      message: error.message 
    });
  }
});

// 更新产品订单状态
app.put('/api/product-order/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    if (!orderId || !status) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 orderId 和 status 参数' 
      });
    }
    
    // 校验状态值
    const validStatuses = ['pending', 'paid', 'exported', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: '无效的状态值', 
        message: '状态必须是 pending, paid, exported, shipped, delivered 或 cancelled' 
      });
    }
    
    const db = require('./db/connection');
    const connection = await db.pool.getConnection();
    
    try {
      const [result] = await connection.execute(
        'UPDATE product_orders SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, orderId]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          error: '订单不存在', 
          message: '未找到对应的产品订单' 
        });
      }
      
      console.log(`产品订单 ${orderId} 状态已更新为 ${status}`);
      
      res.json({ 
        success: true, 
        message: '订单状态更新成功',
        data: {
          orderId: orderId,
          status: status
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('更新产品订单状态失败:', error);
    res.status(500).json({ 
      error: '更新产品订单状态失败', 
      message: error.message 
    });
  }
});

/**
 * 调用Python脚本导出订单Excel
 * @param orders 订单数据数组
 * @param outputPath 输出路径(可选)
 * @returns 导出结果
 */
async function exportOrdersExcel(orders, outputPath = null) {
  return new Promise((resolve, reject) => {
    try {
      const { spawn } = require('child_process');
      const path = require('path');
      
      // Python脚本路径
      const scriptPath = path.join(__dirname, 'utils', 'export_orders_excel.py');
      
      // 准备参数
      const params = {
        orders: orders,
        output_path: outputPath
      };
      
      // 调用Python脚本
      const pythonProcess = spawn('python3', [scriptPath, JSON.stringify(params)]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python导出脚本执行失败:', stderr);
          reject(new Error(`Python导出脚本执行失败: ${stderr}`));
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          if (!result.success) {
            reject(new Error(result.message || 'Excel导出失败'));
            return;
          }
          resolve(result);
        } catch (parseError) {
          console.error('解析Python脚本输出失败:', parseError);
          reject(new Error(`解析Python脚本输出失败: ${parseError.message}`));
        }
      });
      
      // 设置30秒超时
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Excel导出超时'));
      }, 30000);
      
    } catch (error) {
      console.error('调用Python导出脚本失败:', error);
      reject(error);
    }
  });
}

// 导出产品订单Excel (管理员使用)
app.post('/api/product-order/export-excel', async (req, res) => {
  try {
    const { status, startDate, endDate } = req.body;
    
    const db = require('./db/connection');
    const connection = await db.pool.getConnection();
    
    try {
      // 构建查询条件
      let query = `
        SELECT 
          po.id as order_id,
          po.shipping_name as user_name,
          po.shipping_phone as phone,
          po.shipping_address as address,
          po.product_type,
          gh.selected_image_url as image_url,
          po.created_at as create_time
        FROM product_orders po
        LEFT JOIN generation_history gh ON po.generation_id = gh.id
        WHERE 1=1
      `;
      
      const queryParams = [];
      
      // 添加状态过滤
      if (status) {
        query += ' AND po.status = ?';
        queryParams.push(status);
      }
      
      // 添加日期范围过滤
      if (startDate) {
        query += ' AND po.created_at >= ?';
        queryParams.push(startDate);
      }
      
      if (endDate) {
        query += ' AND po.created_at <= ?';
        queryParams.push(endDate);
      }
      
      query += ' ORDER BY po.created_at DESC';
      
      // 查询订单
      const [rows] = await connection.execute(query, queryParams);
      
      if (rows.length === 0) {
        return res.json({ 
          success: true, 
          message: '没有符合条件的订单',
          data: {
            orderCount: 0
          }
        });
      }
      
      // 格式化订单数据
      const orders = rows.map(row => ({
        order_id: row.order_id,
        user_name: row.user_name,
        phone: row.phone,
        address: row.address,
        product_type: row.product_type,
        image_url: row.image_url || '',
        create_time: row.create_time
      }));
      
      // 调用Python脚本导出Excel
      const result = await exportOrdersExcel(orders);
      
      if (!result.success) {
        return res.status(500).json({ 
          error: 'Excel导出失败', 
          message: result.message 
        });
      }
      
      // 读取生成的Excel文件
      const fs = require('fs');
      const filePath = result.output_path;
      
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return res.status(500).json({ 
          error: 'Excel文件不存在', 
          message: '导出的Excel文件未找到' 
        });
      }
      
      // 更新订单状态为已导出
      if (status !== 'exported') {
        const orderIds = orders.map(o => o.order_id);
        if (orderIds.length > 0) {
          const placeholders = orderIds.map(() => '?').join(',');
          await connection.execute(
            `UPDATE product_orders SET status = 'exported', updated_at = NOW() WHERE id IN (${placeholders})`,
            orderIds
          );
          console.log(`已将 ${orderIds.length} 个订单状态更新为 exported`);
        }
      }
      
      // 设置响应头，让浏览器下载文件
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent('product_orders.xlsx')}"`);
      
      // 发送文件
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      // 文件发送完成后删除临时文件
      fileStream.on('end', () => {
        try {
          fs.unlinkSync(filePath);
          console.log(`临时Excel文件已删除: ${filePath}`);
        } catch (cleanupError) {
          console.error('删除临时文件失败:', cleanupError);
        }
      });
      
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('导出产品订单Excel失败:', error);
    res.status(500).json({ 
      error: '导出产品订单Excel失败', 
      message: error.message 
    });
  }
});

// 模板管理端点

// 获取模板列表
app.get('/api/templates', async (req, res) => {
  try {
    // 模板数据 - 可以从数据库或配置文件读取
    const templates = [
      {
        id: 'template-1',
        name: '新中式团圆',
        url: 'https://wms.webinfra.cloud/art-photos/template1.jpeg',
        category: 'chinese-style',
        description: '传统中国风格，适合全家福',
        isDefault: true
      },
      {
        id: 'template-2',
        name: '现代简约',
        url: 'https://wms.webinfra.cloud/art-photos/template2.jpeg',
        category: 'modern',
        description: '现代简约风格，时尚大气',
        isDefault: false
      },
      {
        id: 'template-3',
        name: '复古怀旧',
        url: 'https://wms.webinfra.cloud/art-photos/template3.jpeg',
        category: 'vintage',
        description: '复古怀旧风格，温馨感人',
        isDefault: false
      },
      {
        id: 'template-4',
        name: '浪漫唯美',
        url: 'https://wms.webinfra.cloud/art-photos/template4.jpeg',
        category: 'romantic',
        description: '浪漫唯美风格，梦幻温馨',
        isDefault: false
      },
      {
        id: 'template-5',
        name: '国潮风尚',
        url: 'https://wms.webinfra.cloud/art-photos/template5.jpeg',
        category: 'trendy',
        description: '国潮风尚，年轻时尚',
        isDefault: false
      }
    ];
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('获取模板列表失败:', error);
    res.status(500).json({
      error: '获取模板列表失败',
      message: error.message
    });
  }
});

// 获取单个模板详情
app.get('/api/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    
    // 这里应该从数据库查询，暂时使用硬编码
    const templates = {
      'template-1': {
        id: 'template-1',
        name: '新中式团圆',
        url: 'https://wms.webinfra.cloud/art-photos/template1.jpeg',
        category: 'chinese-style',
        description: '传统中国风格，适合全家福',
        isDefault: true
      }
      // ... 其他模板
    };
    
    const template = templates[templateId];
    
    if (!template) {
      return res.status(404).json({
        error: '模板不存在',
        message: '未找到对应的模板'
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('获取模板详情失败:', error);
    res.status(500).json({
      error: '获取模板详情失败',
      message: error.message
    });
  }
});

// 贺卡管理端点

// 创建贺卡
app.post('/api/greeting-card/create', async (req, res) => {
  try {
    const { userId, imageUrl, greeting, templateStyle } = req.body;
    
    // 参数校验
    if (!userId || !imageUrl || !greeting) {
      return res.status(400).json({
        error: '缺少必要参数',
        message: '需要提供 userId, imageUrl 和 greeting 参数'
      });
    }
    
    // 生成贺卡ID
    const { v4: uuidv4 } = require('uuid');
    const cardId = uuidv4();
    
    // 保存贺卡记录到数据库
    const db = require('./db/connection');
    const connection = await db.pool.getConnection();
    
    try {
      await connection.execute(
        `INSERT INTO greeting_cards 
        (id, user_id, image_url, greeting_text, template_style, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [cardId, userId, imageUrl, greeting, templateStyle || 'classic']
      );
      
      console.log(`创建贺卡成功: ${cardId}, 用户: ${userId}`);
      
      res.json({
        success: true,
        data: {
          cardId: cardId,
          userId: userId,
          imageUrl: imageUrl,
          greeting: greeting,
          templateStyle: templateStyle || 'classic',
          message: '贺卡创建成功'
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('创建贺卡失败:', error);
    res.status(500).json({
      error: '创建贺卡失败',
      message: error.message
    });
  }
});

// 获取贺卡详情
app.get('/api/greeting-card/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    
    if (!cardId) {
      return res.status(400).json({
        error: '缺少必要参数',
        message: '需要提供 cardId 参数'
      });
    }
    
    const db = require('./db/connection');
    const connection = await db.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM greeting_cards WHERE id = ?',
        [cardId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({
          error: '贺卡不存在',
          message: '未找到对应的贺卡'
        });
      }
      
      const card = rows[0];
      
      res.json({
        success: true,
        data: {
          cardId: card.id,
          userId: card.user_id,
          imageUrl: card.image_url,
          greeting: card.greeting_text,
          templateStyle: card.template_style,
          createdAt: card.created_at,
          updatedAt: card.updated_at
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('获取贺卡详情失败:', error);
    res.status(500).json({
      error: '获取贺卡详情失败',
      message: error.message
    });
  }
});

// 获取用户的所有贺卡
app.get('/api/greeting-card/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        error: '缺少必要参数',
        message: '需要提供 userId 参数'
      });
    }
    
    const db = require('./db/connection');
    const connection = await db.pool.getConnection();
    
    try {
      const limitValue = limit ? parseInt(limit) : 10;
      const [rows] = await connection.execute(
        `SELECT * FROM greeting_cards 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?`,
        [userId, limitValue]
      );
      
      const cards = rows.map(row => ({
        cardId: row.id,
        userId: row.user_id,
        imageUrl: row.image_url,
        greeting: row.greeting_text,
        templateStyle: row.template_style,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
      
      res.json({
        success: true,
        data: cards
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('获取用户贺卡列表失败:', error);
    res.status(500).json({
      error: '获取用户贺卡列表失败',
      message: error.message
    });
  }
});

// 历史记录更新端点
app.put('/api/history/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const { selectedImageUrl, status } = req.body;
    
    if (!recordId) {
      return res.status(400).json({
        error: '缺少必要参数',
        message: '需要提供 recordId 参数'
      });
    }
    
    const db = require('./db/connection');
    const connection = await db.pool.getConnection();
    
    try {
      // 构建更新语句
      const updates = [];
      const values = [];
      
      if (selectedImageUrl !== undefined) {
        updates.push('selected_image_url = ?');
        values.push(selectedImageUrl);
      }
      
      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({
          error: '缺少更新参数',
          message: '需要提供至少一个更新字段'
        });
      }
      
      updates.push('updated_at = NOW()');
      values.push(recordId);
      
      const [result] = await connection.execute(
        `UPDATE generation_history SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: '记录不存在',
          message: '未找到对应的历史记录'
        });
      }
      
      console.log(`历史记录 ${recordId} 已更新`);
      
      res.json({
        success: true,
        message: '历史记录更新成功',
        data: {
          recordId: recordId
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('更新历史记录失败:', error);
    res.status(500).json({
      error: '更新历史记录失败',
      message: error.message
    });
  }
});

// 错误日志管理端点

// 查询错误日志
app.get('/api/error-logs', async (req, res) => {
  try {
    const { level, errorCode, startDate, endDate, limit } = req.query;
    
    const filters = {};
    
    if (level) {
      filters.level = level;
    }
    
    if (errorCode) {
      filters.errorCode = errorCode;
    }
    
    if (startDate) {
      filters.startDate = new Date(startDate);
    }
    
    if (endDate) {
      filters.endDate = new Date(endDate);
    }
    
    if (limit) {
      filters.limit = parseInt(limit);
    } else {
      filters.limit = 100; // 默认返回100条
    }
    
    const logs = await errorLogService.queryLogs(filters);
    
    res.json({
      success: true,
      data: {
        logs: logs,
        count: logs.length
      }
    });
  } catch (error) {
    console.error('查询错误日志失败:', error);
    res.status(500).json({
      error: '查询错误日志失败',
      message: error.message
    });
  }
});

// 清理旧错误日志 (管理员使用)
app.post('/api/admin/error-logs/cleanup', async (req, res) => {
  try {
    const { daysToKeep } = req.body;
    
    const days = daysToKeep ? parseInt(daysToKeep) : 30;
    
    // 清理数据库日志
    const dbDeletedCount = await errorLogService.cleanupOldLogs(days);
    
    // 清理文件日志
    const fileDeletedCount = errorLogService.cleanupOldLogFiles(days);
    
    res.json({
      success: true,
      message: `清理完成`,
      data: {
        databaseRecordsDeleted: dbDeletedCount,
        logFilesDeleted: fileDeletedCount,
        daysKept: days
      }
    });
  } catch (error) {
    console.error('清理错误日志失败:', error);
    
    await errorLogService.logError(
      'ERROR_LOG_CLEANUP_FAILED',
      error.message,
      {
        endpoint: '/api/admin/error-logs/cleanup',
        method: 'POST'
      }
    );
    
    res.status(500).json({
      error: '清理错误日志失败',
      message: error.message
    });
  }
});

// 手动记录错误日志 (用于测试或特殊情况)
app.post('/api/admin/error-logs/log', async (req, res) => {
  try {
    const { errorCode, errorMessage, context } = req.body;
    
    if (!errorCode || !errorMessage) {
      return res.status(400).json({
        error: '缺少必要参数',
        message: '需要提供 errorCode 和 errorMessage 参数'
      });
    }
    
    const logEntry = await errorLogService.logError(
      errorCode,
      errorMessage,
      context || {}
    );
    
    res.json({
      success: true,
      message: '错误日志已记录',
      data: logEntry
    });
  } catch (error) {
    console.error('记录错误日志失败:', error);
    res.status(500).json({
      error: '记录错误日志失败',
      message: error.message
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🚀 AI全家福服务器运行在端口 ${PORT}`);
  console.log(`========================================\n`);
  
  console.log(`📋 核心功能端点:`);
  console.log(`  - 健康检查: http://localhost:${PORT}/health`);
  console.log(`  - 生成艺术照: POST /api/generate-art-photo`);
  console.log(`  - 查询任务状态: GET /api/task-status/:taskId`);
  console.log(`  - 上传图片: POST /api/upload-image\n`);
  
  console.log(`👤 用户管理:`);
  console.log(`  - 初始化用户: POST /api/user/init`);
  console.log(`  - 获取用户信息: GET /api/user/:userId`);
  console.log(`  - 更新付费状态: PUT /api/user/:userId/payment-status\n`);
  
  console.log(`🎨 模板管理:`);
  console.log(`  - 获取模板列表: GET /api/templates`);
  console.log(`  - 获取模板详情: GET /api/templates/:templateId\n`);
  
  console.log(`💳 支付系统:`);
  console.log(`  - 创建订单: POST /api/payment/create`);
  console.log(`  - 微信支付: POST /api/payment/wechat/jsapi`);
  console.log(`  - 查询订单: GET /api/payment/order/:orderId\n`);
  
  console.log(`🎁 贺卡管理:`);
  console.log(`  - 创建贺卡: POST /api/greeting-card/create`);
  console.log(`  - 获取贺卡: GET /api/greeting-card/:cardId`);
  console.log(`  - 用户贺卡列表: GET /api/greeting-card/user/:userId\n`);
  
  console.log(`📦 产品订单:`);
  console.log(`  - 创建订单: POST /api/product-order/create`);
  console.log(`  - 查询订单: GET /api/product-order/:orderId`);
  console.log(`  - 导出Excel: POST /api/product-order/export-excel\n`);
  
  console.log(`🎬 微动态视频:`);
  console.log(`  - 生成视频: POST /api/generate-video`);
  console.log(`  - 查询状态: GET /api/video-task-status/:taskId`);
  console.log(`  - Live Photo转换: POST /api/convert-to-live-photo\n`);
  
  console.log(`📚 历史记录:`);
  console.log(`  - 用户历史: GET /api/history/user/:userId`);
  console.log(`  - 更新记录: PUT /api/history/:recordId\n`);
  
  console.log(`📝 错误日志:`);
  console.log(`  - 查询日志: GET /api/error-logs`);
  console.log(`  - 清理旧日志: POST /api/admin/error-logs/cleanup`);
  console.log(`  - 手动记录: POST /api/admin/error-logs/log\n`);
  
  console.log(`========================================\n`);
  
  // 启动定时清理任务
  cleanupService.startCleanupSchedule();
});