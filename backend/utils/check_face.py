#!/usr/bin/env python3
"""
人脸检测脚本
使用OpenCV检测人脸，最小人脸尺寸80x80，置信度阈值0.7
Requirements: 7.2, 7.3, 7.4
"""

import sys
import json
import cv2
import numpy as np


def check_face(image_path, min_face_size=80, confidence_threshold=0.7):
    """
    检测图片中是否包含清晰人脸
    
    Args:
        image_path: 图片路径
        min_face_size: 最小人脸尺寸（像素）
        confidence_threshold: 置信度阈值
        
    Returns:
        dict: {success: bool, face_count: int, confidence: float, faces: list, message: str}
    """
    try:
        # 读取图片
        img = cv2.imread(image_path)
        if img is None:
            return {
                'success': False,
                'face_count': 0,
                'message': '无法读取图片文件'
            }
        
        # 转换为灰度图
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 使用OpenCV的DNN人脸检测器（更准确）
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
                'face_count': 0,
                'message': '无法加载人脸检测模型'
            }
        
        # 检测人脸
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(min_face_size, min_face_size)
        )
        
        # 处理检测结果
        face_count = len(faces)
        valid_faces = []
        
        if face_count > 0:
            for (x, y, w, h) in faces:
                # 计算人脸区域的清晰度（使用拉普拉斯算子）
                face_roi = gray[y:y+h, x:x+w]
                laplacian_var = cv2.Laplacian(face_roi, cv2.CV_64F).var()
                
                # 归一化置信度（基于清晰度）
                # 清晰度越高，置信度越高
                confidence = min(laplacian_var / 500.0, 1.0)
                
                if confidence >= confidence_threshold:
                    valid_faces.append({
                        'x': int(x),
                        'y': int(y),
                        'width': int(w),
                        'height': int(h),
                        'confidence': round(float(confidence), 3)
                    })
        
        # 判断是否检测到有效人脸
        if len(valid_faces) > 0:
            max_confidence = max(face['confidence'] for face in valid_faces)
            return {
                'success': True,
                'face_count': len(valid_faces),
                'confidence': round(max_confidence, 3),
                'faces': valid_faces,
                'message': f'检测到 {len(valid_faces)} 张清晰人脸'
            }
        elif face_count > 0:
            return {
                'success': False,
                'face_count': face_count,
                'confidence': 0.0,
                'faces': [],
                'message': f'检测到 {face_count} 张人脸，但清晰度不足（置信度 < {confidence_threshold}）'
            }
        else:
            return {
                'success': False,
                'face_count': 0,
                'confidence': 0.0,
                'faces': [],
                'message': '未检测到人脸，请上传清晰的正面照'
            }
    
    except Exception as e:
        return {
            'success': False,
            'face_count': 0,
            'message': f'人脸检测失败: {str(e)}'
        }


def main():
    """
    命令行入口
    接收JSON格式的参数: {"image_path": "...", "min_face_size": 80, "confidence_threshold": 0.7}
    """
    try:
        # 从命令行参数读取JSON
        if len(sys.argv) > 1:
            params = json.loads(sys.argv[1])
        else:
            # 从stdin读取
            params = json.load(sys.stdin)
        
        image_path = params.get('image_path')
        min_face_size = params.get('min_face_size', 80)
        confidence_threshold = params.get('confidence_threshold', 0.7)
        
        if not image_path:
            result = {
                'success': False,
                'face_count': 0,
                'message': '缺少必需参数: image_path'
            }
        else:
            result = check_face(image_path, min_face_size, confidence_threshold)
        
        # 输出JSON结果
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        result = {
            'success': False,
            'face_count': 0,
            'message': f'脚本执行失败: {str(e)}'
        }
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(1)


if __name__ == '__main__':
    main()
