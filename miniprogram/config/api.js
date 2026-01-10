/**
 * API 配置文件
 * 
 * 云托管服务地址配置
 * 方便后续替换为自定义域名
 */

// ============================================
// 域名配置说明：
// 1. 开发/测试环境：使用云托管默认域名
// 2. 生产环境：替换为自定义域名
// ============================================

// 云托管服务域名配置
const DOMAINS = {
  // 云托管默认测试域名（无需备案，可直接使用）
  cloudbase: 'https://express-215695-6-1317586939.sh.run.tcloudbase.com',
  
  // 自定义域名（需要备案后配置）
  // 配置步骤：
  // 1. 在云托管控制台 -> 服务设置 -> 自定义域名 中添加
  // 2. 配置 DNS 解析指向云托管
  // 3. 将下面的值替换为你的自定义域名
  custom: 'https://tcb.webinfra.cloud'
};

// 当前使用的域名（切换时只需修改这里）
// 'cloudbase' - 使用云托管默认域名
// 'custom' - 使用自定义域名
const CURRENT_DOMAIN = 'cloudbase';

// 导出的 API 基础地址
const API_BASE_URL = DOMAINS[CURRENT_DOMAIN];

// CloudBase 环境配置
const CLOUDBASE_CONFIG = {
  // 云开发环境 ID
  env: 'test-1g71tc7eb37627e2',
  // 云托管服务名称
  serviceName: 'express',
  // 地域
  region: 'ap-shanghai'
};

// 导出配置
module.exports = {
  API_BASE_URL,
  DOMAINS,
  CURRENT_DOMAIN,
  CLOUDBASE_CONFIG
};
