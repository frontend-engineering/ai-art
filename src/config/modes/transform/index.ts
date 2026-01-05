import { ModeConfig } from '../types';
import { TRANSFORM_TEMPLATES, TRANSFORM_CATEGORIES } from './templates';
import { TRANSFORM_API_CONFIG } from './api';
import { TRANSFORM_PROMPTS } from './prompts';

export const TRANSFORM_MODE: ModeConfig = {
  id: 'transform',
  name: '富贵变身',
  slug: '/transform',
  description: '一键更换全家福背景，从普通餐桌变身豪门大宅',
  
  theme: {
    primaryColor: '#D4AF37',
    secondaryColor: '#FFC700',
    gradientFrom: '#8B6914',
    gradientTo: '#D4AF37',
    icon: '👑',
  },
  
  content: {
    slogan: '背景太土？一秒变豪门',
    description: '杂乱餐桌 → 欧式豪宅背景',
    uploadGuide: '上传一张全家福，AI将为您更换高端背景',
    voiceGuide: '请上传您的全家福照片，我们将为您更换背景',
    buttonText: '立即变身豪门',
  },
  
  features: {
    maxImages: 1,
    minImages: 1,
    requireFaceDetection: true,
    supportMultipleFaces: true,
    allowDragUpload: true,
  },
  
  api: {
    generate: TRANSFORM_API_CONFIG.generate,
    getStatus: TRANSFORM_API_CONFIG.getStatus,
    uploadImage: TRANSFORM_API_CONFIG.uploadImage
  },
  
  templates: {
    categories: TRANSFORM_CATEGORIES,
    list: TRANSFORM_TEMPLATES,
    defaultTemplateId: 'transform-custom-1'
  },
  
  prompts: {
    templates: TRANSFORM_PROMPTS,
    defaultPromptId: 'default'
  },
  
  modelParams: {
    mode: 'transform',
    background_replacement: true,
    preserve_people: true,
    watermark: true
  }
};
