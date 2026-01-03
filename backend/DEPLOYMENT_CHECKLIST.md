# 部署检查清单

本文档提供完整的部署检查清单，确保所有依赖和配置都已正确设置。

## 📋 部署前检查清单

### 1. 系统依赖

- [ ] **Node.js** (v16+)
  ```bash
  node --version
  ```

- [ ] **Python 3** (v3.8+)
  ```bash
  python3 --version
  ```

- [ ] **FFmpeg** (微动态功能必需)
  ```bash
  ffmpeg -version
  ```
  如未安装，运行：
  ```bash
  bash backend/scripts/install-ffmpeg.sh
  ```

- [ ] **Docker** (数据库服务)
  ```bash
  docker --version
  docker-compose --version
  ```

### 2. Python依赖包

- [ ] 安装Python依赖
  ```bash
  cd backend/utils
  pip3 install -r requirements.txt
  ```

- [ ] 验证关键包
  ```bash
  python3 -c "import PIL; import cv2; import qrcode; import openpyxl"
  ```

### 3. Node.js依赖

- [ ] 前端依赖
  ```bash
  pnpm install
  ```

- [ ] 后端依赖
  ```bash
  cd backend
  pnpm install
  ```

### 4. 环境变量配置

- [ ] 复制配置文件
  ```bash
  cp backend/.env.example backend/.env
  ```

- [ ] 配置火山引擎API密钥
  ```env
  VOLCENGINE_ACCESS_KEY_ID=your_actual_key_id
  VOLCENGINE_SECRET_ACCESS_KEY=your_actual_secret_key
  ```

- [ ] 配置腾讯云OSS
  ```env
  COS_SECRET_ID=your_actual_secret_id
  COS_SECRET_KEY=your_actual_secret_key
  COS_BUCKET=your_bucket_name
  COS_REGION=ap-beijing
  COS_DOMAIN=your_cdn_domain
  ```

- [ ] 配置数据库
  ```env
  DB_HOST=localhost
  DB_PORT=3306
  DB_USER=root
  DB_PASSWORD=your_password
  DB_NAME=ai_family_photo
  ```

- [ ] 配置微信支付（可选）
  ```env
  WECHAT_APPID=your_appid
  WECHAT_MCHID=your_mchid
  WECHAT_SERIAL_NO=your_serial_no
  WECHAT_PRIVATE_KEY=your_private_key
  WECHAT_APIV3_KEY=your_apiv3_key
  ```

### 5. 数据库服务

- [ ] 启动Docker容器
  ```bash
  docker-compose up -d
  ```

- [ ] 验证容器状态
  ```bash
  docker-compose ps
  ```

- [ ] 运行数据库迁移
  ```bash
  cd backend
  pnpm run db:migrate
  ```

- [ ] 测试数据库连接
  ```bash
  pnpm run db:test
  ```

### 6. 依赖检测

- [ ] 运行自动检测脚本
  ```bash
  cd backend
  pnpm run check-deps
  ```

  该脚本会检测：
  - ✓ Node.js
  - ✓ Python 3
  - ✓ FFmpeg
  - ✓ Python依赖包
  - ✓ 环境变量配置

### 7. 功能测试

- [ ] 启动后端服务
  ```bash
  cd backend
  pnpm start
  ```

- [ ] 启动前端服务（新终端）
  ```bash
  pnpm run dev
  ```

- [ ] 测试基础功能
  - [ ] 用户注册/登录
  - [ ] 图片上传
  - [ ] 艺术照生成
  - [ ] 4选1功能
  - [ ] 支付流程

- [ ] 测试微动态功能（需要premium用户）
  - [ ] 视频生成
  - [ ] Live Photo转换
  - [ ] 权限控制

## 🚀 快速部署命令

```bash
# 1. 克隆代码
git clone <repository-url>
cd ai-art

# 2. 安装依赖
pnpm install
cd backend && pnpm install && cd ..

# 3. 安装系统依赖
bash backend/scripts/install-ffmpeg.sh
cd backend/utils && pip3 install -r requirements.txt && cd ../..

# 4. 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env 填入实际配置

# 5. 启动数据库
docker-compose up -d

# 6. 初始化数据库
cd backend && pnpm run db:migrate && cd ..

# 7. 检测依赖
cd backend && pnpm run check-deps && cd ..

# 8. 启动服务
cd backend && pnpm start &
pnpm run dev
```

## ⚠️ 常见问题

### FFmpeg未安装

**症状**：微动态功能报错 "FFmpeg not found"

**解决**：
```bash
bash backend/scripts/install-ffmpeg.sh
```

### Python包缺失

**症状**：图片处理功能报错

**解决**：
```bash
cd backend/utils
pip3 install -r requirements.txt
```

### 数据库连接失败

**症状**：后端启动报错 "ECONNREFUSED"

**解决**：
1. 确认Docker容器运行：`docker-compose ps`
2. 等待MySQL完全启动（约10-15秒）
3. 检查.env配置是否正确

### 火山引擎API调用失败

**症状**：生成功能报错 "API调用未授权"

**解决**：
1. 检查.env中的API密钥是否正确
2. 确认火山引擎账户余额充足
3. 验证API密钥权限

### 微动态功能权限不足

**症状**：用户点击微动态按钮报403错误

**解决**：
1. 确认用户付费状态为'premium'
2. 检查数据库users表的payment_status字段
3. 测试时可手动更新：
   ```sql
   UPDATE users SET payment_status = 'premium' WHERE id = 'user_id';
   ```

## 📊 性能优化建议

### 生产环境配置

1. **启用Redis缓存**
   - 缓存模板列表
   - 缓存用户会话
   - 缓存热点数据

2. **配置CDN加速**
   - 所有图片通过CDN分发
   - 配置腾讯云COS的CDN域名

3. **数据库优化**
   - 添加适当的索引
   - 定期清理过期数据
   - 配置主从复制

4. **监控告警**
   - 配置API调用监控
   - 设置错误率告警
   - 监控服务器资源使用

## 🔒 安全检查

- [ ] 所有API密钥已配置在.env文件中（不提交到Git）
- [ ] 数据库密码已修改（不使用默认密码）
- [ ] 微信支付回调已验证签名
- [ ] 用户上传文件已进行大小和格式限制
- [ ] API接口已添加速率限制

## 📝 部署日志

记录每次部署的关键信息：

| 日期 | 版本 | 部署人 | 变更内容 | 状态 |
|------|------|--------|----------|------|
| 2026-01-03 | v1.0.0 | - | 初始部署 | ✓ |
| | | | 微动态功能上线 | ✓ |

## 🆘 紧急联系

如遇到无法解决的问题，请联系：
- 技术支持：[技术支持邮箱]
- 火山引擎技术支持：[火山引擎工单系统]
- 腾讯云技术支持：[腾讯云工单系统]
