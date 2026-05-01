# 📊 个股扫雷 - AI 智能股票风险分析

基于 MiniMax API 的个股风险分析服务，支持微信服务号接入。

## 🚀 快速开始

### 1. 安装依赖

```bash
cd stock-scan
npm install
```

### 2. 配置 API Key

创建 `.env` 文件（复制自 `.env.example`）：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 MiniMax API Key：

```env
MINIMAX_API_KEY=你的MiniMax_API_Key
PORT=3000
```

### 3. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务启动后访问：
- API 服务：http://localhost:3000
- 健康检查：http://localhost:3000/api/health

### 4. 访问 H5 页面

开发环境下，直接在浏览器打开 `index.html` 即可测试。

## 📁 项目结构

```
stock-scan/
├── index.html          # H5 前端页面
├── server.js           # Node.js 后端服务
├── package.json        # Node.js 依赖配置
├── .env.example        # 环境变量模板
└── README.md           # 本文档
```

## 🔧 API 接口

### POST /api/analyze

分析股票风险

**请求：**
```json
{
  "stock": "贵州茅台"  // 股票名称或代码
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "stock": "贵州茅台",
    "code": "600519",
    "riskLevel": "中",
    "riskText": "中等风险",
    "dimensions": [
      {"name": "财务风险", "level": "低", "score": 25, "desc": "..."},
      {"name": "经营风险", "level": "中", "score": 55, "desc": "..."},
      {"name": "估值风险", "level": "高", "score": 78, "desc": "..."},
      {"name": "市场风险", "level": "中", "score": 45, "desc": "..."}
    ],
    "summary": "综合分析结论...",
    "suggestion": "投资建议..."
  }
}
```

### GET /api/health

健康检查

### GET /api/models

获取支持的模型列表

## 🔐 安全提示

- **不要**将 `.env` 文件提交到版本控制系统
- API Key 仅存储在你的服务器上
- 生产环境建议使用 HTTPS

## 🌐 部署到云服务器

### 推荐流程

1. 将 `index.html` 部署到静态托管服务（如 CDN、七牛云等）
2. 将 `server.js` 部署到 Node.js 运行环境（如阿里云 ECS、腾讯云 SCF 等）
3. 确保后端服务有公网访问地址
4. 更新 `index.html` 中的 `API_BASE_URL` 为你的后端地址

### 微信服务号配置

1. 登录微信公众平台
2. 进入「设置与开发」→「公众号设置」→「功能设置」
3. 配置「JS接口安全域名」
4. 在自定义菜单中添加跳转链接，指向你的 H5 页面

## 📝 自定义分析提示词

编辑 `server.js` 中的 `STOCK_ANALYSIS_SYSTEM_PROMPT` 变量，调整 AI 分析逻辑和输出格式。

## ⚠️ 免责声明

本工具基于 AI 模型分析，仅供参考和学习交流使用，不构成任何投资建议。投资有风险，决策需谨慎。
