#!/usr/bin/env python3
"""
图片压缩脚本
使用Pillow压缩图片到2MB以内，统一格式为PNG
Requirements: 7.1
"""

import sys
import json
import os
from PIL import Image
import io


def compress_image(input_path, output_path=None, max_size_mb=2):
    """
    压缩图片到指定大小以内
    
    Args:
        input_path: 输入图片路径
        output_path: 输出图片路径（可选，默认覆盖原文件）
        max_size_mb: 最大文件大小（MB）
        
    Returns:
        dict: {success: bool, output_path: str, size_kb: float, message: str}
    """
    try:
        # 打开图片
        img = Image.open(input_path)
        
        # 转换为RGB模式（PNG需要）
        if img.mode in ('RGBA', 'LA', 'P'):
            # 保留透明度
            if img.mode == 'P':
                img = img.convert('RGBA')
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # 如果没有指定输出路径，使用输入路径
        if output_path is None:
            base, _ = os.path.splitext(input_path)
            output_path = f"{base}_compressed.png"
        
        # 目标大小（字节）
        max_size_bytes = max_size_mb * 1024 * 1024
        
        # 获取原始尺寸
        original_width, original_height = img.size
        
        # 初始质量设置
        quality = 95
        scale = 1.0
        
        # 尝试压缩
        while True:
            # 调整尺寸
            if scale < 1.0:
                new_width = int(original_width * scale)
                new_height = int(original_height * scale)
                resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            else:
                resized_img = img
            
            # 保存到内存缓冲区
            buffer = io.BytesIO()
            
            # PNG格式保存
            if resized_img.mode == 'RGBA':
                resized_img.save(buffer, format='PNG', optimize=True)
            else:
                resized_img.save(buffer, format='PNG', optimize=True)
            
            # 获取大小
            size = buffer.tell()
            
            # 如果大小满足要求，保存文件
            if size <= max_size_bytes:
                with open(output_path, 'wb') as f:
                    f.write(buffer.getvalue())
                
                size_kb = size / 1024
                return {
                    'success': True,
                    'output_path': output_path,
                    'size_kb': round(size_kb, 2),
                    'original_size': f"{original_width}x{original_height}",
                    'compressed_size': f"{resized_img.size[0]}x{resized_img.size[1]}",
                    'message': f'图片压缩成功，大小: {size_kb:.2f}KB'
                }
            
            # 如果还是太大，降低质量或缩小尺寸
            if quality > 60:
                quality -= 10
            elif scale > 0.5:
                scale -= 0.1
            else:
                # 已经尽力了，保存当前版本
                with open(output_path, 'wb') as f:
                    f.write(buffer.getvalue())
                
                size_kb = size / 1024
                return {
                    'success': True,
                    'output_path': output_path,
                    'size_kb': round(size_kb, 2),
                    'original_size': f"{original_width}x{original_height}",
                    'compressed_size': f"{resized_img.size[0]}x{resized_img.size[1]}",
                    'message': f'图片已尽可能压缩，当前大小: {size_kb:.2f}KB'
                }
    
    except Exception as e:
        return {
            'success': False,
            'message': f'图片压缩失败: {str(e)}'
        }


def main():
    """
    命令行入口
    接收JSON格式的参数: {"input_path": "...", "output_path": "...", "max_size_mb": 2}
    """
    try:
        # 从命令行参数读取JSON
        if len(sys.argv) > 1:
            params = json.loads(sys.argv[1])
        else:
            # 从stdin读取
            params = json.load(sys.stdin)
        
        input_path = params.get('input_path')
        output_path = params.get('output_path')
        max_size_mb = params.get('max_size_mb', 2)
        
        if not input_path:
            result = {
                'success': False,
                'message': '缺少必需参数: input_path'
            }
        else:
            result = compress_image(input_path, output_path, max_size_mb)
        
        # 输出JSON结果
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        result = {
            'success': False,
            'message': f'脚本执行失败: {str(e)}'
        }
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(1)


if __name__ == '__main__':
    main()
