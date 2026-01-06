/**
 * 视频生成服务模块
 * 处理火山引擎视频生成API调用
 */

const https = require('https');
const { Signer } = require('@volcengine/openapi');
const { getDateTimeNow } = require('../utils/crypto');
const { executeWithRetry } = require('../utils/apiRetry');

const VOLCENGINE_ENDPOINT = 'https://open.volcengineapi.com';
const VOLCENGINE_VERSION = '2024-06-06';
const VOLCENGINE_SERVICE_NAME = 'cv';
const VOLCENGINE_REGION = 'cn-beijing';

/**
 * 调用火山引擎视频生成API (带重试)
 */
async function generateVideo(imageUrl, motionBucketId = 10, fps = 10, videoLength = 5, dynamicType = 'festival') {
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
 * 内部函数：调用火山引擎视频生成API
 */
async function generateVideoInternal(imageUrl, motionBucketId = 10, fps = 10, videoLength = 5, dynamicType = 'festival') {
  return new Promise((resolve, reject) => {
    try {
      if (!process.env.VOLCENGINE_ACCESS_KEY_ID || !process.env.VOLCENGINE_SECRET_ACCESS_KEY) {
        throw new Error('火山引擎API的访问密钥未设置');
      }
      
      const datetime = getDateTimeNow();
      const urlObj = new URL(VOLCENGINE_ENDPOINT);
      const host = urlObj.host;
      
      const requestBody = {
        model: "doubao-video-generation",
        image: imageUrl,
        motion_bucket_id: motionBucketId,
        fps: fps,
        video_length: videoLength,
        dynamic_type: dynamicType,
        high_retention: true,
        response_format: "url"
      };
      
      const requestBodyString = JSON.stringify(requestBody);
      
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Host': host,
        'X-Date': datetime,
      };
      
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
      const url = `${VOLCENGINE_ENDPOINT}/?${signedQueryString}`;
      
      console.log('火山引擎视频生成API请求URL:', url);
      
      const req = https.request(url, { method: 'POST', headers }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            console.log('视频生成响应状态:', res.statusCode);
            
            if (res.statusCode !== 200) {
              handleVideoError(res.statusCode, result, reject);
              return;
            }
            
            if (result?.Result?.code !== 10000) {
              reject(new Error(result?.Result?.message || `API调用失败，错误码: ${result?.Result?.code}`));
              return;
            }
            
            const taskId = result.Result.data?.task_id || '';
            console.log(`视频生成任务创建成功，任务ID: ${taskId}`);
            resolve(taskId);
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
 * 查询视频生成任务状态 (带重试)
 */
async function getVideoTaskStatus(taskId) {
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
 * 内部函数：查询视频生成任务状态
 */
async function getVideoTaskStatusInternal(taskId) {
  return new Promise((resolve, reject) => {
    try {
      if (!process.env.VOLCENGINE_ACCESS_KEY_ID || !process.env.VOLCENGINE_SECRET_ACCESS_KEY) {
        throw new Error('火山引擎API的访问密钥未设置');
      }
      
      const datetime = getDateTimeNow();
      const urlObj = new URL(VOLCENGINE_ENDPOINT);
      const host = urlObj.host;
      
      const requestBody = { task_id: taskId };
      const requestBodyString = JSON.stringify(requestBody);
      
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Host': host,
        'X-Date': datetime,
      };
      
      const openApiRequestData = {
        method: "POST",
        region: VOLCENGINE_REGION,
        params: { Action: "VideoGenerationGetResult", Version: VOLCENGINE_VERSION },
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
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            
            if (res.statusCode !== 200) {
              handleVideoError(res.statusCode, result, reject);
              return;
            }
            
            if (result?.ResponseMetadata?.Error) {
              reject(new Error(`API调用失败: ${result.ResponseMetadata.Error.Message}`));
              return;
            }
            
            if (result?.Result?.data?.status === 'done' && result?.Result?.data?.video_url) {
              result.Result.data.uploaded_video_url = result.Result.data.video_url;
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
 * 处理视频API错误
 */
function handleVideoError(statusCode, result, reject) {
  if (statusCode === 401) {
    if (result?.ResponseMetadata?.Error?.Code === 'SignatureDoesNotMatch') {
      reject(new Error(`签名错误: ${result.ResponseMetadata.Error.Message}`));
    } else {
      reject(new Error('API调用未授权'));
    }
  } else if (statusCode === 403) {
    reject(new Error('API调用被禁止'));
  } else {
    reject(new Error(`API调用失败，状态码: ${statusCode}`));
  }
}

module.exports = {
  generateVideo,
  getVideoTaskStatus
};
