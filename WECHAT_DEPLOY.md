# 微信服务号接入指南

## 📋 部署架构

```
┌─────────────────┐      ┌──────────────────┐
│   微信服务号     │      │  微信云开发       │
│                 │      │                  │
│  菜单 → H5页面   │ ───→ │  云函数 analyzeStock │
│                 │      │  静态托管         │
└─────────────────┘      └──────────────────┘
        │                        │
        │                        ↓
        │               ┌──────────────────┐
        │               │  MiniMax API     │
        │               │  (高速版)        │
        └──────────────→└──────────────────┘
```

## 🚀 部署步骤

### 第一步：更新云函数

1. 登录 [微信云开发控制台](https://cloud.weixin.qq.com/)

2. 进入你的云开发环境

3. **创建/更新云函数 `analyzeStock`**：
   - 目录：`/stock-scan/cloud-functions/analyzeStock/`
   - 文件：`index.js`（已更新为高速版）

4. **配置环境变量**：
   - 在云函数配置中添加：`MINIMAX_API_KEY` = 你的API Key

5. **安装依赖**：
   - 在 `package.json` 添加：
   ```json
   {
     "dependencies": {
       "wx-server-sdk": "~2.6.3",
       "axios": "^1.6.0"
     }
   }
   ```

### 第二步：部署 H5 页面到静态托管

1. 在云开发控制台开启「静态网站」功能

2. **构建生产版本**：
   ```bash
   cd /Users/msnyang/WorkBuddy/20260430145559/stock-scan
   ```

3. **修改配置** - 编辑 `index-v2.html` 第 1222 行：
   ```javascript
   const USE_WECHAT_CLOUD = true;   // 启用云函数调用
   const USE_STREAMING = false;       // 微信云不支持流式，设为false
   ```

4. **上传到静态托管**：
   - 上传 `index-v2.html` 和所有静态资源
   - 或者使用 CI/CD 自动部署

### 第三步：配置服务号菜单

1. 在微信公众平台配置菜单
2. 菜单类型：跳转网页
3. 填写 H5 页面的 URL（静态托管地址）

---

## ⚠️ 重要配置

### H5 页面配置（index-v2.html）

```javascript
// 第 1222 行附近
const USE_WECHAT_CLOUD = true;   // 改为 true 使用云函数
const USE_STREAMING = false;     // 云函数不支持流式，设为 false
```

### 云函数配置

```javascript
// index.js 第 18 行
const MODEL = 'MiniMax-M2.7-highspeed';  // 已更新为高速版
```

---

## 🧪 测试验证

### 测试云函数
在云开发控制台的「云函数」tab 页，点击「测试」，输入：
```json
{
  "stock": "贵州茅台"
}
```

### 测试 H5 页面
1. 在微信开发者工具中打开 H5 页面
2. 输入股票名称测试

---

## 📁 需要上传的文件

```
stock-scan/
├── index-v2.html          # H5 主页面（需修改 USE_WECHAT_CLOUD = true）
├── index.html              # 可能需要的旧版页面
├── 其他静态资源...
```

```
stock-scan/cloud-functions/analyzeStock/
├── index.js                # 云函数主文件（已更新为高速版）
├── package.json            # 依赖配置
└── config.json             # 环境变量配置（可选）
```

---

## 🔧 常见问题

### Q: 云函数调用失败
A: 检查：
1. 环境变量 `MINIMAX_API_KEY` 是否配置
2. 云函数是否成功部署
3. 网络策略是否允许访问 api.minimaxi.com

### Q: H5 页面显示空白
A: 检查：
1. `USE_WECHAT_CLOUD` 是否设为 `true`
2. 云函数名称是否正确（`analyzeStock`）
3. 微信开发者工具是否开启「不校验合法域名」

### Q: 如何实现流式返回？
A: 微信云函数不支持 SSE 流式返回。如果需要流式效果：
- 方案1：使用自建服务器（非云函数）
- 方案2：前端使用轮询 + 分段渲染（复杂）

---

## 📞 技术支持

如果部署遇到问题，检查：
1. 云开发控制台的日志
2. 浏览器开发者工具的 Network 和 Console
3. MiniMax API Key 是否有效
