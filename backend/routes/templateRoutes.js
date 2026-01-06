/**
 * 模板管理路由模块
 */

const express = require('express');
const router = express.Router();
const { getTemplateList } = require('../config/templates');

// 获取模板列表
router.get('/', async (req, res) => {
  try {
    const { mode } = req.query;
    
    const templates = getTemplateList(mode || 'transform');
    
    // 返回安全的模板列表（不包含prompt，防止泄露）
    const safeTemplates = templates.map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      // 不返回 imageUrl 和 prompt
    }));
    
    res.json({ success: true, data: safeTemplates });
  } catch (error) {
    console.error('获取模板列表失败:', error);
    res.status(500).json({ error: '获取模板列表失败', message: error.message });
  }
});

// 获取单个模板详情
router.get('/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    
    // 硬编码模板数据（实际应从数据库查询）
    const templates = {
      'template-1': {
        id: 'template-1',
        name: '新中式团圆',
        url: 'https://wms.webinfra.cloud/art-photos/template1.jpeg',
        category: 'chinese-style',
        description: '传统中国风格，适合全家福',
        isDefault: true
      }
    };
    
    const template = templates[templateId];
    
    if (!template) {
      return res.status(404).json({ error: '模板不存在', message: '未找到对应的模板' });
    }
    
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('获取模板详情失败:', error);
    res.status(500).json({ error: '获取模板详情失败', message: error.message });
  }
});

module.exports = router;
