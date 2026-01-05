#!/usr/bin/env node

/**
 * API端点快速测试脚本
 * 验证所有关键API端点是否正常工作
 */

const http = require('http');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// 测试用例
const tests = [
  {
    name: '健康检查',
    method: 'GET',
    path: '/health',
    expectedStatus: 200
  },
  {
    name: '获取模板列表',
    method: 'GET',
    path: '/api/templates',
    expectedStatus: 200
  },
  {
    name: '获取单个模板',
    method: 'GET',
    path: '/api/templates/template-1',
    expectedStatus: 200
  }
];

async function testEndpoint(test) {
  return new Promise((resolve) => {
    const url = new URL(test.path, API_BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: test.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const success = res.statusCode === test.expectedStatus;
        resolve({
          name: test.name,
          success,
          status: res.statusCode,
          expectedStatus: test.expectedStatus,
          data: data.substring(0, 100) // 只显示前100个字符
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        name: test.name,
        success: false,
        error: error.message
      });
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('🧪 开始测试API端点...\n');
  console.log(`📍 API Base URL: ${API_BASE_URL}\n`);
  
  let passCount = 0;
  let failCount = 0;
  
  for (const test of tests) {
    const result = await testEndpoint(test);
    
    if (result.success) {
      console.log(`✅ ${result.name}`);
      console.log(`   状态码: ${result.status}`);
      passCount++;
    } else {
      console.log(`❌ ${result.name}`);
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      } else {
        console.log(`   期望状态码: ${result.expectedStatus}, 实际: ${result.status}`);
      }
      failCount++;
    }
    console.log('');
  }
  
  console.log('========================================');
  console.log(`测试完成: ${passCount} 通过, ${failCount} 失败`);
  console.log('========================================\n');
  
  process.exit(failCount > 0 ? 1 : 0);
}

// 运行测试
runTests();
