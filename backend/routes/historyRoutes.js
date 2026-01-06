/**
 * 历史记录路由模块
 */

const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const generationService = require('../services/generationService');

// 获取所有历史记录 (调试用)
router.get('/all', async (req, res) => {
  try {
    const { limit } = req.query;
    const connection = await db.pool.getConnection();
    const limitNum = limit ? parseInt(limit) : 20;
    
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM generation_history ORDER BY created_at DESC LIMIT ${limitNum}`
      );
      
      const parseJsonField = (field) => {
        if (!field) return null;
        if (typeof field === 'string') {
          try { return JSON.parse(field); } catch (e) { return null; }
        }
        return field;
      };
      
      const formattedRows = rows.map(record => ({
        id: record.id,
        user_id: record.user_id,
        task_ids: parseJsonField(record.task_ids),
        original_image_urls: parseJsonField(record.original_image_urls),
        template_url: record.template_url,
        generated_image_urls: parseJsonField(record.generated_image_urls),
        selected_image_url: record.selected_image_url,
        status: record.status,
        created_at: record.created_at,
        updated_at: record.updated_at
      }));
      
      res.json({ success: true, data: formattedRows });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('获取所有历史记录失败:', error);
    res.status(500).json({ error: '获取所有历史记录失败', message: error.message });
  }
});

// 获取用户历史记录
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: '缺少必要参数', message: '需要提供 userId 参数' });
    }
    
    const historyRecords = await generationService.getGenerationHistoryByUserId(
      userId, limit ? parseInt(limit) : 10
    );
    
    const formattedRecords = historyRecords.map(record => ({
      id: record.id,
      user_id: record.userId,
      task_ids: record.taskIds,
      original_image_urls: record.originalImageUrls,
      template_url: record.templateUrl,
      generated_image_urls: record.generatedImageUrls,
      selected_image_url: record.selectedImageUrl,
      status: record.status,
      created_at: record.createdAt,
      updated_at: record.updatedAt
    }));
    
    res.json({ success: true, data: formattedRecords });
  } catch (error) {
    console.error('获取用户历史记录失败:', error);
    res.status(500).json({ error: '获取用户历史记录失败', message: error.message });
  }
});

// 根据记录ID获取历史记录
router.get('/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    
    if (!recordId) {
      return res.status(400).json({ error: '缺少必要参数', message: '需要提供 recordId 参数' });
    }
    
    const record = await generationService.getGenerationHistoryById(recordId);
    if (!record) {
      return res.status(404).json({ error: '未找到记录', message: '未找到对应的历史记录' });
    }
    
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('获取历史记录失败:', error);
    res.status(500).json({ error: '获取历史记录失败', message: error.message });
  }
});

// 根据任务ID获取历史记录
router.get('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({ error: '缺少必要参数', message: '需要提供 taskId 参数' });
    }
    
    const record = await generationService.getGenerationHistoryByTaskId(taskId);
    if (!record) {
      return res.status(404).json({ error: '未找到记录', message: '未找到对应的任务记录' });
    }
    
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('获取历史记录失败:', error);
    res.status(500).json({ error: '获取历史记录失败', message: error.message });
  }
});

// 更新历史记录
router.put('/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const { selectedImageUrl, status } = req.body;
    
    if (!recordId) {
      return res.status(400).json({ error: '缺少必要参数', message: '需要提供 recordId 参数' });
    }
    
    const connection = await db.pool.getConnection();
    try {
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
        return res.status(400).json({ error: '缺少更新参数', message: '需要提供至少一个更新字段' });
      }
      
      updates.push('updated_at = NOW()');
      values.push(recordId);
      
      const [result] = await connection.execute(
        `UPDATE generation_history SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: '记录不存在', message: '未找到对应的历史记录' });
      }
      
      res.json({ success: true, message: '历史记录更新成功', data: { recordId } });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('更新历史记录失败:', error);
    res.status(500).json({ error: '更新历史记录失败', message: error.message });
  }
});

module.exports = router;
