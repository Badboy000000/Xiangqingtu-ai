# 电商详情图 AI 生成系统

基于 AI 的电商商品详情图自动生成工具，通过四节点工作流（信息整理 → 设计规划 → 提示词生成 → AI 生图），一键生成高质量电商详情图。

## 技术栈

**前端**
- React 18 + TypeScript + Vite
- Tailwind CSS 4 + Material UI + Radix UI
- React Router v7

**后端**
- Node.js + Express + TypeScript
- Sequelize ORM + MySQL
- OpenAI SDK（对接 GPT-5.5 / GPT Image 2）
- 火山引擎 Ark API（对接 Seedream 5.0）
- JWT 认证 + bcrypt 加密

## 功能特性

- **注册登录系统**：JWT 认证，支持头像上传与裁剪
- **项目管理**：创建、编辑、删除项目，按项目 ID 分目录存储
- **四节点 AI 工作流**：
  1. 信息整理 — LLM 分析商品信息，引导用户补充关键细节
  2. 设计规划 — AI 规划详情页分屏结构与布局
  3. 提示词生成 — 根据规划自动生成高质量生图 Prompt
  4. AI 生图 — 调用图像模型生成详情图，支持参考图联合生图
- **SSE 流式输出**：工作流执行过程实时推送，全程可视化
- **动态分屏**：支持自定义分屏数量，灵活适配不同商品
- **图片导出**：支持 PNG/JPG 多格式导出

## 项目结构

```
电商详情图生成/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── adapters/        # 外部 API 适配器（LLM / Vision / Image）
│   │   ├── config/          # 配置（数据库、环境变量）
│   │   ├── controllers/     # 控制器（认证、项目、工作流）
│   │   ├── middleware/      # 中间件（认证、错误处理、日志）
│   │   ├── models/          # Sequelize 数据模型
│   │   ├── prompts/         # AI 系统提示词
│   │   ├── routes/          # API 路由
│   │   ├── services/        # 业务服务（四节点工作流）
│   │   └── utils/           # 工具函数（SSE 等）
│   └── uploads/             # 运行时上传文件（已 gitignore）
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── api/             # API 请求层
│   │   ├── app/             # 应用入口、路由、页面、组件
│   │   ├── context/         # React Context（认证、项目）
│   │   ├── styles/          # 全局样式、Tailwind 配置
│   │   ├── types/           # TypeScript 类型定义
│   │   └── utils/           # 工具函数
│   └── dist/                # 构建产物（已 gitignore）
└── docxs/                   # 项目文档（已 gitignore）
```

## 快速开始

### 环境要求

- Node.js >= 18
- MySQL >= 8.0

### 安装依赖

```bash
# 根目录
npm install

# 后端
cd backend && npm install

# 前端
cd ../frontend && npm install
```

### 配置环境变量

在 `backend/` 目录下创建 `.env` 文件：

```env
# Server
PORT=3000
NODE_ENV=development

# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ecommerce_detail
DB_USER=root
DB_PASSWORD=your_password

# 胜算云中转平台 (GPT-5.5 / GPT Image 2)
SSY_BASE_URL=https://router.shengsuanyun.com/api/v1
SSY_API_KEY=your_ssy_api_key

# 火山引擎 (Seedream 5.0)
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_API_KEY=your_ark_api_key

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=20971520
```

### 初始化数据库

```bash
cd backend
npm run db:sync
```

### 启动开发服务

```bash
# 同时启动前后端（推荐）
npm run dev

# 或分别启动
npm run dev:backend
npm run dev:frontend
```

前端默认运行在 `http://localhost:5173`，后端 API 在 `http://localhost:3000`。

## AI 模型接入

| 模型 | 用途 | 接入方式 |
|------|------|---------|
| GPT-5.5 | 文本分析、提示词生成 | 胜算云中转平台 |
| GPT Image 2 | AI 生图 | 胜算云中转平台 |
| Seedream 5.0 | AI 生图（备选） | 火山引擎 Ark API |

## 许可证

Private - All Rights Reserved
