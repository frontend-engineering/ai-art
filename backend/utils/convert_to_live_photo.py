#!/usr/bin/env python3
"""
Live Photo格式转换脚本
将MP4视频转换为Live Photo格式(HEVC编码的MOV文件)
"""

import sys
import json
import subprocess
import os
import tempfile
import urllib.request

def convert_to_live_photo(video_url, output_path=None):
    """
    将MP4视频转换为Live Photo格式
    
    Args:
        video_url: 视频URL或本地路径
        output_path: 输出文件路径(可选)
    
    Returns:
        dict: 包含success状态和输出文件路径的字典
    """
    try:
        # 如果是URL，先下载到临时文件
        if video_url.startswith('http://') or video_url.startswith('https://'):
            temp_input = tempfile.NamedTemporaryFile(suffix='.mp4', delete=False)
            temp_input.close()
            
            print(f"正在下载视频: {video_url}", file=sys.stderr)
            urllib.request.urlretrieve(video_url, temp_input.name)
            input_path = temp_input.name
        else:
            input_path = video_url
        
        # 检查输入文件是否存在
        if not os.path.exists(input_path):
            return {
                'success': False,
                'message': f'输入文件不存在: {input_path}'
            }
        
        # 如果没有指定输出路径，使用临时文件
        if output_path is None:
            temp_output = tempfile.NamedTemporaryFile(suffix='.mov', delete=False)
            temp_output.close()
            output_path = temp_output.name
        
        # 使用FFmpeg转换为Live Photo格式
        # -c:v hevc: 使用HEVC编码
        # -tag:v hvc1: 设置视频标签为hvc1(兼容iOS)
        # -pix_fmt yuv420p: 设置像素格式
        # -movflags +faststart: 优化流式播放
        ffmpeg_command = [
            'ffmpeg',
            '-i', input_path,
            '-c:v', 'hevc',
            '-tag:v', 'hvc1',
            '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart',
            '-y',  # 覆盖输出文件
            output_path
        ]
        
        print(f"正在转换视频格式: {' '.join(ffmpeg_command)}", file=sys.stderr)
        
        # 执行FFmpeg命令
        result = subprocess.run(
            ffmpeg_command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=60  # 60秒超时
        )
        
        if result.returncode != 0:
            error_message = result.stderr.decode('utf-8', errors='ignore')
            return {
                'success': False,
                'message': f'FFmpeg转换失败: {error_message}'
            }
        
        # 检查输出文件是否存在
        if not os.path.exists(output_path):
            return {
                'success': False,
                'message': '转换后的文件不存在'
            }
        
        # 获取文件大小
        file_size = os.path.getsize(output_path)
        
        # 清理临时输入文件
        if video_url.startswith('http://') or video_url.startswith('https://'):
            try:
                os.unlink(input_path)
            except:
                pass
        
        return {
            'success': True,
            'output_path': output_path,
            'file_size': file_size,
            'message': 'Live Photo格式转换成功'
        }
        
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'message': 'FFmpeg转换超时'
        }
    except Exception as e:
        return {
            'success': False,
            'message': f'转换过程中发生错误: {str(e)}'
        }

def main():
    """主函数"""
    try:
        # 从命令行参数读取JSON，如果没有则从stdin读取
        if len(sys.argv) > 1:
            params = json.loads(sys.argv[1])
        else:
            params = json.load(sys.stdin)
        
        video_url = params.get('video_url')
        output_path = params.get('output_path')
        
        if not video_url:
            print(json.dumps({
                'success': False,
                'message': '缺少video_url参数'
            }))
            sys.exit(1)
        
        # 执行转换
        result = convert_to_live_photo(video_url, output_path)
        
        # 输出结果
        print(json.dumps(result))
        
    except json.JSONDecodeError:
        print(json.dumps({
            'success': False,
            'message': '参数格式错误，需要JSON格式'
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            'success': False,
            'message': f'执行失败: {str(e)}'
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
