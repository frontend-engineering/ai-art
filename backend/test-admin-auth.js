/**
 * 测试管理员认证API
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testLogin() {
  console.log('🧪 测试管理员登录API...\n');
  
  try {
    const response = await axios.post(`${BASE_URL}/admin-api/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });
    
    console.log('✅ 登录成功!');
    console.log('Token:', response.data.data.token.substring(0, 20) + '...');
    console.log('User:', response.data.data.user);
    
    return response.data.data.token;
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data || error.message);
    return null;
  }
}

async function testGetCurrentUser(token) {
  console.log('\n🧪 测试获取当前用户信息API...\n');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin-api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('✅ 获取用户信息成功!');
    console.log('User:', response.data.data);
  } catch (error) {
    console.error('❌ 获取用户信息失败:', error.response?.data || error.message);
  }
}

async function testLogout(token) {
  console.log('\n🧪 测试登出API...\n');
  
  try {
    const response = await axios.post(`${BASE_URL}/admin-api/auth/logout`, {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('✅ 登出成功!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('❌ 登出失败:', error.response?.data || error.message);
  }
}

async function runTests() {
  const token = await testLogin();
  
  if (token) {
    await testGetCurrentUser(token);
    await testLogout(token);
  }
  
  console.log('\n✅ 所有测试完成!\n');
}

runTests();
