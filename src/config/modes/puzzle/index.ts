import { ModeConfig } from '../types';
import { PUZZLE_TEMPLATES, PUZZLE_CATEGORIES } from './templates';
import { PUZZLE_API_CONFIG } from './api';
import { PUZZLE_PROMPTS } from './prompts';

export const PUZZLE_MODE: ModeConfig = {
  id: 'puzzle',
  name: '时空拼图',
  slug: '/puzzle',
  description: '将分散各地的家人照片合成为一张完美全家福',
  
  theme: {
    primaryColor: '#D4302B',
    secondaryColor: '#FFD700',
    gradientFrom: '#C8102E',
    gradientTo: '#B8001F',
    icon: '🧩',
  },
  
  content: {
    slogan: '家人天各一方？拼出大团圆',
    description: '3张单人照 → 合成故宫全家福',
    uploadGuide: '上传2-5张家人照片，AI将为您合成完美全家福',
    voiceGuide: '请上传清晰正面照，光线越亮效果越好',
    buttonText: '立即制作全家福',
  },
  
  features: {
    maxImages: 5,
    minImages: 2,
    requireFaceDetection: true,
    supportMultipleFaces: true,
    allowDragUpload: false,
  },
  
  api: {
    generate: PUZZLE_API_CONFIG.generate,
    getStatus: PUZZLE_API_CONFIG.getStatus,
    uploadImage: PUZZLE_API_CONFIG.uploadImage
  },
  
  templates: {
    categories: PUZZLE_CATEGORIES,
    list: PUZZLE_TEMPLATES,
    defaultTemplateId: 'puzzle-1'
  },
  
  prompts: {
    templates: PUZZLE_PROMPTS,
    defaultPromptId: 'default'
  },
  
  modelParams: {
    mode: 'puzzle',
    sequential_image_generation: 'auto',
    max_images: 4,
    watermark: true
  }
};
