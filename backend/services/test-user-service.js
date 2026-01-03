/**
 * 手动测试用户服务
 * 运行: node backend/services/test-user-service.js
 */

const userService = require('./userService');
const { testConnection, closePool } = require('../db/connection');

async function runTests() {
  console.log('=== 用户服务手动测试 ===\n');

  try {
    // 1. 测试数据库连接
    console.log('1. 测试数据库连接...');
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ 数据库连接失败,请检查配置');
      process.exit(1);
    }
    console.log('✅ 数据库连接成功\n');

    // 2. 创建新用户
    console.log('2. 创建新用户...');
    const newUser = await userService.createUser();
    console.log('✅ 用户创建成功:', {
      id: newUser.id,
      payment_status: newUser.payment_status,
      regenerate_count: newUser.regenerate_count
    });
    console.log('');

    const testUserId = newUser.id;

    // 3. 获取用户信息
    console.log('3. 获取用户信息...');
    const user = await userService.getUserById(testUserId);
    console.log('✅ 用户信息获取成功:', {
      id: user.id,
      payment_status: user.payment_status,
      regenerate_count: user.regenerate_count
    });
    console.log('');

    // 4. 更新付费状态
    console.log('4. 更新付费状态为 basic...');
    const updatedUser = await userService.updateUserPaymentStatus(testUserId, 'basic');
    console.log('✅ 付费状态更新成功:', {
      id: updatedUser.id,
      payment_status: updatedUser.payment_status
    });
    console.log('');

    // 5. 减少重生成次数
    console.log('5. 减少重生成次数...');
    const decrementedUser = await userService.decrementRegenerateCount(testUserId);
    console.log('✅ 重生成次数减少成功:', {
      id: decrementedUser.id,
      regenerate_count: decrementedUser.regenerate_count
    });
    console.log('');

    // 6. 测试 getOrCreateUser
    console.log('6. 测试 getOrCreateUser (已存在的用户)...');
    const existingUser = await userService.getOrCreateUser(testUserId);
    console.log('✅ 返回已存在的用户:', {
      id: existingUser.id,
      payment_status: existingUser.payment_status
    });
    console.log('');

    console.log('7. 测试 getOrCreateUser (新用户)...');
    const newUserId = 'test-manual-user-' + Date.now();
    const createdUser = await userService.getOrCreateUser(newUserId);
    console.log('✅ 创建新用户成功:', {
      id: createdUser.id,
      payment_status: createdUser.payment_status
    });
    console.log('');

    console.log('=== 所有测试通过 ✅ ===');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    // 关闭数据库连接池
    await closePool();
    process.exit(0);
  }
}

// 运行测试
runTests();
