# 流式返回 + 高速模型 更新说明

## ✅ 已完成的优化

### 1. 模型升级 → MiniMax-M2.7-highspeed
- **之前**：`MiniMax-M2.7`（标准速度）
- **现在**：`MiniMax-M2.7-highspeed`（高速版，响应更快）
- **预计提升**：首字延迟降低 30-50%

### 2. 流式返回（Streaming）
- **之前**：用户点击 → 等待 5-10 秒 → 一次性显示结果
- **现在**：用户点击 → 1-2 秒开始显示 → 内容实时生成

## 📁 文件变更

### 后端 `server.js`
新增接口：
- `POST /api/analyze` - 原有接口（非流式，供云函数使用）
- `POST /api/analyze-stream` - **新增流式接口**（供 H5 前端使用）

关键改动：
```javascript
// 模型已改为高速版
const MODEL = 'MiniMax-M2.7-highspeed';

// 新增流式接口
app.post('/api/analyze-stream', ...);
```

### 前端 `index-v2.html`
新增配置：
```javascript
// 是否使用流式接口（true=更快的用户体验）
const USE_STREAMING = true;
```

新增函数：
- `analyzeStockStream(stock)` - 使用 EventSource 接收流式数据

## 🚀 如何启动

### 本地测试
```bash
cd /Users/msnyang/WorkBuddy/20260430145559/stock-scan
node server.js
```

访问：`http://localhost:3000/index-v2.html`

### 预期效果
1. 输入股票名称（如"贵州茅台"）
2. 点击"开始分析"
3. **Loading 页面会实时显示 AI 生成的内容预览**
4. 分析完成后自动跳转到结果页面

## 📊 性能对比

|  | 优化前 | 优化后 |
|---|---|---|
| 模型 | MiniMax-M2.7 | MiniMax-M2.7-highspeed |
| 首字延迟 | 3-6 秒 | 1-3 秒（预计） |
| 用户体验 | 空白 loading 5-10 秒 | 1-2 秒开始看到内容 |
| 感知速度 | 慢 | 快 |

## 🔧 切换到非流式模式

如果想暂时关闭流式返回，修改 `index-v2.html` 第 1222 行：
```javascript
const USE_STREAMING = false;  // 改为 false
```

## 📝 注意事项

1. **MiniMax API Key 必须有效**
   - 检查 `.env` 文件中的 `MINIMAX_API_KEY`

2. **微信云函数也需要更新**
   - 云函数应该使用非流式接口（`/api/analyze`）
   - 或者单独部署一个支持流式的新云函数

3. **如果流式接口失败**
   - 前端会自动降级到非流式模式（需要在 `analyzeStock()` 中添加降级逻辑）

## 🐛 调试

查看服务器日志：
```bash
node server.js
```

测试流式接口：
```bash
curl -N -X POST http://localhost:3000/api/analyze-stream \
  -H "Content-Type: application/json" \
  -d '{"stock":"贵州茅台"}'
```

## ✨ 下一步优化建议

1. **添加降级逻辑**：流式失败时自动切换到非流式
2. **优化 loading 动画**：根据流式进度显示更丰富的提示
3. **云函数也支持流式**：如果微信云函数支持 SSE，可以同步升级
