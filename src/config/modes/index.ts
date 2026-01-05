/**
 * 模式注册中心
 * 统一管理所有模式配置，提供便捷的访问方法
 */

import { ModeConfig, TemplateConfig, PromptTemplate } from './types';
import { PUZZLE_MODE } from './puzzle';
import { TRANSFORM_MODE } from './transform';

// 导出具体模式配置
export { PUZZLE_MODE, TRANSFORM_MODE };

// 所有模式配置映射
export const MODES: Record<string, ModeConfig> = {
  puzzle: PUZZLE_MODE,
  transform: TRANSFORM_MODE,
};

/**
 * 根据ID获取模式配置
 */
export function getModeConfig(modeId: string): ModeConfig | null {
  return MODES[modeId] || null;
}

/**
 * 根据slug获取模式配置
 */
export function getModeConfigBySlug(slug: string): ModeConfig | null {
  return Object.values(MODES).find(mode => mode.slug === slug) || null;
}

/**
 * 获取所有模式列表
 */
export function getAllModes(): ModeConfig[] {
  return Object.values(MODES);
}

/**
 * 获取模式的模板列表
 */
export function getModeTemplates(modeId: string): TemplateConfig[] {
  const mode = getModeConfig(modeId);
  return mode?.templates.list || [];
}

/**
 * 获取模式的模板分类
 */
export function getModeTemplateCategories(modeId: string) {
  const mode = getModeConfig(modeId);
  return mode?.templates.categories || [];
}

/**
 * 根据分类筛选模板
 */
export function getTemplatesByCategory(modeId: string, categoryId: string): TemplateConfig[] {
  const templates = getModeTemplates(modeId);
  return templates.filter(t => t.category === categoryId);
}

/**
 * 根据标签筛选模板
 */
export function getTemplatesByTag(modeId: string, tag: string): TemplateConfig[] {
  const templates = getModeTemplates(modeId);
  return templates.filter(t => t.tags.includes(tag));
}

/**
 * 获取默认模板
 */
export function getDefaultTemplate(modeId: string): TemplateConfig | null {
  const mode = getModeConfig(modeId);
  if (!mode) return null;
  
  const defaultId = mode.templates.defaultTemplateId;
  return mode.templates.list.find(t => t.id === defaultId) || mode.templates.list[0] || null;
}

/**
 * 根据ID获取模板
 */
export function getTemplateById(modeId: string, templateId: string): TemplateConfig | null {
  const templates = getModeTemplates(modeId);
  return templates.find(t => t.id === templateId) || null;
}

/**
 * 获取模式的提示词模板列表
 */
export function getModePrompts(modeId: string): PromptTemplate[] {
  const mode = getModeConfig(modeId);
  return mode?.prompts.templates || [];
}

/**
 * 获取默认提示词
 */
export function getDefaultPrompt(modeId: string): PromptTemplate | null {
  const mode = getModeConfig(modeId);
  if (!mode) return null;
  
  const defaultId = mode.prompts.defaultPromptId;
  return mode.prompts.templates.find(p => p.id === defaultId) || mode.prompts.templates[0] || null;
}

/**
 * 根据ID获取提示词模板
 */
export function getPromptById(modeId: string, promptId: string): PromptTemplate | null {
  const prompts = getModePrompts(modeId);
  return prompts.find(p => p.id === promptId) || null;
}

/**
 * 构建提示词（替换变量）
 */
export function buildPrompt(modeId: string, promptId: string, variables: Record<string, string>): string {
  const prompt = getPromptById(modeId, promptId);
  
  if (!prompt) return '';
  
  let result = prompt.template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  
  return result;
}

/**
 * 获取模式的API配置
 */
export function getModeApiConfig(modeId: string, apiName: 'generate' | 'getStatus' | 'uploadImage') {
  const mode = getModeConfig(modeId);
  return mode?.api[apiName] || null;
}

/**
 * 获取模式的模型参数
 */
export function getModeModelParams(modeId: string): Record<string, any> {
  const mode = getModeConfig(modeId);
  return mode?.modelParams || {};
}

// 导出类型
export * from './types';
