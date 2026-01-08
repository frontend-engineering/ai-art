/**
 * Python脚本调用桥接模块
 * 统一管理所有Python脚本的调用
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Python 路径优先级：环境变量 > venv > 系统 python3
const getDefaultPythonPath = () => {
  const venvPath = path.join(__dirname, '..', 'venv', 'bin', 'python3');
  if (fs.existsSync(venvPath)) {
    return venvPath;
  }
  return 'python3'; // 回退到系统 Python
};

const PYTHON_PATH = process.env.PYTHON_PATH || getDefaultPythonPath();
const UTILS_PATH = path.join(__dirname, '..', 'utils');

/**
 * 通用Python脚本执行函数
 * 通过 stdin 传递参数，避免命令行参数过长导致 E2BIG 错误
 * @param scriptName 脚本名称
 * @param params 参数对象
 * @param timeout 超时时间(毫秒)
 */
async function executePythonScript(scriptName, params, timeout = 60000) {
  return new Promise((resolve, reject) => {
    try {
      const scriptPath = path.join(UTILS_PATH, scriptName);
      // 不再通过命令行参数传递，改用 stdin
      const pythonProcess = spawn(PYTHON_PATH, [scriptPath]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python脚本 ${scriptName} 执行失败:`, stderr);
          reject(new Error(`Python脚本执行失败: ${stderr}`));
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (parseError) {
          console.error('解析Python脚本输出失败:', parseError);
          reject(new Error(`解析Python脚本输出失败: ${parseError.message}`));
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.error(`Python进程错误 ${scriptName}:`, error);
        reject(error);
      });
      
      const timeoutId = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error(`Python脚本 ${scriptName} 执行超时`));
      }, timeout);
      
      pythonProcess.on('close', () => clearTimeout(timeoutId));
      
      // 通过 stdin 传递参数（避免 E2BIG 错误）
      pythonProcess.stdin.write(JSON.stringify(params));
      pythonProcess.stdin.end();
      
    } catch (error) {
      console.error(`调用Python脚本 ${scriptName} 失败:`, error);
      reject(error);
    }
  });
}

/**
 * 提取人脸
 * @param imageUrls 图片URL数组
 */
async function extractFaces(imageUrls) {
  const params = {
    image_paths: imageUrls,
    min_face_size: 50,
    confidence_threshold: 0.3
  };
  
  const result = await executePythonScript('extract_faces.py', params, 60000);
  return result;
}

/**
 * 添加水印
 * @param imagePath 图片路径
 * @param outputPath 输出路径
 * @param watermarkText 水印文字
 * @param qrUrl 二维码URL
 * @param position 水印位置
 */
async function addWatermark(imagePath, outputPath = null, watermarkText = 'AI全家福制作\n扫码去水印', qrUrl = 'https://your-domain.com/pay', position = 'center') {
  const params = {
    image_path: imagePath,
    output_path: outputPath,
    watermark_text: watermarkText,
    qr_url: qrUrl,
    position: position
  };
  
  const result = await executePythonScript('add_watermark.py', params, 30000);
  
  if (!result.success) {
    throw new Error(result.message || '水印添加失败');
  }
  
  return result;
}

/**
 * 转换为Live Photo格式
 * @param videoUrl 视频URL
 * @param outputPath 输出路径
 */
async function convertToLivePhoto(videoUrl, outputPath = null) {
  const params = {
    video_url: videoUrl,
    output_path: outputPath
  };
  
  const result = await executePythonScript('convert_to_live_photo.py', params, 60000);
  
  if (!result.success) {
    throw new Error(result.message || 'Live Photo转换失败');
  }
  
  return result;
}

/**
 * 导出订单Excel
 * @param orders 订单数据数组
 * @param outputPath 输出路径
 */
async function exportOrdersExcel(orders, outputPath = null) {
  const params = {
    orders: orders,
    output_path: outputPath
  };
  
  const result = await executePythonScript('export_orders_excel.py', params, 30000);
  
  if (!result.success) {
    throw new Error(result.message || 'Excel导出失败');
  }
  
  return result;
}

module.exports = {
  executePythonScript,
  extractFaces,
  addWatermark,
  convertToLivePhoto,
  exportOrdersExcel
};
