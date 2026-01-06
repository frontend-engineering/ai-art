/**
 * 贺卡管理路由模块
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');

// 创建贺卡
router.post('/create', async (req, res) => {
  try {
    const { userId, imageUrl, greeting, templateStyle } = req.body;
    
    if (!userId || !imageUrl || !greeting) {
      return res.status(400).json({
        error: '缺少必要参数',
        message: '需要提供 userId, imageUrl 和 greeting 参数'
      });
    }
    
    const cardId = uuidv4();
    const connection = await db.pool.getConnection();
    
    try {
      await connection.execute(
        `INSERT INTO greeting_cards 
        (id, user_id, image_url, greeting_text, template_style, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [cardId, userId, imageUrl, greeting, templateStyle || 'classic']
      );
      
      console.log(`创建贺卡成功: ${cardId}`);
      
      res.json({
        success: true,
        data: {
          cardId, userId, imageUrl, greeting,
          templateStyle: templateStyle || 'classic',
          message: '贺卡创建成功'
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('创建贺卡失败:', error);
    res.status(500).json({ error: '创建贺卡失败', message: error.message });
  }
});

// 获取贺卡详情
router.get('/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    
    if (!cardId) {
      return res.status(400).json({ error: '缺少必要参数', message: '需要提供 cardId 参数' });
    }
    
    const connection = await db.pool.getConnection();
    try {
      const [rows] = await connection.execute('SELECT * FROM greeting_cards WHERE id = ?', [cardId]);
      
      if (rows.length === 0) {
        return res.status(404).json({ error: '贺卡不存在', message: '未找到对应的贺卡' });
      }
      
      const card = rows[0];
      res.json({
        success: true,
        data: {
          cardId: card.id, userId: card.user_id, imageUrl: card.image_url,
          greeting: card.greeting_text, templateStyle: card.template_style,
          createdAt: card.created_at, updatedAt: card.updated_at
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('获取贺卡详情失败:', error);
    res.status(500).json({ error: '获取贺卡详情失败', message: error.message });
  }
});

// 获取用户的所有贺卡
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: '缺少必要参数', message: '需要提供 userId 参数' });
    }
    
    const connection = await db.pool.getConnection();
    try {
      const limitValue = limit ? parseInt(limit) : 10;
      const [rows] = await connection.execute(
        `SELECT * FROM greeting_cards WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
        [userId, limitValue]
      );
      
      const cards = rows.map(row => ({
        cardId: row.id, userId: row.user_id, imageUrl: row.image_url,
        greeting: row.greeting_text, templateStyle: row.template_style,
        createdAt: row.created_at, updatedAt: row.updated_at
      }));
      
      res.json({ success: true, data: cards });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('获取用户贺卡列表失败:', error);
    res.status(500).json({ error: '获取用户贺卡列表失败', message: error.message });
  }
});

module.exports = router;
