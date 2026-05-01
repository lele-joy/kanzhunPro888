/**
 * MiniMax 个股分析 API 服务
 * 
 * API 地址: POST https://api.minimaxi.com/v1/chat/completions
 * 模型: MiniMax-M2.7-highspeed (高速版)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// ==================== 配置区域 ====================
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || 'YOUR_API_KEY_HERE';
const MINIMAX_API_URL = 'https://api.minimaxi.com/v1/chat/completions';
const MODEL = 'MiniMax-M2.7-highspeed'; // 高速版模型
// ============================================

/**
 * 股票分析的系统提示词
 */
const STOCK_ANALYSIS_SYSTEM_PROMPT = `你是专业的股票技术分析AI。你的任务是对用户输入的股票或大盘进行6维度技术分析。

【关键要求】你必须遵守以下规则：
1. 直接输出JSON，不要任何前缀文字（如"好的"、"以下是"等）
2. 不要输出<|im_start|>、<|im_end|>等标签
3. 不要输出<thinking>、<|end_turn|>等标记
4. 不要输出markdown代码块标记（如三个反引号包裹的json）
5. 只输出符合格式的纯JSON字符串

【6维度技术分析框架】（必须严格按此分析）
1. 大盘研判：指数当前位置、短期/中期/长期趋势判断、关键支撑位与压力位
2. 量能分析：成交量变化、量价配合关系、缩量/放量信号
3. 板块轮动：当前强势板块、资金流向、热点持续性
4. 个股分析：股价技术形态（均线/K线/形态）、买卖点信号
5. 操作策略：明确操作方向（买入/卖出/持有）、入场条件、仓位建议
6. 风险提示：当前市场主要风险、政策风险、技术面风险

【返回JSON格式】（必须严格遵守）
{
  "stock": "股票名称",
  "code": "股票代码",
  "trend": "多头/震荡/空头",
  "trendText": "多头/震荡/空头",
  "overallScore": 0-100整数,
  "dimensions": [
    {"name": "大盘研判", "score": 0-100整数, "analysis": "分析内容，30-50字"},
    {"name": "量能分析", "score": 0-100整数, "analysis": "分析内容，30-50字"},
    {"name": "板块轮动", "score": 0-100整数, "analysis": "分析内容，30-50字"},
    {"name": "个股分析", "score": 0-100整数, "analysis": "分析内容，30-50字"},
    {"name": "操作策略", "score": 0-100整数, "analysis": "分析内容，30-50字"},
    {"name": "风险提示", "score": 0-100整数, "analysis": "分析内容，30-50字"}
  ],
  "summary": "综合研判总结，50-80字",
  "action": "买入/卖出/持有",
  "actionCondition": "具体操作条件，30-50字",
  "entryPrice": "具体价格或'观望'",
  "stopLoss": "具体价格或'-'",
  "targetPrice": "具体价格或'-'"
}

现在开始分析。只输出JSON，不要其他任何内容。`;

/**
 * 解析AI返回的JSON（清理干扰内容）
 */
function parseAIResponse(aiContent) {
  if (!aiContent) return null;
  
  let jsonStr = aiContent;
  
  // 移除各种标签
  jsonStr = jsonStr.replace(/<\|im_start\|>[\s\S]*?<\|im_end\|>/g, '');
  jsonStr = jsonStr.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
  jsonStr = jsonStr.replace(/<\|end_turn\|>[\s\S]*?<\|end_turn\|>/g, '');
  
  // 处理markdown代码块
  if (jsonStr.includes('```json')) {
    const match = jsonStr.match(/```json\n*([\s\S]*?)\n*```/);
    if (match) jsonStr = match[1];
  } else if (jsonStr.includes('```')) {
    const match = jsonStr.match(/```\n?([\s\S]*?)\n?```/);
    if (match) jsonStr = match[1];
  }
  
  // 找到JSON边界
  const jsonStart = jsonStr.indexOf('{');
  const jsonEnd = jsonStr.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
  }
  
  return JSON.parse(jsonStr);
}

/**
 * 生成备用结果（JSON解析失败时）
 */
function getFallbackResult(stockName, aiContent) {
  return {
    stock: stockName,
    code: '待查询',
    trend: '震荡',
    trendText: '震荡',
    overallScore: 50,
    dimensions: [
      { name: '大盘研判', score: 50, analysis: 'AI返回格式异常，请重试' },
      { name: '量能分析', score: 50, analysis: 'AI返回格式异常，请重试' },
      { name: '板块轮动', score: 50, analysis: 'AI返回格式异常，请重试' },
      { name: '个股分析', score: 50, analysis: 'AI返回格式异常，请重试' },
      { name: '操作策略', score: 50, analysis: 'AI返回格式异常，请重试' },
      { name: '风险提示', score: 50, analysis: aiContent ? aiContent.substring(0, 100) : '暂无' }
    ],
    summary: 'AI返回格式异常，请重试或联系管理员',
    action: '持有',
    actionCondition: '请重试',
    entryPrice: '观望',
    stopLoss: '-',
    targetPrice: '-'
  };
}

/**
 * 接口1：普通分析接口（非流式，供云函数/其他客户端使用）
 * POST /api/analyze
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { stock } = req.body;

    if (!stock || stock.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '请提供股票名称或代码'
      });
    }

    const stockName = stock.trim();
    console.log(`📊 开始分析股票: ${stockName}`);

    // 调用 MiniMax API（非流式）
    const response = await axios.post(
      MINIMAX_API_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: STOCK_ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: `请分析股票: ${stockName}` }
        ],
        temperature: 0.7,
        max_completion_tokens: 2048,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MINIMAX_API_KEY}`
        },
        timeout: 60000
      }
    );

    const aiContent = response.data.choices?.[0]?.message?.content;

    if (!aiContent) {
      return res.status(500).json({
        success: false,
        error: 'AI 返回内容为空'
      });
    }

    console.log(`✅ 分析完成: ${stockName}`);

    // 解析JSON
    try {
      const result = parseAIResponse(aiContent);
      res.json({
        success: true,
        data: result,
        raw: aiContent
      });
    } catch (parseError) {
      console.log('⚠️ JSON 解析失败:', parseError.message);
      console.log('原始返回:', aiContent.substring(0, 500));
      
      res.json({
        success: true,
        data: getFallbackResult(stockName, aiContent),
        raw: aiContent
      });
    }

  } catch (error) {
    console.error('❌ 分析失败:', error.message);

    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        return res.status(401).json({ success: false, error: 'API 密钥无效' });
      }
      if (status === 429) {
        return res.status(429).json({ success: false, error: '请求过于频繁' });
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || '分析服务暂时不可用'
    });
  }
});

/**
 * 接口2：流式分析接口（SSE，供H5前端使用）
 * POST /api/analyze-stream
 * 
 * 返回格式（SSE）：
 * data: {"type":"start","message":"开始分析..."}
 * data: {"type":"progress","content":"正在分析大盘走势..."}
 * data: {"type":"done","result":{...}}
 */
app.post('/api/analyze-stream', async (req, res) => {
  try {
    const { stock } = req.body;

    if (!stock || stock.trim() === '') {
      return res.status(400).json({ error: '请提供股票名称或代码' });
    }

    const stockName = stock.trim();
    console.log(`📊 [流式] 开始分析股票: ${stockName}`);

    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // 发送开始事件
    res.write(`data: ${JSON.stringify({ type: 'start', message: '正在分析...' })}\n\n`);

    // 调用 MiniMax API（流式）
    const response = await axios.post(
      MINIMAX_API_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: STOCK_ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: `请分析股票: ${stockName}` }
        ],
        temperature: 0.7,
        max_completion_tokens: 2048,
        stream: true  // 启用流式
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MINIMAX_API_KEY}`
        },
        timeout: 60000,
        responseType: 'stream'  // 重要：接收流式响应
      }
    );

    let fullContent = '';
    let buffer = '';  // 用于处理不完整的数据

    // 读取流式响应
    response.data.on('data', (chunk) => {
      const lines = (buffer + chunk.toString()).split('\n');
      buffer = lines.pop() || '';  // 保留最后一个不完整的行

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          
          // 流结束标志
          if (data === '[DONE]' || data === '{}') {
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            
            if (content) {
              fullContent += content;
              // 发送增量内容
              res.write(`data: ${JSON.stringify({ type: 'progress', content, fullContent })}\n\n`);
            }
          } catch (e) {
            // 忽略解析错误（可能是不完整的JSON）
          }
        }
      }
    });

    // 流结束
    response.data.on('end', () => {
      console.log(`✅ [流式] 分析完成: ${stockName}`);
      
      // 解析完整结果
      try {
        const result = parseAIResponse(fullContent);
        res.write(`data: ${JSON.stringify({ type: 'done', result })}\n\n`);
      } catch (parseError) {
        console.log('⚠️ JSON 解析失败，使用备用结果');
        res.write(`data: ${JSON.stringify({ 
          type: 'done', 
          result: getFallbackResult(stockName, fullContent),
          parseError: true 
        })}\n\n`);
      }
      
      res.write(`data: [DONE]\n\n`);
      res.end();
    });

    // 错误处理
    response.data.on('error', (err) => {
      console.error('❌ 流读取错误:', err);
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('❌ 流式分析失败:', error.message);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * 健康检查接口
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'stock-analysis-api',
    model: MODEL,
    timestamp: new Date().toISOString()
  });
});

/**
 * 获取支持的模型列表
 * GET /api/models
 */
app.get('/api/models', (req, res) => {
  res.json({
    models: [
      { id: 'MiniMax-M2.7', name: 'MiniMax M2.7', description: '主力模型' },
      { id: 'MiniMax-M2.7-highspeed', name: 'MiniMax M2.7 高速版', description: '响应更快（当前使用）' },
      { id: 'MiniMax-M2.5', name: 'MiniMax M2.5', description: '稳定版' }
    ],
    current: MODEL
  });
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║     📊 个股扫雷 API 服务已启动                         ║
╠══════════════════════════════════════════════════════╣
║  端口: ${PORT}                                          ║
║  API地址: http://localhost:${PORT}                        ║
║  普通接口: http://localhost:${PORT}/api/analyze            ║
║  流式接口: http://localhost:${PORT}/api/analyze-stream    ║
║  健康检查: http://localhost:${PORT}/api/health            ║
╠══════════════════════════════════════════════════════╣
║  API 配置:                                            ║
║  • 模型: ${MODEL}                                      
║  • API Key: ${MINIMAX_API_KEY === 'YOUR_API_KEY_HERE' ? '❌ 未配置' : '✅ 已配置'}                          
╚══════════════════════════════════════════════════════╝
  `);
});

// 托管静态文件
app.use(express.static(__dirname));

// 处理 SPA 路由
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/index-v2.html');
});

module.exports = { app, server };
