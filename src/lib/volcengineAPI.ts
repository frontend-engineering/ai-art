// 注意：此文件在浏览器环境中运行，使用Web Crypto API

// 后端代理服务地址
const VOLCENGINE_API_PROXY = 'http://localhost:3001';

/**
 * 调用火山引擎API生成艺术照(通过后端代理)
 * @param prompt 用于生成图像的提示词
 * @param imageUrls 图片文件URL数组,Note that 图1人物照片,图2艺术参考图
 * @param facePositions 人脸位置信息数组(可选)
 * @param userId 用户ID(可选)
 * @returns 生成任务ID
 */
export const generateArtPhoto = async (
  prompt: string = "参考图分工：图 1 为人脸参考图，图 2 为艺术风格参考图。要求：1:1 还原图 1 面部特征，严格复刻图 2 的姿势、风格、场景氛围和光影逻辑。色彩过渡均匀，背景禁用高饱和色。分辨率超高清（300dpi，像素≥2000×3000），确保细节清晰。禁止混淆两图特征，整体画面需通透自然，符合艺术照审美。",
  imageUrls: string[] = [],
  facePositions?: Array<{ x: number; y: number; scale: number; rotation: number }>,
  userId?: string
): Promise<string> => {
  try {
    // 构造请求体
    const requestBody: any = {
      prompt,
      imageUrls
    };
    
    // 如果提供了人脸位置信息,则添加到请求体中
    if (facePositions && facePositions.length > 0) {
      requestBody.facePositions = facePositions;
    }
    
    // 如果提供了用户ID,则添加到请求体中
    if (userId) {
      requestBody.userId = userId;
    }
    
    const response = await fetch(`${VOLCENGINE_API_PROXY}/api/generate-art-photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    
    // 检查API调用是否成功
    if (!response.ok) {
      throw new Error(result?.message || `API调用失败，状态码: ${response.status}`);
    }
    
    if (!result?.success) {
      throw new Error(result?.message || 'API调用失败');
    }
    
    // 返回任务ID
    return result.data?.taskId || '';
  } catch (error) {
    console.error('火山引擎API调用失败:', error);
    throw new Error(error instanceof Error ? error.message : '艺术照生成失败，请稍后重试');
  }
};

/**
 * 查询任务状态（通过后端代理）
 * @param taskId 任务ID
 * @returns 任务状态和结果
 */
export const getTaskStatus = async (taskId: string): Promise<any> => {
  try {
    const response = await fetch(`${VOLCENGINE_API_PROXY}/api/task-status/${taskId}`);
    
    const result = await response.json();
    
    // 检查API调用是否成功
    if (!response.ok) {
      throw new Error(result?.message || `API调用失败，状态码: ${response.status}`);
    }
    
    if (!result?.success) {
      throw new Error(result?.message || 'API调用失败');
    }
    
    return result.data;
  } catch (error) {
    console.error('查询任务状态失败:', error);
    throw new Error(error instanceof Error ? error.message : '查询任务状态失败，请稍后重试');
  }
};

/**
 * 流式查询任务状态（SSE）
 * @param taskId 任务ID
 * @param onProgress 进度回调函数
 * @param onComplete 完成回调函数
 * @param onError 错误回调函数
 * @returns 取消函数
 */
export const getTaskStatusStream = (
  taskId: string,
  onProgress: (progress: number, status: string) => void,
  onComplete: (images: string[]) => void,
  onError: (error: string) => void
): (() => void) => {
  const eventSource = new EventSource(`${VOLCENGINE_API_PROXY}/api/task-status-stream/${taskId}`);
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'progress') {
        onProgress(data.progress, data.status);
      } else if (data.type === 'complete') {
        onComplete(data.images);
        eventSource.close();
      } else if (data.type === 'error') {
        onError(data.message);
        eventSource.close();
      }
    } catch (error) {
      console.error('解析SSE消息失败:', error);
      onError('解析响应失败');
      eventSource.close();
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('SSE连接错误:', error);
    onError('连接失败，请重试');
    eventSource.close();
  };
  
  // 返回取消函数
  return () => {
    eventSource.close();
  };
};

export default {
  generateArtPhoto,
  getTaskStatus,
  getTaskStatusStream
};