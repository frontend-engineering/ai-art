#!/usr/bin/env node

/**
 * 依赖检测脚本
 * 在应用启动前检查所有必需的系统依赖
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('系统依赖检测');
console.log('========================================\n');

let allDependenciesOk = true;

/**
 * 检查命令是否存在
 */
function checkCommand(command, name, installInstructions) {
  try {
    execSync(`command -v ${command}`, { stdio: 'pipe' });
    console.log(`✓ ${name} 已安装`);
    
    // 显示版本信息
    try {
      const version = execSync(`${command} -version 2>&1 | head -n 1`, { 
        encoding: 'utf-8',
        stdio: 'pipe'
      }).trim();
      console.log(`  版本: ${version}`);
    } catch (e) {
      // 忽略版本检测错误
    }
    
    return true;
  } catch (error) {
    console.log(`✗ ${name} 未安装`);
    console.log(`  安装说明: ${installInstructions}`);
    allDependenciesOk = false;
    return false;
  }
}

/**
 * 检查Python包
 */
function checkPythonPackage(packageName) {
  try {
    execSync(`python3 -c "import ${packageName}"`, { stdio: 'pipe' });
    console.log(`✓ Python包 ${packageName} 已安装`);
    return true;
  } catch (error) {
    console.log(`✗ Python包 ${packageName} 未安装`);
    console.log(`  安装命令: pip3 install ${packageName}`);
    allDependenciesOk = false;
    return false;
  }
}

/**
 * 检查环境变量
 */
function checkEnvVar(varName, description) {
  if (process.env[varName]) {
    console.log(`✓ 环境变量 ${varName} 已配置`);
    return true;
  } else {
    console.log(`✗ 环境变量 ${varName} 未配置`);
    console.log(`  说明: ${description}`);
    allDependenciesOk = false;
    return false;
  }
}

/**
 * 检查.env文件
 */
function checkEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    console.log(`✓ .env 配置文件存在`);
    return true;
  } else {
    console.log(`✗ .env 配置文件不存在`);
    console.log(`  请复制 .env.example 为 .env 并配置相关参数`);
    allDependenciesOk = false;
    return false;
  }
}

// 主检测流程
console.log('步骤 1: 检测系统命令');
console.log('----------------------------------------');

// 检查Node.js
checkCommand('node', 'Node.js', '请访问 https://nodejs.org/ 安装');

// 检查Python3
checkCommand('python3', 'Python 3', '请访问 https://www.python.org/ 安装');

// 检查FFmpeg（微动态功能必需）
const ffmpegInstalled = checkCommand(
  'ffmpeg', 
  'FFmpeg (微动态功能必需)', 
  '运行: bash backend/scripts/install-ffmpeg.sh'
);

console.log('\n步骤 2: 检测Python依赖包');
console.log('----------------------------------------');

// 检查Python包
const pythonPackages = [
  'PIL',      // Pillow
  'cv2',      // OpenCV
  'qrcode',   // QR Code
  'openpyxl'  // Excel
];

pythonPackages.forEach(pkg => {
  checkPythonPackage(pkg);
});

console.log('\n步骤 3: 检测配置文件');
console.log('----------------------------------------');

// 检查.env文件
checkEnvFile();

// 加载.env文件
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('\n步骤 4: 检测环境变量');
console.log('----------------------------------------');

// 检查必需的环境变量
checkEnvVar('VOLCENGINE_ACCESS_KEY_ID', '火山引擎API访问密钥ID');
checkEnvVar('VOLCENGINE_SECRET_ACCESS_KEY', '火山引擎API访问密钥');
checkEnvVar('COS_SECRET_ID', '腾讯云COS密钥ID');
checkEnvVar('COS_SECRET_KEY', '腾讯云COS密钥');
checkEnvVar('COS_BUCKET', '腾讯云COS存储桶名称');
checkEnvVar('COS_REGION', '腾讯云COS区域');

console.log('\n========================================');

if (allDependenciesOk) {
  console.log('✓ 所有依赖检测通过！');
  console.log('========================================\n');
  process.exit(0);
} else {
  console.log('✗ 部分依赖缺失，请按照上述说明安装');
  console.log('========================================\n');
  
  if (!ffmpegInstalled) {
    console.log('快速安装 FFmpeg:');
    console.log('  bash backend/scripts/install-ffmpeg.sh\n');
  }
  
  process.exit(1);
}
