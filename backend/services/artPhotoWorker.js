/**
 * 艺术照生成 Worker
 * 
 * 负责异步执行艺术照生成任务
 * 支持重试、超时处理、进度更新
 */

const { TaskStatus, updateTask, getTask } = require('./taskQueueService');

// 正在处理的任务集合（防止重复处理）
const processingTasks = new Set();

/**
 * 执行艺术照生成任务
 * @param {string} taskId 任务ID
 * @param {Function} generateFn 生成函数 (generateArtPhotoInternal)
 */
async function executeArtPhotoTask(taskId, generateFn) {
  // 防止重复处理
  if (processingTasks.has(taskId)) {
    console.log(`[Worker] 任务 ${taskId} 正在处理中，跳过`);
    return;
  }
  
  processingTasks.add(taskId);
  
  try {
    const task = await getTask(taskId);
    if (!task) {
      console.error(`[Worker] 任务不存在: ${taskId}`);
      return;
    }
    
    // 检查任务状态
    if (task.status !== TaskStatus.PENDING && task.status !== TaskStatus.PROCESSING) {
      console.log(`[Worker] 任务 ${taskId} 状态为 ${task.status}，跳过处理`);
      return;
    }
    
    // 更新为处理中
    updateTask(taskId, {
      status: TaskStatus.PROCESSING,
      progress: 10,
      message: '正在连接AI服务...',
      startedAt: new Date().toISOString()
    });
    
    const { params } = task;
    const { finalPrompt, finalImageUrls, facePositions, paymentStatus, modelParams } = params;
    
    console.log(`\n[Worker] 开始处理任务: ${taskId}`);
    console.log(`[Worker] 模式: ${modelParams?.mode || 'unknown'}`);
    console.log(`[Worker] 图片数量: ${finalImageUrls?.length || 0}`);
    
    // 更新进度
    updateTask(taskId, {
      progress: 30,
      message: '正在生成艺术照...'
    });
    
    // 调用生成函数（带超时控制）
    const timeoutMs = 120000; // 2分钟超时
    const result = await Promise.race([
      generateFn(finalPrompt, finalImageUrls, facePositions, true, paymentStatus, modelParams),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('生成超时，请重试')), timeoutMs)
      )
    ]);
    
    // 更新进度
    updateTask(taskId, {
      progress: 80,
      message: '正在处理生成结果...'
    });
    
    // 获取生成的图片
    // generateArtPhotoInternal 返回的是内部 taskId（用于 history 记录）
    let generatedImages = [];
    
    if (typeof result === 'string') {
      // 如果返回的是 taskId，需要从 history 获取图片
      const history = require('../history');
      const historyRecord = history.findHistoryRecordByTaskId(result);
      if (historyRecord && historyRecord.generatedImageUrls) {
        generatedImages = historyRecord.generatedImageUrls;
      }
    } else if (Array.isArray(result)) {
      generatedImages = result;
    }
    
    if (generatedImages.length === 0) {
      throw new Error('未能获取生成的图片');
    }
    
    // 任务完成
    updateTask(taskId, {
      status: TaskStatus.COMPLETED,
      progress: 100,
      message: '生成完成',
      result: {
        images: generatedImages,
        generatedAt: new Date().toISOString()
      },
      completedAt: new Date().toISOString()
    });
    
    console.log(`[Worker] 任务完成: ${taskId}, 生成 ${generatedImages.length} 张图片`);
    
  } catch (error) {
    console.error(`[Worker] 任务失败: ${taskId}`, error);
    
    const task = await getTask(taskId);
    const retryCount = (task?.retryCount || 0) + 1;
    const maxRetries = task?.maxRetries || 2;
    
    if (retryCount < maxRetries) {
      // 可以重试，更新状态但不自动重试（等待用户手动重试）
      updateTask(taskId, {
        status: TaskStatus.FAILED,
        progress: 0,
        message: `生成失败: ${error.message}`,
        retryCount: retryCount,
        error: error.message,
        completedAt: new Date().toISOString()
      });
    } else {
      // 达到最大重试次数
      updateTask(taskId, {
        status: TaskStatus.FAILED,
        progress: 0,
        message: '生成失败，已达到最大重试次数',
        error: error.message,
        completedAt: new Date().toISOString()
      });
    }
    
  } finally {
    processingTasks.delete(taskId);
  }
}

/**
 * 重试失败的任务
 * @param {string} taskId 任务ID
 * @param {Function} generateFn 生成函数
 */
async function retryTask(taskId, generateFn) {
  const task = await getTask(taskId);
  
  if (!task) {
    throw new Error('任务不存在');
  }
  
  if (task.status !== TaskStatus.FAILED && task.status !== TaskStatus.TIMEOUT) {
    throw new Error('只能重试失败或超时的任务');
  }
  
  // 重置任务状态
  updateTask(taskId, {
    status: TaskStatus.PENDING,
    progress: 0,
    message: '准备重新生成...',
    retryCount: 0,
    error: null
  });
  
  // 执行任务
  executeArtPhotoTask(taskId, generateFn);
}

/**
 * 取消任务
 * @param {string} taskId 任务ID
 */
async function cancelTask(taskId) {
  const task = await getTask(taskId);
  
  if (!task) {
    throw new Error('任务不存在');
  }
  
  if (task.status === TaskStatus.COMPLETED) {
    throw new Error('已完成的任务无法取消');
  }
  
  updateTask(taskId, {
    status: TaskStatus.CANCELLED,
    message: '任务已取消',
    completedAt: new Date().toISOString()
  });
  
  console.log(`[Worker] 任务已取消: ${taskId}`);
}

module.exports = {
  executeArtPhotoTask,
  retryTask,
  cancelTask
};
