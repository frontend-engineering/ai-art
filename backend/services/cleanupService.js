/**
 * 定时清理服务
 * 负责清理超过30天的未付费记录
 */

const cron = require('node-cron');
const generationService = require('./generationService');

/**
 * 启动定时清理任务
 * 每天凌晨2点执行清理任务
 */
function startCleanupSchedule() {
  // 使用cron表达式: 0 2 * * * 表示每天凌晨2点执行
  const task = cron.schedule('0 2 * * *', async () => {
    console.log('开始执行定时清理任务...');
    try {
      const deletedCount = await generationService.deleteOldUnpaidRecords(30);
      console.log(`定时清理任务完成，删除了 ${deletedCount} 条记录`);
    } catch (error) {
      console.error('定时清理任务执行失败:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Shanghai" // 使用中国时区
  });

  console.log('定时清理任务已启动，将在每天凌晨2点执行');
  
  return task;
}

/**
 * 手动执行清理任务
 * @param {number} days 清理超过指定天数的记录(默认30天)
 * @returns {Promise<number>} 删除的记录数
 */
async function manualCleanup(days = 30) {
  console.log(`手动执行清理任务，清理超过 ${days} 天的未付费记录...`);
  try {
    const deletedCount = await generationService.deleteOldUnpaidRecords(days);
    console.log(`手动清理任务完成，删除了 ${deletedCount} 条记录`);
    return deletedCount;
  } catch (error) {
    console.error('手动清理任务执行失败:', error);
    throw error;
  }
}

module.exports = {
  startCleanupSchedule,
  manualCleanup
};
