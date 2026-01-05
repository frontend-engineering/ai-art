import { TemplateConfig, TemplateCategory } from '../types';

export const PUZZLE_TEMPLATES: TemplateConfig[] = [
  {
    id: 'puzzle-1',
    name: '新中式团圆',
    url: 'https://wms.webinfra.cloud/art-photos/template1.jpeg',
    category: 'chinese-style',
    tags: ['新中式', '团圆', '喜庆'],
    description: '传统中式风格，适合全家福',
    isDefault: true,
    isPremium: false
  },
  {
    id: 'puzzle-2',
    name: '故宫红墙',
    url: 'https://wms.webinfra.cloud/art-photos/template2.jpeg',
    category: 'chinese-style',
    tags: ['故宫', '红墙', '国风'],
    description: '故宫红墙背景，尽显皇家气派',
    isPremium: false
  },
  {
    id: 'puzzle-3',
    name: '喜庆中国红',
    url: 'https://wms.webinfra.cloud/art-photos/template3.jpeg',
    category: 'festive',
    tags: ['喜庆', '中国红', '节日'],
    description: '喜庆的中国红主题',
    isPremium: false
  },
  {
    id: 'puzzle-4',
    name: '温馨团圆',
    url: 'https://wms.webinfra.cloud/art-photos/template4.jpeg',
    category: 'reunion',
    tags: ['温馨', '团圆', '家庭'],
    description: '温馨的家庭团圆氛围',
    isPremium: false
  }
];

export const PUZZLE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'chinese-style',
    name: '新中式',
    icon: '🏮',
    description: '传统中式风格'
  },
  {
    id: 'festive',
    name: '喜庆',
    icon: '🎊',
    description: '节日喜庆风格'
  },
  {
    id: 'reunion',
    name: '团圆',
    icon: '👨‍👩‍👧‍👦',
    description: '家庭团圆主题'
  }
];
