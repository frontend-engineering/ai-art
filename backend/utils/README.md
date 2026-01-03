# Python工具层

本目录包含AI全家福项目的Python工具脚本，用于图片处理、人脸检测和数据导出。

## 安装依赖

```bash
pip install -r requirements.txt
```

或使用虚拟环境：

```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 脚本说明

### 1. compress_image.py - 图片压缩

压缩图片到2MB以内，统一格式为PNG。

**使用方法：**

```bash
python compress_image.py '{"input_path": "input.jpg", "output_path": "output.png", "max_size_mb": 2}'
```

**参数：**
- `input_path`: 输入图片路径（必需）
- `output_path`: 输出图片路径（可选）
- `max_size_mb`: 最大文件大小（MB，默认2）

**返回：**
```json
{
  "success": true,
  "output_path": "output.png",
  "size_kb": 1024.5,
  "original_size": "1920x1080",
  "compressed_size": "1920x1080",
  "message": "图片压缩成功，大小: 1024.50KB"
}
```

### 2. check_face.py - 人脸检测

检测图片中是否包含清晰人脸，最小人脸尺寸80x80，置信度阈值0.7。

**使用方法：**

```bash
python check_face.py '{"image_path": "photo.jpg", "min_face_size": 80, "confidence_threshold": 0.7}'
```

**参数：**
- `image_path`: 图片路径（必需）
- `min_face_size`: 最小人脸尺寸（像素，默认80）
- `confidence_threshold`: 置信度阈值（默认0.7）

**返回：**
```json
{
  "success": true,
  "face_count": 2,
  "confidence": 0.85,
  "faces": [
    {
      "x": 100,
      "y": 150,
      "width": 200,
      "height": 200,
      "confidence": 0.85
    }
  ],
  "message": "检测到 2 张清晰人脸"
}
```

### 3. extract_faces.py - 人脸提取

从照片中提取人脸区域，返回人脸图片和位置信息。

**使用方法：**

```bash
python extract_faces.py '{"image_paths": ["photo1.jpg", "photo2.jpg"], "output_dir": "./faces"}'
```

**参数：**
- `image_paths`: 图片路径列表（必需）
- `output_dir`: 输出目录（可选，不指定则返回base64）
- `min_face_size`: 最小人脸尺寸（像素，默认80）
- `confidence_threshold`: 置信度阈值（默认0.7）

**返回：**
```json
{
  "success": true,
  "faces": [
    {
      "image_url": "./faces/face_0_0.png",
      "bbox": {
        "x": 100,
        "y": 150,
        "width": 200,
        "height": 200
      },
      "confidence": 0.85,
      "source_image": "photo1.jpg"
    }
  ],
  "message": "成功提取 1 张人脸"
}
```

### 4. add_watermark.py - 水印添加

在图片上添加自定义水印，包含二维码和文字。

**使用方法：**

```bash
python add_watermark.py '{"image_path": "photo.jpg", "output_path": "watermarked.jpg", "watermark_text": "AI全家福制作\\n扫码去水印", "qr_url": "https://example.com/pay"}'
```

**参数：**
- `image_path`: 输入图片路径（必需）
- `output_path`: 输出图片路径（可选）
- `watermark_text`: 水印文字（默认"AI全家福制作\n扫码去水印"）
- `qr_url`: 二维码URL（默认"https://your-domain.com/pay"）
- `position`: 水印位置（center/bottom-right，默认center）

**返回：**
```json
{
  "success": true,
  "output_path": "watermarked.jpg",
  "message": "水印添加成功"
}
```

### 5. export_orders_excel.py - 订单Excel导出

将实体产品订单导出为Excel文件。

**使用方法：**

```bash
python export_orders_excel.py '{"orders": [{"order_id": "ORD001", "user_name": "张三", "phone": "13800138000", "address": "北京市朝阳区...", "product_type": "crystal", "image_url": "https://...", "create_time": "2026-01-20T10:00:00"}], "output_path": "orders.xlsx"}'
```

**参数：**
- `orders`: 订单数据列表（必需）
- `output_path`: 输出文件路径（可选，默认自动生成）

**返回：**
```json
{
  "success": true,
  "output_path": "orders.xlsx",
  "order_count": 1,
  "message": "成功导出 1 条订单"
}
```

### 6. convert_to_live_photo.py - Live Photo格式转换

将MP4视频转换为Live Photo格式（HEVC编码的MOV文件）。

**使用方法：**

```bash
python convert_to_live_photo.py '{"video_url": "https://example.com/video.mp4", "output_path": "output.mov"}'
```

**参数：**
- `video_url`: 视频URL或本地路径（必需）
- `output_path`: 输出文件路径（可选，默认自动生成）

**返回：**
```json
{
  "success": true,
  "output_path": "output.mov",
  "file_size": 1234567,
  "message": "Live Photo格式转换成功"
}
```

**依赖：**
- FFmpeg（系统级依赖，需要预先安装）

**安装FFmpeg：**
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg
```

## Node.js集成示例

```javascript
const { spawn } = require('child_process');

function callPythonScript(scriptName, params) {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [
      `./backend/utils/${scriptName}`,
      JSON.stringify(params)
    ]);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Script exited with code ${code}`));
      } else {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse output: ${stdout}`));
        }
      }
    });
    
    // 设置30秒超时
    setTimeout(() => {
      python.kill();
      reject(new Error('Script timeout'));
    }, 30000);
  });
}

// 使用示例
async function compressImage(inputPath) {
  const result = await callPythonScript('compress_image.py', {
    input_path: inputPath,
    max_size_mb: 2
  });
  return result;
}
```

## 注意事项

1. 所有脚本都通过JSON格式进行输入输出，便于Node.js集成
2. 脚本执行失败时会返回`success: false`和错误信息
3. 建议设置30秒超时，避免脚本卡死
4. 人脸检测使用OpenCV的Haar Cascade分类器，准确率较高
5. 水印添加会在图片中心位置添加半透明水印，占图片面积15%-20%
