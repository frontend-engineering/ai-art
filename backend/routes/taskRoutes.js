/**
 * 任务管理路由模块
 */

const express = require('express');
const router = express.Router();
const { TaskStatus, createTask, getTask, getUserTasks } = require('../services/taskQueueService');
const { executeArtPhotoTask, retryTask, cancelTask } = require('../services/artPhotoWorker');
const { generateArtPhotoInternal, getTaskStatus } = require('../services/volcengineService');
const { getModeConfig, getModeModelParams } = require('../config/modes');
const { getTemplateConfig, getDefaultTemplate } = require('../config/templates');
const { validateRequest, validateGenerateArtPhotoParams } = require('../utils/validation');
const userService = require('../services/userService');
const generationService = require('../services/generationService');
const errorLogService = require('../services/errorLogService');

// 生成艺术照端点 (异步任务模式)
router.post('/generate-art-photo', validateRequest(validateGenerateArtPhotoParams), async (req, res) => {
  try {
    const { imageUrls, facePositions, userId, templateId, mode = 'puzzle' } = req.body;
    
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 imageUrls 参数（用户照片）' 
      });
    }
    
    const modeConfig = getModeConfig(mode);
    if (!modeConfig) {
      return res.status(400).json({ error: '无效的模式', message: `模式 ${mode} 不存在` });
    }
    
    let templateConfig = templateId ? getTemplateConfig(mode, templateId) : getDefaultTemplate(mode);
    if (!templateConfig) {
      templateConfig = getDefaultTemplate(mode);
    }
    
    if (!templateConfig) {
      return res.status(400).json({ error: '模板配置错误', message: '无法获取模板配置' });
    }
    
    // 验证用户照片数量
    const userImageCount = imageUrls.length;
    if (mode === 'transform' && userImageCount !== 1) {
      return res.status(400).json({ 
        error: '参数验证失败', 
        message: '富贵变身模式需要且仅需要1张用户照片' 
      });
    }
    if (mode === 'puzzle' && (userImageCount < 2 || userImageCount > 5)) {
      return res.status(400).json({ 
        error: '参数验证失败', 
        message: '时空拼图模式需要2-5张用户照片' 
      });
    }
    
    // 获取用户付费状态
    let paymentStatus = 'free';
    if (userId) {
      try {
        const user = await userService.getUserById(userId);
        if (user) paymentStatus = user.payment_status;
      } catch (error) {
        console.error('获取用户付费状态失败:', error);
      }
    }
    
    const finalImageUrls = [...imageUrls, templateConfig.imageUrl];
    const finalPrompt = templateConfig.prompt;
    const modelParams = getModeModelParams(mode);
    modelParams.mode = mode;
    
    console.log(`\n========== [${modeConfig.name}] 异步任务创建 ==========`);
    console.log('📋 模式:', mode);
    console.log('🎭 模板:', templateConfig.name);
    console.log('🖼️  用户照片数量:', userImageCount);
    
    const task = createTask({
      mode, userId, templateId: templateConfig.id, imageUrls,
      finalPrompt, finalImageUrls, facePositions, paymentStatus, modelParams
    });
    
    console.log('🆔 任务ID:', task.id);
    
    // 保存生成历史
    if (userId && task.id) {
      try {
        await generationService.saveGenerationHistory({
          userId, taskIds: [task.id], originalImageUrls: imageUrls,
          templateUrl: templateConfig.imageUrl, mode, status: 'pending'
        });
      } catch (saveError) {
        console.error('保存生成历史记录失败:', saveError);
      }
    }
    
    res.json({ 
      success: true, 
      data: { 
        taskId: task.id, mode, templateId: templateConfig.id,
        status: task.status, message: task.message
      } 
    });
    
    // 异步执行任务
    setImmediate(() => {
      executeArtPhotoTask(task.id, generateArtPhotoInternal);
    });
    
  } catch (error) {
    console.error('创建生成任务失败:', error);
    
    await errorLogService.logError(
      'ART_PHOTO_TASK_CREATE_FAILED', error.message,
      { userId: req.body.userId, mode: req.body.mode, endpoint: '/api/generate-art-photo' }
    );
    
    res.status(500).json({ error: '生成艺术照失败', message: error.message });
  }
});

// 查询异步任务状态
router.get('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({ error: '缺少必要参数', message: '需要提供 taskId 参数' });
    }
    
    const task = await getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ error: '任务不存在', message: '未找到对应的任务' });
    }
    
    res.json({ 
      success: true, 
      data: {
        taskId: task.id, status: task.status, progress: task.progress,
        message: task.message, result: task.result, error: task.error,
        retryCount: task.retryCount, maxRetries: task.maxRetries,
        createdAt: task.createdAt, updatedAt: task.updatedAt,
        completedAt: task.completedAt, meta: task.meta
      }
    });
  } catch (error) {
    console.error('查询任务状态失败:', error);
    res.status(500).json({ error: '查询任务状态失败', message: error.message });
  }
});

// 重试失败的任务
router.post('/task/:taskId/retry', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ error: '任务不存在', message: '未找到对应的任务' });
    }
    
    if (task.status !== TaskStatus.FAILED && task.status !== TaskStatus.TIMEOUT) {
      return res.status(400).json({ error: '无法重试', message: '只能重试失败或超时的任务' });
    }
    
    await retryTask(taskId, generateArtPhotoInternal);
    
    res.json({ 
      success: true, message: '任务已重新开始',
      data: { taskId, status: TaskStatus.PENDING }
    });
  } catch (error) {
    console.error('重试任务失败:', error);
    res.status(500).json({ error: '重试任务失败', message: error.message });
  }
});

// 取消任务
router.post('/task/:taskId/cancel', async (req, res) => {
  try {
    const { taskId } = req.params;
    await cancelTask(taskId);
    
    res.json({ 
      success: true, message: '任务已取消',
      data: { taskId, status: TaskStatus.CANCELLED }
    });
  } catch (error) {
    console.error('取消任务失败:', error);
    res.status(500).json({ error: '取消任务失败', message: error.message });
  }
});

// 获取用户的所有任务
router.get('/tasks/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const tasks = await getUserTasks(userId);
    
    const taskList = tasks.map(task => ({
      taskId: task.id, status: task.status, progress: task.progress,
      message: task.message, result: task.result,
      createdAt: task.createdAt, completedAt: task.completedAt, meta: task.meta
    }));
    
    res.json({ success: true, data: taskList });
  } catch (error) {
    console.error('获取用户任务列表失败:', error);
    res.status(500).json({ error: '获取用户任务列表失败', message: error.message });
  }
});

// 旧版任务状态查询 (兼容)
router.get('/task-status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const status = await getTaskStatus(taskId);
    
    // 更新生成历史记录
    if (status?.Result?.data?.status === 'done' && status?.Result?.data?.uploaded_image_urls) {
      try {
        const historyRecord = await generationService.getGenerationHistoryByTaskId(taskId);
        if (historyRecord) {
          await generationService.updateGenerationHistory(historyRecord.id, {
            generatedImageUrls: status.Result.data.uploaded_image_urls,
            status: 'completed'
          });
        }
      } catch (updateError) {
        console.error('更新生成历史记录失败:', updateError);
      }
    } else if (status?.Result?.data?.status === 'failed') {
      try {
        const historyRecord = await generationService.getGenerationHistoryByTaskId(taskId);
        if (historyRecord) {
          await generationService.updateGenerationHistory(historyRecord.id, { status: 'failed' });
        }
      } catch (updateError) {
        console.error('更新生成历史记录失败:', updateError);
      }
    }
    
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('查询任务状态失败:', error);
    
    await errorLogService.logError(
      'TASK_STATUS_QUERY_FAILED', error.message,
      { taskId: req.params.taskId, endpoint: '/api/task-status/:taskId' }
    );
    
    res.status(500).json({ error: '查询任务状态失败', message: error.message });
  }
});

// 流式查询任务状态 (SSE)
router.get('/task-status-stream/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const maxAttempts = 60;
    let attempts = 0;
    let completed = false;
    
    const pollInterval = setInterval(async () => {
      try {
        attempts++;
        const status = await getTaskStatus(taskId);
        
        const progress = Math.min(Math.floor((attempts / maxAttempts) * 100), 95);
        res.write(`data: ${JSON.stringify({ 
          type: 'progress', progress, status: status?.Result?.data?.status || 'processing'
        })}\n\n`);
        
        if (status?.Result?.data?.status === 'done') {
          completed = true;
          clearInterval(pollInterval);
          res.write(`data: ${JSON.stringify({ 
            type: 'complete', progress: 100,
            images: status?.Result?.data?.uploaded_image_urls || []
          })}\n\n`);
          res.end();
        } else if (status?.Result?.data?.status === 'failed') {
          completed = true;
          clearInterval(pollInterval);
          res.write(`data: ${JSON.stringify({ type: 'error', message: '生成失败' })}\n\n`);
          res.end();
        } else if (attempts >= maxAttempts) {
          completed = true;
          clearInterval(pollInterval);
          res.write(`data: ${JSON.stringify({ type: 'error', message: '生成超时' })}\n\n`);
          res.end();
        }
      } catch (error) {
        clearInterval(pollInterval);
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
      }
    }, 2000);
    
    req.on('close', () => {
      if (!completed) {
        clearInterval(pollInterval);
        console.log(`客户端断开连接，停止轮询任务 ${taskId}`);
      }
    });
    
  } catch (error) {
    console.error('流式查询任务状态失败:', error);
    res.status(500).json({ error: '流式查询任务状态失败', message: error.message });
  }
});

module.exports = router;
