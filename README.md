# AI全家福·团圆照相馆 🏮

> 这个春节,让爱没有距离。

## 项目简介

AI全家福是一个基于AI技术的全家福照片生成应用,支持多种模式:
- **时空拼图**: 将分散各地的家人照片合成为完美全家福
- **富贵变身**: 一键更换照片背景,让普通照片变身豪门大片

## 快速开始

### 环境要求
- Node.js >= 18
- pnpm >= 8
- Docker & Docker Compose

### 安装依赖

```bash
# 前端依赖
pnpm install

# 后端依赖
cd backend && pnpm install

# 管理后台依赖
cd admin && pnpm install
```

### 配置环境变量

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

### 启动服务

```bash
# 1. 启动依赖服务 (MySQL, Redis等)
docker-compose up -d

# 2. 初始化数据库
cd backend && pnpm run migrate

# 3. 启动后端
cd backend && pnpm run dev

# 4. 启动前端 (新终端)
pnpm run dev

# 5. 启动管理后台 (可选)
cd admin && pnpm run dev
```

访问地址:
- 前端: http://localhost:5173
- 后端: http://localhost:8080
- 管理后台: http://localhost:5174

## 技术栈

### 前端
- React 18 + TypeScript
- Vite
- TailwindCSS
- Framer Motion (动画)
- React Router (路由)

### 后端
- Node.js + Express
- 火山引擎 AI API (图像生成)
- 腾讯云 COS (对象存储)
- MySQL (数据库)
- Redis (缓存)

### 管理后台
- React 18 + TypeScript
- Ant Design 5
- ECharts (数据可视化)

## 核心功能

### 1. 时空拼图 (解决人聚不齐)
- 上传多人照片 (1-5人)
- AI自动抠图、统一光线、美颜
- 合成完美全家福
- 支持多种背景模板

### 2. 富贵变身 (解决背景太土)
- 上传现有全家福
- 一键替换背景 (新中式/欧式豪宅等)
- 可选服饰替换 (唐装/旗袍)
- 自然融合效果

### 3. 微动态生成
- 基于静态图生成 Live Photo
- 5秒短视频 (MP4格式)
- 背景动态效果 (烟花/灯笼/雪花)
- 人物轻微微动

### 4. 管理后台系统

#### 快速启动
```bash
# 一键启动管理后台
./start-admin.sh

# 或手动启动
docker-compose up mysql
cd backend && pnpm run migrate
cd backend && pnpm run dev
cd admin && pnpm run dev
```

#### 访问信息
- 地址: http://localhost:5174
- 默认账号: admin / Admin@123456

#### 核心功能
- 🔐 认证系统 - JWT认证、双层权限、操作日志
- 💰 价格管理 - 动态配置、历史记录、定时生效
- 👥 用户管理 - 列表查看、详情展示、状态管理、数据导出
- 📦 订单管理 - 统一视图、状态更新、退款处理、数据导出
- 📊 数据看板 - 实时统计、趋势分析、图表展示

## 项目架构

### 模式化架构

每个产品模式都是独立的产品线,拥有独立的配置、模板、API和提示词:

```
/puzzle              # 时空拼图落地页
/puzzle/upload       # 上传页面
/puzzle/template     # 模板选择
/puzzle/generating   # 生成中
/puzzle/result-selector  # 4宫格选择
/puzzle/result       # 结果页

/transform           # 富贵变身落地页
/transform/upload    # 上传页面
/transform/template  # 模板选择
/transform/generating # 生成中
/transform/result-selector # 4宫格选择
/transform/result    # 结果页
```

### 目录结构

```
src/config/modes/
├── index.ts              # 模式注册中心
├── types.ts              # 类型定义
├── puzzle/               # 时空拼图模式
│   ├── templates.ts      # 模板列表
│   ├── api.ts            # API配置
│   └── prompts.ts        # 提示词模板
└── transform/            # 富贵变身模式
    ├── templates.ts
    ├── api.ts
    └── prompts.ts

backend/config/
└── modes.js              # 后端模式配置
```

### 添加新模式

1. 在 `src/config/modes/` 创建新模式目录
2. 定义模板、API、提示词配置
3. 在 `src/config/modes/index.ts` 注册模式
4. 在 `backend/config/modes.js` 添加后端配置
5. 创建对应的页面组件和路由

## 商业模式

### 定价策略

| 功能 | 免费版 | 尝鲜包(9.9元) | 尊享包(29.9元) |
|------|--------|---------------|----------------|
| 生成艺术照 | ✓ 标清+水印 | ✓ 高清无水印 | ✓ 超清4K |
| 4选1生成 | ✗ | ✓ | ✓ |
| 合成人数 | 最多2人 | 最多5人 | 无限制 |
| 模板数量 | 基础3个 | 热门10个 | 全部模板 |
| 微动态视频 | ✗ | ✗ | ✓ |
| Live Photo | ✗ | ✗ | ✓ |
| 电子贺卡 | ✗ | ✗ | ✓ |
| 实体产品优惠 | ✗ | 9折 | 8折 |

### 实体产品
- 晶瓷画/亚克力摆台: 68-99元
- 丝绸卷轴挂画: 128元
- 通过淘宝/1688一件代发,无需库存

## 技术方案

### 架构设计

采用 "Node.js调度 + Python Utils" 架构:
- Node.js: 高并发业务调度、API网关、数据库操作
- Python: 图像处理、AI接口调用、人脸检测

### AI能力

**一期方案 (MVP)**: 即梦AI API
- 人像与背景融合
- 背景替换
- 微动态生成
- 服饰替换

**二期方案**: 混合架构
- 普通场景: 继续使用即梦AI
- 高级场景: ComfyUI + 开源模型
- 成本降低60%以上

### 核心技术点

1. **4选1策略**: 批量生成4张结果,用户筛选,规避AI不确定性
2. **人脸检测**: OpenCV预处理,确保照片质量
3. **光线统一**: AI自动调整色温、亮度
4. **边缘融合**: 自然过渡,无明显拼接痕迹
5. **微动态**: 仅背景动态,人物轻微微动

### 数据存储

- **原始图片**: 阿里云OSS私有存储,24小时后自动删除
- **生成结果**: OSS公开存储 + CDN加速
- **业务数据**: MySQL数据库
- **缓存**: Redis (模板、会话、热点数据)

### 安全保障

- HTTPS加密传输
- Token鉴权
- 数据脱敏
- 定期备份
- 符合《个人信息保护法》

## 开发规范

### 包管理器
- ✅ 使用 pnpm
- ❌ 禁止使用 npm

### 服务依赖
- ✅ 本地代码直接运行
- ✅ 数据库等服务通过 Docker 启动
- ❌ 禁止本地安装 PostgreSQL、MySQL、Redis

### 代码规范
- 使用 TypeScript 类型检查
- 遵循 ESLint 规则
- 提交前运行 `pnpm run lint`

### 禁用命令
- ❌ 禁止使用 `cat << 'EOF'` 命令
- ✅ 使用 `fsWrite` 或 `strReplace` 工具

## 部署

### 前端构建
```bash
pnpm run build
```

### 后端部署
```bash
cd backend
# 后端直接运行,无需构建
```

### Docker部署
```bash
docker-compose up -d
```

## 测试

### 功能测试
- 核心流程完整性
- API调用稳定性
- 支付与鉴权逻辑

### 性能测试
- 并发100人响应速度
- API调用延迟
- CDN加载速度

### 兼容性测试
- 不同机型/浏览器
- 微信小程序兼容性

## 成本预估 (月度)

| 成本项 | 预估金额 (元) |
|--------|--------------|
| 云服务 (ECS/OSS/CDN/RDS/Redis) | 9,000-11,000 |
| AI API调用 | 8,000-12,000 |
| 模板版权 | 1,000-2,000 |
| 运维与人工 | 15,000-20,000 |
| 其他 (售后/应急) | 2,000-3,000 |
| **总计** | **35,000-48,000** |

## 风险与应对

| 风险类型 | 应对措施 |
|---------|---------|
| 技术风险 | 提前与即梦沟通算力扩容;预埋优质Prompt库;建立人工审核通道 |
| 成本风险 | 付费定价覆盖API成本;限制免费用户调用频率;二期切换开源工作流 |
| 流量风险 | 开启ECS弹性扩容;对免费用户流量限制;优化Redis缓存 |
| 商业风险 | 对接3-5家备选商家;提前告知发货周期;建立售后维权通道 |
| 合规风险 | 严格执行24小时删除机制;购买商用版权;签署隐私协议 |

## License

MIT

---

**开发团队**: AI全家福项目组  
**最后更新**: 2026-01-17
