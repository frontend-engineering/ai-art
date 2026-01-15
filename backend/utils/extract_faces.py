#!/usr/bin/env python3
"""
人脸提取脚本
使用OpenCV提取人脸区域,返回人脸图片和位置信息
Requirements: 9.1
"""

import sys
import json
import cv2
import os
import base64
import requests
from io import BytesIO
from PIL import Image
import numpy as np


def download_image_from_url(url):
    """
    从URL下载图片
    
    Args:
        url: 图片URL
        
    Returns:
        numpy.ndarray: OpenCV图片对象
    """
    try:
        # 验证URL格式
        if not url or not isinstance(url, str):
            raise Exception(f'无效的URL: {url}')
        
        # 确保URL格式正确
        url = url.strip()
        if not url.startswith('http://') and not url.startswith('https://'):
            raise Exception(f'URL必须以http://或https://开头: {url}')
        
        print(f'正在下载图片: {url}', file=sys.stderr)
        
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        # 将响应内容转换为PIL Image
        pil_image = Image.open(BytesIO(response.content))
        
        # 转换为OpenCV格式
        opencv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        return opencv_image
    except requests.exceptions.RequestException as e:
        raise Exception(f'下载图片失败 ({url}): {str(e)}')
    except Exception as e:
        raise Exception(f'处理图片失败 ({url}): {str(e)}')


def extract_faces(image_paths, output_dir=None, min_face_size=80, confidence_threshold=0.7):
    """
    从上传的照片中提取人脸区域
    
    Args:
        image_paths: 图片路径、URL或Base64数据列表
        output_dir: 输出目录(可选)
        min_face_size: 最小人脸尺寸(像素)
        confidence_threshold: 置信度阈值
        
    Returns:
        dict: {success: bool, faces: list, message: str}
    """
    try:
        all_faces = []
        
        # 加载人脸检测模型
        # 尝试多个可能的模型路径
        cascade_paths = [
            'haarcascade_frontalface_default.xml',  # 当前目录
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml' if hasattr(cv2, 'data') else None,  # OpenCV数据目录
            '/usr/share/opencv4/haarcascades/haarcascade_frontalface_default.xml',  # Alpine Linux
            '/usr/local/share/opencv4/haarcascades/haarcascade_frontalface_default.xml',  # 其他Linux
        ]
        
        face_cascade = None
        for path in cascade_paths:
            if path is None:
                continue
            try:
                cascade = cv2.CascadeClassifier(path)
                if not cascade.empty():
                    face_cascade = cascade
                    break
            except:
                continue
        
        if face_cascade is None or face_cascade.empty():
            return {
                'success': False,
                'faces': [],
                'message': '无法加载人脸检测模型'
            }
        
        # 处理每张图片
        for idx, image_path in enumerate(image_paths):
            img = None
            
            # 判断输入类型
            if image_path.startswith('data:image/'):
                # Base64 数据URI格式
                try:
                    # 提取base64数据
                    base64_data = image_path.split(',')[1] if ',' in image_path else image_path
                    img_bytes = base64.b64decode(base64_data)
                    nparr = np.frombuffer(img_bytes, np.uint8)
                    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    print(f'图片{idx + 1}: 从Base64加载成功', file=sys.stderr)
                except Exception as e:
                    print(f'图片{idx + 1}: Base64解码失败: {str(e)}', file=sys.stderr)
                    continue
            elif image_path.startswith('http://') or image_path.startswith('https://'):
                # 从URL下载图片
                try:
                    img = download_image_from_url(image_path)
                    print(f'图片{idx + 1}: 从URL下载成功', file=sys.stderr)
                except Exception as e:
                    print(f'图片{idx + 1}: URL下载失败: {str(e)}', file=sys.stderr)
                    continue
            else:
                # 读取本地图片
                try:
                    img = cv2.imread(image_path)
                    if img is not None:
                        print(f'图片{idx + 1}: 从本地文件加载成功', file=sys.stderr)
                except Exception as e:
                    print(f'图片{idx + 1}: 本地文件读取失败: {str(e)}', file=sys.stderr)
                    continue
            
            if img is None:
                print(f'图片{idx + 1}: 无法加载图片', file=sys.stderr)
                continue
            
            # 转换为灰度图
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # 检测人脸 (使用更宽松的参数)
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.05,
                minNeighbors=3,
                minSize=(min_face_size, min_face_size)
            )
            
            # 提取每个人脸
            for face_idx, (x, y, w, h) in enumerate(faces):
                # 计算清晰度
                face_roi = gray[y:y+h, x:x+w]
                laplacian_var = cv2.Laplacian(face_roi, cv2.CV_64F).var()
                confidence = min(laplacian_var / 500.0, 1.0)
                
                if confidence < confidence_threshold:
                    continue
                
                # 扩展边界(增加10%边距)
                margin = int(w * 0.1)
                x1 = max(0, x - margin)
                y1 = max(0, y - margin)
                x2 = min(img.shape[1], x + w + margin)
                y2 = min(img.shape[0], y + h + margin)
                
                # 提取人脸区域
                face_img = img[y1:y2, x1:x2]
                
                # 保存或编码人脸图片
                if output_dir:
                    # 保存到文件
                    os.makedirs(output_dir, exist_ok=True)
                    face_filename = f"face_{idx}_{face_idx}.png"
                    face_path = os.path.join(output_dir, face_filename)
                    cv2.imwrite(face_path, face_img)
                    
                    face_data = {
                        'image_url': face_path,
                        'bbox': {
                            'x': int(x),
                            'y': int(y),
                            'width': int(w),
                            'height': int(h)
                        },
                        'confidence': round(float(confidence), 3),
                        'source_image': image_path
                    }
                else:
                    # 编码为base64
                    _, buffer = cv2.imencode('.png', face_img)
                    face_base64 = base64.b64encode(buffer).decode('utf-8')
                    
                    face_data = {
                        'image_base64': face_base64,
                        'bbox': {
                            'x': int(x),
                            'y': int(y),
                            'width': int(w),
                            'height': int(h)
                        },
                        'confidence': round(float(confidence), 3),
                        'source_image': image_path
                    }
                
                all_faces.append(face_data)
        
        if len(all_faces) > 0:
            return {
                'success': True,
                'faces': all_faces,
                'message': f'成功提取 {len(all_faces)} 张人脸'
            }
        else:
            return {
                'success': False,
                'faces': [],
                'message': '未检测到清晰的人脸'
            }
    
    except Exception as e:
        return {
            'success': False,
            'faces': [],
            'message': f'人脸提取失败: {str(e)}'
        }


def main():
    """
    命令行入口
    接收JSON格式的参数: {
        "image_paths": ["...", "..."],
        "output_dir": "...",
        "min_face_size": 80,
        "confidence_threshold": 0.7
    }
    """
    try:
        # 从命令行参数读取JSON
        if len(sys.argv) > 1:
            params = json.loads(sys.argv[1])
        else:
            # 从stdin读取
            params = json.load(sys.stdin)
        
        image_paths = params.get('image_paths', [])
        output_dir = params.get('output_dir')
        min_face_size = params.get('min_face_size', 80)
        confidence_threshold = params.get('confidence_threshold', 0.7)
        
        if not image_paths:
            result = {
                'success': False,
                'faces': [],
                'message': '缺少必需参数: image_paths'
            }
        else:
            result = extract_faces(image_paths, output_dir, min_face_size, confidence_threshold)
        
        # 输出JSON结果
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        result = {
            'success': False,
            'faces': [],
            'message': f'脚本执行失败: {str(e)}'
        }
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(1)


if __name__ == '__main__':
    main()
