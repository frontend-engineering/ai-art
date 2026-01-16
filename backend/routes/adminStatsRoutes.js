const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/adminAuth');
const statsService = require('../services/statsService');

// 获取看板数据
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const data = await statsService.getDashboardData();
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('获取看板数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取看板数据失败',
      error: error.message
    });
  }
});

// 获取收入统计
router.get('/revenue', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const data = await statsService.getRevenueStats(startDate, endDate);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('获取收入统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取收入统计失败',
      error: error.message
    });
  }
});

// 获取用户统计
router.get('/users', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const data = await statsService.getUserStats(startDate, endDate);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('获取用户统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户统计失败',
      error: error.message
    });
  }
});

// 获取热门模板
router.get('/templates', authenticate, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const data = await statsService.getPopularTemplates(parseInt(limit));
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('获取热门模板失败:', error);
    res.status(500).json({
      success: false,
      message: '获取热门模板失败',
      error: error.message
    });
  }
});

// 获取趋势数据
router.get('/trends', authenticate, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const data = await statsService.getTrendData(parseInt(days));
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('获取趋势数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取趋势数据失败',
      error: error.message
    });
  }
});

module.exports = router;
