#!/bin/bash

# 微信支付私钥格式转换工具
# 用途：将 PEM 格式的私钥文件转换为云函数环境变量所需的单行格式

if [ $# -eq 0 ]; then
    echo "用法: ./convert-private-key.sh <私钥文件路径>"
    echo "示例: ./convert-private-key.sh apiclient_key.pem"
    exit 1
fi

PRIVATE_KEY_FILE=$1

if [ ! -f "$PRIVATE_KEY_FILE" ]; then
    echo "错误: 文件不存在: $PRIVATE_KEY_FILE"
    exit 1
fi

echo "正在转换私钥格式..."
echo ""
echo "转换后的私钥（复制下面的内容到云函数环境变量 WECHAT_PRIVATE_KEY）："
echo "================================================================"

# 使用 sed 将换行符替换为 \n
cat "$PRIVATE_KEY_FILE" | sed ':a;N;$!ba;s/\n/\\n/g'

echo ""
echo "================================================================"
echo ""
echo "配置步骤："
echo "1. 复制上面的内容（包括 -----BEGIN PRIVATE KEY----- 和 -----END PRIVATE KEY-----）"
echo "2. 打开微信云开发控制台"
echo "3. 进入：云函数 → wxpayFunctions → 配置 → 环境变量"
echo "4. 添加或编辑 WECHAT_PRIVATE_KEY，粘贴复制的内容"
echo "5. 保存配置"
echo ""
echo "注意：确保粘贴的是单行文本，包含 \\n 作为换行符标记"
