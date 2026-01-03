/**
 * 支付系统测试脚本
 * 用于测试支付系统的基本功能
 */

require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

/**
 * 测试创建支付订单
 */
async function testCreatePaymentOrder() {
  console.log('\n=== 测试创建支付订单 ===');
  
  try {
    // 生成测试用户ID和生成记录ID
    const userId = uuidv4();
    const generationId = uuidv4();
    
    // 先创建用户
    console.log('1. 创建测试用户...');
    const userResponse = await fetch(`${API_BASE_URL}/api/user/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });
    
    if (!userResponse.ok) {
      throw new Error('创建用户失败');
    }
    
    const userData = await userResponse.json();
    console.log('✓ 用户创建成功:', userData.data.id);
    
    // 创建支付订单
    console.log('\n2. 创建支付订单...');
    const orderResponse = await fetch(`${API_BASE_URL}/api/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        generationId: generationId,
        packageType: 'basic'
      }),
    });
    
    if (!orderResponse.ok) {
      const error = await orderResponse.json();
      throw new Error(error.message || '创建订单失败');
    }
    
    const orderData = await orderResponse.json();
    console.log('✓ 订单创建成功:');
    console.log('  - 订单ID:', orderData.data.orderId);
    console.log('  - 金额:', orderData.data.amount);
    console.log('  - 套餐:', orderData.data.packageType);
    console.log('  - 状态:', orderData.data.status);
    
    return {
      userId,
      orderId: orderData.data.orderId
    };
  } catch (error) {
    console.error('✗ 测试失败:', error.message);
    throw error;
  }
}

/**
 * 测试查询订单状态
 */
async function testGetOrderStatus(orderId) {
  console.log('\n=== 测试查询订单状态 ===');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/payment/order/${orderId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '查询订单失败');
    }
    
    const data = await response.json();
    console.log('✓ 订单查询成功:');
    console.log('  - 订单ID:', data.data.orderId);
    console.log('  - 用户ID:', data.data.userId);
    console.log('  - 金额:', data.data.amount);
    console.log('  - 状态:', data.data.status);
    console.log('  - 创建时间:', data.data.createdAt);
    
    return data.data;
  } catch (error) {
    console.error('✗ 测试失败:', error.message);
    throw error;
  }
}

/**
 * 测试更新订单状态
 */
async function testUpdateOrderStatus(orderId, userId) {
  console.log('\n=== 测试更新订单状态 ===');
  
  try {
    // 模拟支付成功，更新订单状态
    console.log('1. 更新订单状态为 paid...');
    const response = await fetch(`${API_BASE_URL}/api/payment/order/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'paid',
        transactionId: 'test_transaction_' + Date.now()
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '更新订单状态失败');
    }
    
    const data = await response.json();
    console.log('✓ 订单状态更新成功:', data.data.status);
    
    // 验证用户付费状态是否更新
    console.log('\n2. 验证用户付费状态...');
    const userResponse = await fetch(`${API_BASE_URL}/api/user/${userId}`);
    
    if (!userResponse.ok) {
      throw new Error('获取用户信息失败');
    }
    
    const userData = await userResponse.json();
    console.log('✓ 用户付费状态:', userData.data.payment_status);
    
    if (userData.data.payment_status === 'basic') {
      console.log('✓ 用户付费状态更新成功！');
    } else {
      console.log('✗ 用户付费状态未更新');
    }
    
    return data.data;
  } catch (error) {
    console.error('✗ 测试失败:', error.message);
    throw error;
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('开始测试支付系统...');
  console.log('API Base URL:', API_BASE_URL);
  
  try {
    // 测试1: 创建支付订单
    const { userId, orderId } = await testCreatePaymentOrder();
    
    // 测试2: 查询订单状态
    await testGetOrderStatus(orderId);
    
    // 测试3: 更新订单状态
    await testUpdateOrderStatus(orderId, userId);
    
    // 测试4: 再次查询订单状态
    await testGetOrderStatus(orderId);
    
    console.log('\n=== 所有测试通过 ✓ ===\n');
  } catch (error) {
    console.error('\n=== 测试失败 ✗ ===');
    console.error('错误:', error.message);
    process.exit(1);
  }
}

// 运行测试
runAllTests();
