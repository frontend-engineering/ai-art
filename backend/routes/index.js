/**
 * 路由聚合模块
 * 统一导出所有路由
 */

const userRoutes = require('./userRoutes');
const taskRoutes = require('./taskRoutes');
const paymentRoutes = require('./paymentRoutes');
const historyRoutes = require('./historyRoutes');
const productRoutes = require('./productRoutes');
const videoRoutes = require('./videoRoutes');
const greetingCardRoutes = require('./greetingCardRoutes');
const templateRoutes = require('./templateRoutes');
const uploadRoutes = require('./uploadRoutes');
const adminRoutes = require('./adminRoutes');
const wechatRoutes = require('./wechatRoutes');
const usageRoutes = require('./usageRoutes');
const inviteRoutes = require('./inviteRoutes');

/**
 * 注册所有路由
 * @param app Express应用实例
 */
function registerRoutes(app) {
  // 用户管理
  app.use('/api/user', userRoutes);
  
  // 任务管理 (包含生成艺术照)
  app.use('/api', taskRoutes);
  
  // 支付系统
  app.use('/api/payment', paymentRoutes);
  
  // 历史记录
  app.use('/api/history', historyRoutes);
  
  // 产品订单
  app.use('/api/product-order', productRoutes);
  
  // 视频生成
  app.use('/api', videoRoutes);
  
  // 贺卡管理
  app.use('/api/greeting-card', greetingCardRoutes);
  
  // 模板管理
  app.use('/api/templates', templateRoutes);
  
  // 上传相关
  app.use('/api', uploadRoutes);
  
  // 管理员接口
  app.use('/api/admin', adminRoutes);
  
  // 日志查询接口 (独立路径)
  app.use('/api/logs', adminRoutes);
  app.use('/api/error-logs', adminRoutes);
  
  // 微信小程序接口
  app.use('/api/wechat', wechatRoutes);
  
  // 使用次数管理
  app.use('/api/usage', usageRoutes);
  
  // 邀请系统
  app.use('/api/invite', inviteRoutes);
}

module.exports = {
  registerRoutes,
  userRoutes,
  taskRoutes,
  paymentRoutes,
  historyRoutes,
  productRoutes,
  videoRoutes,
  greetingCardRoutes,
  templateRoutes,
  uploadRoutes,
  adminRoutes,
  wechatRoutes,
  usageRoutes,
  inviteRoutes
};
