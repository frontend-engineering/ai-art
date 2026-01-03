/**
 * 数据持久化功能测试脚本
 * 测试生成历史保存、支付记录保存、历史记录查询和定时清理功能
 */

const generationService = require('./services/generationService');
const cleanupService = require('./services/cleanupService');
const userService = require('./services/userService');
const db = require('./db/connection');

async function testDataPersistence() {
  console.log('=== 开始测试数据持久化功能 ===\n');

  try {
    // 测试数据库连接
    console.log('1. 测试数据库连接...');
    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error('数据库连接失败');
    }
    console.log('✓ 数据库连接成功\n');

    // 创建测试用户
    console.log('2. 创建测试用户...');
    const testUserId = 'test-user-' + Date.now();
    const user = await userService.getOrCreateUser(testUserId);
    console.log('✓ 测试用户创建成功:', user.id);
    console.log(`  付费状态: ${user.payment_status}\n`);

    // 测试保存生成历史记录
    console.log('3. 测试保存生成历史记录...');
    const historyData = {
      userId: user.id,
      taskIds: ['task-001', 'task-002', 'task-003', 'task-004'],
      originalImageUrls: [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg'
      ],
      templateUrl: 'https://example.com/template.jpg',
      status: 'pending'
    };
    const savedHistory = await generationService.saveGenerationHistory(historyData);
    console.log('✓ 生成历史记录保存成功:', savedHistory.id);
    console.log(`  用户ID: ${savedHistory.userId}`);
    console.log(`  任务数: ${savedHistory.taskIds.length}`);
    console.log(`  状态: ${savedHistory.status}\n`);

    // 测试更新生成历史记录
    console.log('4. 测试更新生成历史记录...');
    const updatedHistory = await generationService.updateGenerationHistory(savedHistory.id, {
      generatedImageUrls: [
        'https://example.com/result1.jpg',
        'https://example.com/result2.jpg',
        'https://example.com/result3.jpg',
        'https://example.com/result4.jpg'
      ],
      selectedImageUrl: 'https://example.com/result1.jpg',
      status: 'completed'
    });
    console.log('✓ 生成历史记录更新成功');
    console.log(`  生成图片数: ${updatedHistory.generatedImageUrls.length}`);
    console.log(`  选中图片: ${updatedHistory.selectedImageUrl}`);
    console.log(`  状态: ${updatedHistory.status}\n`);

    // 测试根据ID查询历史记录
    console.log('5. 测试根据ID查询历史记录...');
    const historyById = await generationService.getGenerationHistoryById(savedHistory.id);
    console.log('✓ 查询成功');
    console.log(`  记录ID: ${historyById.id}`);
    console.log(`  状态: ${historyById.status}\n`);

    // 测试根据任务ID查询历史记录
    console.log('6. 测试根据任务ID查询历史记录...');
    const historyByTaskId = await generationService.getGenerationHistoryByTaskId('task-001');
    console.log('✓ 查询成功');
    console.log(`  记录ID: ${historyByTaskId.id}`);
    console.log(`  任务ID: ${historyByTaskId.taskIds[0]}\n`);

    // 测试根据用户ID查询历史记录列表
    console.log('7. 测试根据用户ID查询历史记录列表...');
    const historyList = await generationService.getGenerationHistoryByUserId(user.id, 10);
    console.log('✓ 查询成功');
    console.log(`  记录数: ${historyList.length}`);
    if (historyList.length > 0) {
      console.log(`  最新记录ID: ${historyList[0].id}`);
      console.log(`  最新记录状态: ${historyList[0].status}\n`);
    }

    // 测试创建支付订单
    console.log('8. 测试创建支付订单...');
    const { v4: uuidv4 } = require('uuid');
    const orderId = uuidv4();
    const connection = await db.pool.getConnection();
    try {
      await connection.execute(
        `INSERT INTO payment_orders 
        (id, user_id, generation_id, amount, package_type, payment_method, status, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [orderId, user.id, savedHistory.id, 9.9, 'basic', 'wechat', 'pending']
      );
      console.log('✓ 支付订单创建成功:', orderId);
      console.log(`  金额: 9.9元`);
      console.log(`  套餐: basic\n`);
    } finally {
      connection.release();
    }

    // 测试查询支付订单
    console.log('9. 测试查询支付订单...');
    const connection2 = await db.pool.getConnection();
    try {
      const [orderRows] = await connection2.execute(
        'SELECT * FROM payment_orders WHERE id = ?',
        [orderId]
      );
      if (orderRows.length > 0) {
        console.log('✓ 支付订单查询成功');
        console.log(`  订单ID: ${orderRows[0].id}`);
        console.log(`  状态: ${orderRows[0].status}`);
        console.log(`  金额: ${orderRows[0].amount}\n`);
      }
    } finally {
      connection2.release();
    }

    // 测试手动清理功能（使用1天作为测试，避免删除刚创建的记录）
    console.log('10. 测试手动清理功能...');
    console.log('   (使用365天作为测试参数，不会删除刚创建的记录)');
    const deletedCount = await cleanupService.manualCleanup(365);
    console.log(`✓ 清理完成，删除了 ${deletedCount} 条记录\n`);

    // 清理测试数据
    console.log('11. 清理测试数据...');
    const connection3 = await db.pool.getConnection();
    try {
      await connection3.execute('DELETE FROM payment_orders WHERE user_id = ?', [user.id]);
      await connection3.execute('DELETE FROM generation_history WHERE user_id = ?', [user.id]);
      await connection3.execute('DELETE FROM users WHERE id = ?', [user.id]);
      console.log('✓ 测试数据清理完成\n');
    } finally {
      connection3.release();
    }

    console.log('=== 所有测试通过 ✓ ===');
    console.log('\n测试总结:');
    console.log('✓ 数据库连接正常');
    console.log('✓ 生成历史保存功能正常');
    console.log('✓ 生成历史更新功能正常');
    console.log('✓ 历史记录查询功能正常');
    console.log('✓ 支付记录保存功能正常');
    console.log('✓ 定时清理功能正常');

  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await db.closePool();
  }
}

// 运行测试
testDataPersistence();
