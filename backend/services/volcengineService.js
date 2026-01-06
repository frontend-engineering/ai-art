/**
 * 火山引擎API服务模块
 * 处理火山方舟图片生成和视频生成API调用
 */

const https = require('https');
const { v4: uuidv4 } = require('uuid');
const { Signer } = require('@volcengine/openapi');
const { getDateTimeNow } = require('../utils/crypto');
const { uploadImageToOSS } = require('./ossService');
const { executeWithRetry } = require('../utils/apiRetry');
const apiLogService = require('./apiLogService');

// 火山引擎API配置
const VOLCENGINE_ARK_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const VOLCENGINE_ENDPOINT = 'https://open.volcengineapi.com';
const VOLCENGINE_VERSION = '2024-06-06';
const VOLCENGINE_SERVICE_NAME = 'cv';
const VOLCENGINE_REGION = 'cn-beijing';

/**
 * 调用火山引擎API生成艺术照 (带重试)
 */
async function generateArtPhoto(prompt, imageUrls, facePositions = null, useStreaming = true, paymentStatus = 'free', modeParams = {}) {
  return executeWithRetry(
    () => generateArtPhotoInternal(prompt, imageUrls, facePositions, useStreaming, paymentStatus, modeParams),
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
 * 内部函数：调用火山方舟API生成艺术照
 */
async function generateArtPhotoInternal(prompt, imageUrls, facePositions = null, useStreaming = true, paymentStatus = 'free', modeParams = {}) {
  const startTime = Date.now();
  const mode = modeParams.mode || 'unknown';
  
  if (!process.env.ARK_API_KEY) {
    console.error('❌ ARK_API_KEY 未配置！');
    throw new Error('火山方舟API密钥未设置，请在.env文件中配置 ARK_API_KEY');
  }
  
  const apiKey = process.env.ARK_API_KEY;
  
  console.log(`\n========== [${mode}模式] 火山方舟API调用准备 ==========`);
  console.log('🔑 API密钥状态:', apiKey ? '已配置' : '未配置');
  console.log('🖼️  输入图片数量:', imageUrls?.length || 0);
  
  // 处理图片URL
  const processedImages = processImageUrls(imageUrls);
  
  if (processedImages.length === 0) {
    throw new Error('请提供至少一张有效的照片');
  }
  
  // 构造请求体
  const requestBody = {
    model: "doubao-seedream-4-5-251128",
    prompt: prompt,
    image: processedImages,
    size: "2K",
    sequential_image_generation: "auto",
    sequential_image_generation_options: { max_images: 4 },
    stream: false,
    response_format: "url",
    watermark: paymentStatus === 'free',
  };
  
  if (mode === 'transform') {
    requestBody.optimize_prompt_options = { mode: "standard" };
  }
  
  const requestBodyString = JSON.stringify(requestBody);
  
  console.log('📍 请求URL:', VOLCENGINE_ARK_ENDPOINT);
  console.log('🎨 Prompt:', prompt);
  console.log('📦 完整请求体长度:', requestBodyString.length, '字节');
  console.log('================================================\n');
  
  try {
    const response = await fetch(VOLCENGINE_ARK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: requestBodyString
    });
    
    const responseText = await response.text();
    console.log('响应状态:', response.status);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('响应解析失败，原始响应:', responseText.substring(0, 500));
      throw new Error(`API响应解析失败: ${parseErr.message}`);
    }
    
    console.log('响应体:', JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      const errorMsg = result?.error?.message || result?.message || `API调用失败，状态码: ${response.status}`;
      console.error('API调用失败:', errorMsg);
      
      await logApiError(mode, processedImages, modeParams, result, errorMsg, startTime);
      throw new Error(errorMsg);
    }
    
    if (result.data && Array.isArray(result.data)) {
      const generatedImages = extractGeneratedImages(result.data);
      console.log(`✅ API成功返回 ${generatedImages.length} 张图片`);
      
      const taskId = uuidv4();
      
      await logApiSuccess(mode, taskId, prompt, processedImages, modeParams, facePositions, generatedImages, result.usage, startTime);
      saveToHistory(taskId, imageUrls, generatedImages);
      
      return taskId;
    }
    
    if (result.error) {
      throw new Error(result.error.message || 'API返回错误');
    }
    
    throw new Error('API响应格式异常，未返回图片数据');
    
  } catch (error) {
    console.error('生成艺术照过程中发生错误:', error);
    await logApiError(mode, processedImages, modeParams, null, error.message, startTime);
    throw error;
  }
}

/**
 * 处理图片URL数组
 */
function processImageUrls(imageUrls) {
  const processedImages = [];
  
  if (!imageUrls || imageUrls.length === 0) {
    return processedImages;
  }
  
  for (let i = 0; i < Math.min(imageUrls.length, 14); i++) {
    const imgUrl = imageUrls[i];
    
    if (imgUrl.startsWith('data:image/')) {
      processedImages.push(imgUrl);
      console.log(`📷 图片${i + 1}: Base64格式`);
    } else if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
      processedImages.push(imgUrl);
      console.log(`📷 图片${i + 1}: URL格式 (${imgUrl})`);
    } else if (imgUrl.startsWith('/')) {
      const domain = process.env.COS_DOMAIN || 'wms.webinfra.cloud';
      const fullUrl = `https://${domain}${imgUrl}`;
      processedImages.push(fullUrl);
      console.log(`📷 图片${i + 1}: 转换为URL (${fullUrl})`);
    } else {
      console.warn(`⚠️ 图片${i + 1}: 未知格式，跳过`);
    }
  }
  
  return processedImages;
}

/**
 * 提取生成的图片
 */
function extractGeneratedImages(data) {
  const generatedImages = [];
  
  for (const item of data) {
    if (item.url) {
      generatedImages.push(item.url);
    } else if (item.b64_json) {
      generatedImages.push(`data:image/jpeg;base64,${item.b64_json}`);
    } else if (item.error) {
      console.warn('某张图片生成失败:', item.error);
    }
  }
  
  return generatedImages;
}

/**
 * 保存到历史记录
 */
function saveToHistory(taskId, originalImageUrls, generatedImageUrls) {
  const historyRecord = {
    taskId: taskId,
    originalImageUrls: originalImageUrls || [],
    generatedImageUrls: generatedImageUrls,
    status: 'done',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const history = require('../history');
  history.addHistoryRecord(historyRecord);
  console.log(`✅ 任务 ${taskId} 已保存，包含 ${generatedImageUrls.length} 张图片`);
}

/**
 * 记录API成功日志
 */
async function logApiSuccess(mode, taskId, prompt, processedImages, modeParams, facePositions, generatedImages, usage, startTime) {
  await apiLogService.logApiCall({
    mode,
    taskId,
    request: {
      prompt,
      imageUrls: processedImages,
      templateUrl: processedImages[processedImages.length - 1],
      modelParams: modeParams,
      facePositions
    },
    response: {
      taskId,
      imageUrls: generatedImages,
      status: 'done',
      message: '火山方舟API直接返回',
      usage
    },
    status: 'success',
    duration: Date.now() - startTime
  }).catch(err => console.error('[API日志] 记录失败:', err));
}

/**
 * 记录API错误日志
 */
async function logApiError(mode, processedImages, modeParams, response, errorMsg, startTime) {
  await apiLogService.logApiCall({
    mode,
    taskId: 'error',
    request: { imageUrls: processedImages, modelParams: modeParams },
    response,
    status: 'error',
    error: errorMsg,
    duration: Date.now() - startTime
  }).catch(err => console.error('[API日志] 记录失败:', err));
}

/**
 * 查询任务状态 (带重试)
 */
async function getTaskStatus(taskId) {
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
 * 内部函数：查询任务状态
 */
async function getTaskStatusInternal(taskId) {
  return new Promise((resolve, reject) => {
    try {
      if (!process.env.VOLCENGINE_ACCESS_KEY_ID || !process.env.VOLCENGINE_SECRET_ACCESS_KEY) {
        throw new Error('火山引擎API的访问密钥未设置');
      }
      
      // 检查缓存
      const history = require('../history');
      const existingRecord = history.findHistoryRecordByTaskId(taskId);
      if (existingRecord && existingRecord.generatedImageUrls && existingRecord.generatedImageUrls.length > 0) {
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
      
      const datetime = getDateTimeNow();
      const urlObj = new URL(VOLCENGINE_ENDPOINT);
      const host = urlObj.host;
      
      const requestBody = { task_id: taskId, req_key: "jimeng_t2i_v40" };
      const requestBodyString = JSON.stringify(requestBody);
      
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Host': host,
        'X-Date': datetime,
      };
      
      const openApiRequestData = {
        method: "POST",
        region: VOLCENGINE_REGION,
        params: { Action: "JimengT2IV40GetResult", Version: VOLCENGINE_VERSION },
        headers: headers,
      };
      
      const credentials = {
        accessKeyId: process.env.VOLCENGINE_ACCESS_KEY_ID,
        secretKey: process.env.VOLCENGINE_SECRET_ACCESS_KEY,
        sessionToken: "",
      };
      
      const signer = new Signer(openApiRequestData, VOLCENGINE_SERVICE_NAME);
      const signedQueryString = signer.getSignUrl(credentials);
      const url = `${VOLCENGINE_ENDPOINT}/?${signedQueryString}`;
      
      const req = https.request(url, { method: 'POST', headers }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', async () => {
          try {
            const result = JSON.parse(data);
            
            if (res.statusCode !== 200) {
              handleStatusError(res.statusCode, result, reject);
              return;
            }
            
            if (result?.ResponseMetadata?.Error) {
              reject(new Error(`API调用失败: ${result.ResponseMetadata.Error.Message}`));
              return;
            }
            
            // 处理完成的任务
            if (result?.Result?.data?.status === 'done' && result?.Result?.data?.binary_data_base64) {
              await handleCompletedTask(taskId, result);
            }
            
            resolve(result);
          } catch (parseError) {
            reject(new Error(`解析响应失败: ${parseError.message}`));
          }
        });
      });
      
      req.on('error', (error) => reject(new Error(`网络请求失败: ${error.message}`)));
      req.write(requestBodyString);
      req.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 处理状态码错误
 */
function handleStatusError(statusCode, result, reject) {
  if (statusCode === 401) {
    if (result?.ResponseMetadata?.Error?.Code === 'SignatureDoesNotMatch') {
      reject(new Error(`签名错误: ${result.ResponseMetadata.Error.Message}`));
    } else {
      reject(new Error('API调用未授权，请检查访问密钥是否正确'));
    }
  } else if (statusCode === 403) {
    reject(new Error('API调用被禁止，请检查访问密钥权限'));
  } else {
    reject(new Error(`API调用失败，状态码: ${statusCode}`));
  }
}

/**
 * 处理完成的任务
 */
async function handleCompletedTask(taskId, result) {
  console.log(`检测到任务 ${taskId} 已完成，开始上传图片到OSS`);
  
  const uploadedImageUrls = [];
  const base64Images = result.Result.data.binary_data_base64;
  
  for (let i = 0; i < base64Images.length; i++) {
    try {
      const base64Image = `data:image/jpeg;base64,${base64Images[i]}`;
      const imageUrl = await uploadImageToOSS(base64Image);
      uploadedImageUrls.push(imageUrl);
      console.log(`第 ${i + 1} 张图片上传成功: ${imageUrl}`);
    } catch (uploadError) {
      console.error(`第 ${i + 1} 张图片上传失败:`, uploadError);
    }
  }
  
  result.Result.data.uploaded_image_urls = uploadedImageUrls;
  
  // 保存历史记录
  const historyRecord = {
    taskId: taskId,
    originalImageUrls: [],
    generatedImageUrls: uploadedImageUrls,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const history = require('../history');
  history.addHistoryRecord(historyRecord);
  console.log('历史记录保存成功');
}

module.exports = {
  generateArtPhoto,
  generateArtPhotoInternal,
  getTaskStatus,
  processImageUrls,
  VOLCENGINE_ARK_ENDPOINT,
  VOLCENGINE_ENDPOINT,
  VOLCENGINE_REGION,
  VOLCENGINE_SERVICE_NAME,
  VOLCENGINE_VERSION
};
