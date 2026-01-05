import { TemplateConfig, TemplateCategory } from '../types';

// 导入本地模板图片 - 优先模板
import customTemplate1 from '@/assets/templates/transform/fHPym5Te7.jpg';
import customTemplate2 from '@/assets/templates/transform/fHPyN0b67.jpg';
import customTemplate3 from '@/assets/templates/transform/fHPyoUXXv.jpg';

// 导入本地模板图片 - 备选模板
import luxuryEuropean from '@/assets/templates/transform/luxury-european.jpg';
import luxuryChinese from '@/assets/templates/transform/luxury-chinese.jpg';
import modernLuxury from '@/assets/templates/transform/modern-luxury.jpg';
import classicalPalace from '@/assets/templates/transform/classical-palace.jpg';

export const TRANSFORM_TEMPLATES: TemplateConfig[] = [
  // 优先加载的自定义模板
  {
    id: 'transform-custom-1',
    name: '富贵团圆',
    url: customTemplate1,
    category: 'chinese',
    tags: ['中式', '团圆', '喜庆', '富贵'],
    description: '中国风富贵团圆背景，喜庆大气',
    isDefault: true,
    isPremium: false
  },
  {
    id: 'transform-custom-2',
    name: '豪门盛宴',
    url: customTemplate2,
    category: 'luxury',
    tags: ['豪宅', '奢华', '宴会', '高端'],
    description: '豪门宴会背景，高端大气',
    isPremium: false
  },
  {
    id: 'transform-custom-3',
    name: '雅致居所',
    url: customTemplate3,
    category: 'modern',
    tags: ['雅致', '温馨', '家庭', '舒适'],
    description: '雅致温馨的家庭背景',
    isPremium: false
  },
  // 备选模板
  {
    id: 'transform-1',
    name: '欧式豪华客厅',
    url: luxuryEuropean,
    category: 'luxury',
    tags: ['欧式', '豪宅', '奢华', '客厅'],
    description: '欧式宫廷风格，水晶吊灯，奢华典雅',
    isPremium: false
  },
  {
    id: 'transform-2',
    name: '中式豪宅大厅',
    url: luxuryChinese,
    category: 'chinese',
    tags: ['中式', '传统', '富贵', '红木'],
    description: '传统中式建筑风格，红木家具，富贵大气',
    isPremium: false
  },
  {
    id: 'transform-3',
    name: '现代轻奢客厅',
    url: modernLuxury,
    category: 'modern',
    tags: ['现代', '简约', '时尚', '轻奢'],
    description: '现代简约风格，时尚大气',
    isPremium: false
  },
  {
    id: 'transform-4',
    name: '古典宫廷',
    url: classicalPalace,
    category: 'luxury',
    tags: ['宫殿', '古典', '奢华', '皇家'],
    description: '古典宫廷风格，皇家气派',
    isPremium: true
  }
];

export const TRANSFORM_CATEGORIES: TemplateCategory[] = [
  {
    id: 'luxury',
    name: '豪宅',
    icon: '🏰',
    description: '豪华别墅风格'
  },
  {
    id: 'chinese',
    name: '中式',
    icon: '🏯',
    description: '中式庭院风格'
  },
  {
    id: 'modern',
    name: '现代',
    icon: '🏢',
    description: '现代简约风格'
  }
];
