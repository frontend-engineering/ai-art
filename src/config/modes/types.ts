/**
 * 模式配置类型定义
 */

// 模板配置
export interface TemplateConfig {
  id: string;
  name: string;
  url: string;
  category: string;
  tags: string[];
  description?: string;
  thumbnail?: string;
  isDefault?: boolean;
  isPremium?: boolean;
}

// 模板分类
export interface TemplateCategory {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

// API配置
export interface ApiConfig {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  timeout?: number;
  retryCount?: number;
  headers?: Record<string, string>;
}

// 提示词模板
export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  description?: string;
}

// 模式完整配置
export interface ModeConfig {
  // 基础信息
  id: string;
  name: string;
  slug: string;
  description: string;
  
  // 视觉设计
  theme: {
    primaryColor: string;
    secondaryColor: string;
    gradientFrom: string;
    gradientTo: string;
    icon: string;
    backgroundImage?: string;
  };
  
  // 文案内容
  content: {
    slogan: string;
    description: string;
    uploadGuide: string;
    voiceGuide: string;
    buttonText: string;
  };
  
  // 功能配置
  features: {
    maxImages: number;
    minImages: number;
    requireFaceDetection: boolean;
    supportMultipleFaces: boolean;
    allowDragUpload: boolean;
  };
  
  // API配置
  api: {
    generate: ApiConfig;
    getStatus: ApiConfig;
    uploadImage: ApiConfig;
  };
  
  // 模板配置
  templates: {
    categories: TemplateCategory[];
    list: TemplateConfig[];
    defaultTemplateId?: string;
  };
  
  // 提示词配置
  prompts: {
    templates: PromptTemplate[];
    defaultPromptId?: string;
  };
  
  // 模型参数
  modelParams: Record<string, any>;
}
