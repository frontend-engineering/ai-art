/**
 * 后端模式配置
 * 与前端模式配置对应，用于验证和处理不同模式的请求
 */

const PUZZLE_MODE_CONFIG = {
  id: 'puzzle',
  name: '时空拼图',
  
  // 模型参数
  modelParams: {
    mode: 'puzzle',
    sequential_image_generation: 'auto',
    max_images: 4,
    force_single: false,
    scale: 0.8
  },
  
  // 验证规则
  validation: {
    minImages: 2,
    maxImages: 5,
    requireFaceDetection: true,
    supportMultipleFaces: true
  },
  
  // 提示词模板
  promptTemplates: {
    default: '生成中国风全家福艺术照，多人合影',
    festive: '生成节日主题的中国风全家福，喜庆氛围',
    traditional: '生成传统中国风全家福'
  }
};

const TRANSFORM_MODE_CONFIG = {
  id: 'transform',
  name: '富贵变身',
  
  // 模型参数
  modelParams: {
    mode: 'transform',
    background_replacement: true,
    preserve_people: true,
    force_single: false,
    scale: 0.8
  },
  
  // 验证规则
  validation: {
    minImages: 1,
    maxImages: 1,
    requireFaceDetection: true,
    supportMultipleFaces: true
  },
  
  // 提示词模板 - 精细优化的富贵变身场景
  promptTemplates: {
    default: '保持照片中所有人物的面部特征、表情、姿态和服装完全不变，仅替换背景为金碧辉煌的中国皇家宫殿大殿，朱红色巨大立柱，金色龙纹雕刻，黄色琉璃瓦屋顶，汉白玉台阶，宫灯高悬，祥云缭绕，阳光透过雕花窗棂洒落，营造富贵尊荣的皇家气派，超高清8K写实摄影风格，专业影棚打光，细节丰富，色彩饱和',
    
    luxury: '完整保留人物的面部细节、表情神态、肢体动作和原始服装，精准替换背景为奢华的紫禁城太和殿内景，红墙金瓦，雕梁画栋，蟠龙金柱，九龙宝座，珐琅彩瓷器陈设，丝绸帷幔，宫廷吊灯，汉白玉地砖，金色祥云图案，富丽堂皇的皇家宫廷氛围，电影级4K超高清画质，专业摄影构图，光影层次分明，细腻逼真',
    
    natural: '精确保持人物的面容、表情、姿势和穿着完全不变，仅更换背景为中国苏州园林经典景致，精致的亭台楼阁，九曲回廊，拱桥流水，翠竹摇曳，假山奇石，荷花池塘，垂柳依依，白墙黛瓦，雕花窗格，诗情画意的江南水乡意境，春日暖阳，薄雾轻纱，高清写实摄影风格，自然光线柔和，色调清新雅致，细节精美',
    
    festive: '严格保持人物的面部特征、笑容、动作和原有服饰不变，仅替换背景为喜庆热闹的中国传统春节场景，大红灯笼高高挂起，金色中国结装饰，烫金福字窗花，鞭炮串串，梅花绽放，祥云金龙图案，红色绸缎飘带，金色宫灯照耀，喜庆的红金配色，浓郁的节日氛围，超高清细腻画质，色彩鲜艳饱满，光影温暖明亮，细节丰富生动'
  }
};

// 所有模式配置
const MODES = {
  puzzle: PUZZLE_MODE_CONFIG,
  transform: TRANSFORM_MODE_CONFIG
};

/**
 * 根据ID获取模式配置
 */
function getModeConfig(modeId) {
  return MODES[modeId] || null;
}

/**
 * 验证模式请求参数
 */
function validateModeRequest(modeId, imageUrls) {
  const config = getModeConfig(modeId);
  
  if (!config) {
    return { valid: false, error: '无效的模式' };
  }
  
  if (!imageUrls || !Array.isArray(imageUrls)) {
    return { valid: false, error: '图片URL必须是数组' };
  }
  
  if (imageUrls.length < config.validation.minImages) {
    return { 
      valid: false, 
      error: `${config.name}至少需要${config.validation.minImages}张图片` 
    };
  }
  
  if (imageUrls.length > config.validation.maxImages) {
    return { 
      valid: false, 
      error: `${config.name}最多支持${config.validation.maxImages}张图片` 
    };
  }
  
  return { valid: true };
}

/**
 * 获取模式的模型参数
 */
function getModeModelParams(modeId) {
  const config = getModeConfig(modeId);
  return config ? config.modelParams : {};
}

/**
 * 获取模式的提示词模板
 */
function getModePromptTemplate(modeId, templateId = 'default') {
  const config = getModeConfig(modeId);
  if (!config) return '';
  
  return config.promptTemplates[templateId] || config.promptTemplates.default || '';
}

module.exports = {
  MODES,
  getModeConfig,
  validateModeRequest,
  getModeModelParams,
  getModePromptTemplate
};
