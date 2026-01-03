#!/bin/bash

# FFmpeg自动检测和安装脚本
# 支持 macOS, Ubuntu/Debian, CentOS/RHEL

set -e

echo "=========================================="
echo "FFmpeg 依赖检测和安装脚本"
echo "=========================================="

# 检测操作系统
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ -f /etc/debian_version ]]; then
        echo "debian"
    elif [[ -f /etc/redhat-release ]]; then
        echo "redhat"
    else
        echo "unknown"
    fi
}

# 检查FFmpeg是否已安装
check_ffmpeg() {
    if command -v ffmpeg &> /dev/null; then
        echo "✓ FFmpeg 已安装"
        ffmpeg -version | head -n 1
        return 0
    else
        echo "✗ FFmpeg 未安装"
        return 1
    fi
}

# 安装FFmpeg - macOS
install_ffmpeg_macos() {
    echo "正在为 macOS 安装 FFmpeg..."
    
    # 检查Homebrew是否安装
    if ! command -v brew &> /dev/null; then
        echo "错误: 未检测到 Homebrew"
        echo "请先安装 Homebrew: https://brew.sh/"
        exit 1
    fi
    
    echo "使用 Homebrew 安装 FFmpeg..."
    brew install ffmpeg
    
    if [ $? -eq 0 ]; then
        echo "✓ FFmpeg 安装成功"
    else
        echo "✗ FFmpeg 安装失败"
        exit 1
    fi
}

# 安装FFmpeg - Ubuntu/Debian
install_ffmpeg_debian() {
    echo "正在为 Ubuntu/Debian 安装 FFmpeg..."
    
    # 检查是否有sudo权限
    if [ "$EUID" -ne 0 ]; then
        echo "需要 sudo 权限来安装 FFmpeg"
        SUDO="sudo"
    else
        SUDO=""
    fi
    
    echo "更新软件包列表..."
    $SUDO apt-get update
    
    echo "安装 FFmpeg..."
    $SUDO apt-get install -y ffmpeg
    
    if [ $? -eq 0 ]; then
        echo "✓ FFmpeg 安装成功"
    else
        echo "✗ FFmpeg 安装失败"
        exit 1
    fi
}

# 安装FFmpeg - CentOS/RHEL
install_ffmpeg_redhat() {
    echo "正在为 CentOS/RHEL 安装 FFmpeg..."
    
    # 检查是否有sudo权限
    if [ "$EUID" -ne 0 ]; then
        echo "需要 sudo 权限来安装 FFmpeg"
        SUDO="sudo"
    else
        SUDO=""
    fi
    
    # 启用EPEL仓库
    echo "启用 EPEL 仓库..."
    $SUDO yum install -y epel-release
    
    # 启用RPM Fusion仓库
    echo "启用 RPM Fusion 仓库..."
    $SUDO yum install -y --nogpgcheck https://download1.rpmfusion.org/free/el/rpmfusion-free-release-$(rpm -E %rhel).noarch.rpm
    
    echo "安装 FFmpeg..."
    $SUDO yum install -y ffmpeg ffmpeg-devel
    
    if [ $? -eq 0 ]; then
        echo "✓ FFmpeg 安装成功"
    else
        echo "✗ FFmpeg 安装失败"
        exit 1
    fi
}

# 主函数
main() {
    echo ""
    echo "步骤 1: 检测 FFmpeg 安装状态"
    echo "----------------------------------------"
    
    if check_ffmpeg; then
        echo ""
        echo "FFmpeg 已经安装，无需重复安装"
        exit 0
    fi
    
    echo ""
    echo "步骤 2: 检测操作系统"
    echo "----------------------------------------"
    
    OS=$(detect_os)
    echo "检测到操作系统: $OS"
    
    echo ""
    echo "步骤 3: 安装 FFmpeg"
    echo "----------------------------------------"
    
    case $OS in
        macos)
            install_ffmpeg_macos
            ;;
        debian)
            install_ffmpeg_debian
            ;;
        redhat)
            install_ffmpeg_redhat
            ;;
        *)
            echo "错误: 不支持的操作系统"
            echo "请手动安装 FFmpeg: https://ffmpeg.org/download.html"
            exit 1
            ;;
    esac
    
    echo ""
    echo "步骤 4: 验证安装"
    echo "----------------------------------------"
    
    if check_ffmpeg; then
        echo ""
        echo "=========================================="
        echo "✓ FFmpeg 安装完成！"
        echo "=========================================="
        exit 0
    else
        echo ""
        echo "=========================================="
        echo "✗ FFmpeg 安装验证失败"
        echo "=========================================="
        exit 1
    fi
}

# 运行主函数
main
