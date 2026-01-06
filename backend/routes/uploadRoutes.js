/**
 * 上传相关路由模块
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { uploadImageToOSS } = require('../services/ossService');
const { extractFaces, addWatermark } = require('../services/pythonBridge');
const { validateRequest, validateUploadImageParams, validateExtractFacesParams } = require('../utils/validation');
const userService = require('../services/userService');

// 上传图片到OSS
router.post('/upload-image', validateRequest(validateUploadImageParams), async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: '缺少必要参数', message: '需要提供 image 参数' });
    }
    
    const imageUrl = await uploadImageToOSS(image);
    res.json({ success: true, data: { imageUrl } });
  } catch (error) {
    console.error('上传图片失败:', error);
    res.status(500).json({ error: '上传图片失败', message: error.message });
  }
});

// 人脸提取
router.post('/extract-faces', validateRequest(validateExtractFacesParams), async (req, res) => {
  try {
    const { imageUrls } = req.body;
    
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({ error: '缺少必要参数', message: '需要提供 imageUrls 数组参数' });
    }
    
    const result = await extractFaces(imageUrls);
    
    if (!result.success) {
      return res.status(400).json({ error: '人脸提取失败', message: result.message });
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('人脸提取失败:', error);
    res.status(500).json({ error: '人脸提取失败', message: error.message });
  }
});

// 添加水印
router.post('/add-watermark', async (req, res) => {
  try {
    const { imageUrl, userId } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: '缺少必要参数', message: '需要提供 imageUrl 参数' });
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
    
    // 付费用户直接返回原图
    if (!shouldAddWatermark) {
      return res.json({ success: true, data: { imageUrl, watermarked: false } });
    }
    
    const tempDir = os.tmpdir();
    const tempInputPath = path.join(tempDir, `input_${Date.now()}.jpg`);
    const tempOutputPath = path.join(tempDir, `output_${Date.now()}.jpg`);
    
    // 下载图片
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(tempInputPath);
      https.get(imageUrl, (response) => {
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', (err) => {
        fs.unlink(tempInputPath, () => {});
        reject(err);
      });
    });
    
    // 添加水印
    const result = await addWatermark(
      tempInputPath, tempOutputPath,
      'AI全家福制作\n扫码去水印',
      process.env.PAYMENT_URL || 'https://your-domain.com/pay',
      'center'
    );
    
    if (!result.success) {
      fs.unlink(tempInputPath, () => {});
      fs.unlink(tempOutputPath, () => {});
      return res.status(500).json({ error: '添加水印失败', message: result.message });
    }
    
    // 上传到OSS
    const watermarkedImageBuffer = fs.readFileSync(tempOutputPath);
    const watermarkedImageBase64 = `data:image/jpeg;base64,${watermarkedImageBuffer.toString('base64')}`;
    const watermarkedImageUrl = await uploadImageToOSS(watermarkedImageBase64);
    
    // 清理临时文件
    fs.unlink(tempInputPath, () => {});
    fs.unlink(tempOutputPath, () => {});
    
    res.json({ success: true, data: { imageUrl: watermarkedImageUrl, watermarked: true } });
  } catch (error) {
    console.error('添加水印失败:', error);
    res.status(500).json({ error: '添加水印失败', message: error.message });
  }
});

// 付费解锁无水印图片
router.post('/unlock-watermark', async (req, res) => {
  try {
    const { taskId, userId } = req.body;
    
    if (!taskId || !userId) {
      return res.status(400).json({ error: '缺少必要参数', message: '需要提供 taskId 和 userId 参数' });
    }
    
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在', message: '未找到对应的用户' });
    }
    
    if (user.payment_status === 'free') {
      return res.status(403).json({ error: '权限不足', message: '需要付费才能解锁无水印图片' });
    }
    
    const history = require('../history');
    const historyRecord = history.findHistoryRecordByTaskId(taskId);
    
    if (!historyRecord || !historyRecord.generatedImageUrls || historyRecord.generatedImageUrls.length === 0) {
      return res.status(404).json({ error: '任务不存在', message: '未找到对应的生成任务' });
    }
    
    res.json({ 
      success: true, 
      data: { imageUrls: historyRecord.generatedImageUrls, message: '已解锁无水印高清图片' }
    });
  } catch (error) {
    console.error('解锁无水印图片失败:', error);
    res.status(500).json({ error: '解锁无水印图片失败', message: error.message });
  }
});

module.exports = router;
