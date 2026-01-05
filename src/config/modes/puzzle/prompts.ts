import { PromptTemplate } from '../types';

export const PUZZLE_PROMPTS: PromptTemplate[] = [
  {
    id: 'default',
    name: '默认提示词',
    template: '生成中国风全家福艺术照，多人合影，{style}风格，{scene}场景',
    variables: ['style', 'scene'],
    description: '适用于大多数场景的通用提示词'
  },
  {
    id: 'festive',
    name: '节日喜庆',
    template: '生成{festival}节日主题的中国风全家福，{style}风格，喜庆氛围',
    variables: ['festival', 'style'],
    description: '适用于节日场景'
  },
  {
    id: 'traditional',
    name: '传统国风',
    template: '生成传统中国风全家福，{dynasty}朝代风格，{location}场景',
    variables: ['dynasty', 'location'],
    description: '适用于传统国风场景'
  }
];
