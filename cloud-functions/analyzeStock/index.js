/**
 * 云函数：analyzeStock
 * 股票技术分析 - 调用MiniMax API
 * 
 * 使用方式：
 * 1. 在云开发控制台创建云函数
 * 2. 配置环境变量：MINIMAX_API_KEY
 * 3. H5页面通过 wx.cloud.callFunction 调用
 */

const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// MiniMax API 配置
const MINIMAX_API_URL = 'https://api.minimaxi.com/v1/chat/completions';
const MODEL = 'MiniMax-M2.7-highspeed';

// 股票分析的系统提示词（与server.js保持一致）
const STOCK_ANALYSIS_SYSTEM_PROMPT = `你是专业的股票技术分析AI。你的任务是对用户输入的股票或大盘进行6维度技术分析。

【关键要求】你必须遵守以下规则：
1. 直接输出JSON，不要任何前缀文字
2. 不要输出<|im_start|>、<|im_end|>等标签
3. 不要输出<thinking>、<|end_turn|>等标记
4. 不要输出markdown代码块标记
5. 只输出符合格式的纯JSON字符串

【6维度技术分析框架】
1. 大盘研判：指数当前位置、趋势判断、关键支撑压力位
2. 量能分析：成交量变化、量价配合关系
3. 板块轮动：强势板块、资金流向
4. 个股分析：技术形态、买卖点信号
5. 操作策略：操作方向、入场条件、仓位建议
6. 风险提示：主要风险点

【返回JSON格式】
{
  "stock": "股票名称",
  "code": "股票代码",
  "trend": "多头/震荡/空头",
  "trendText": "多头/震荡/空头",
  "overallScore": 0-100整数,
  "dimensions": [
    {"name": "大盘研判", "score": 0-100整数, "analysis": "30-50字分析"},
    {"name": "量能分析", "score": 0-100整数, "analysis": "30-50字分析"},
    {"name": "板块轮动", "score": 0-100整数, "analysis": "30-50字分析"},
    {"name": "个股分析", "score": 0-100整数, "analysis": "30-50字分析"},
    {"name": "操作策略", "score": 0-100整数, "analysis": "30-50字分析"},
    {"name": "风险提示", "score": 0-100整数, "analysis": "30-50字分析"}
  ],
  "summary": "综合研判总结，50-80字",
  "action": "买入/卖出/持有",
  "actionCondition": "具体操作条件",
  "entryPrice": "入场价或观望",
  "stopLoss": "止损价或-",
  "targetPrice": "目标价或-"
}

现在开始分析。只输出JSON，不要其他任何内容。`;

// 云函数入口
exports.main = async (event, context) => {
  const { stock } = event;
  
  if (!stock || stock.trim() === '') {
    return {
      success: false,
      error: '请提供股票名称或代码'
    };
  }
  
  const stockName = stock.trim();
  
  console.log('开始分析股票:', stockName);
  
  try {
    // 获取环境变量中的API Key
    const apiKey = process.env.MINIMAX_API_KEY;
    
    if (!apiKey) {
      return {
        success: false,
        error: 'API未配置，请联系管理员'
      };
    }
    
    // 调用MiniMax API
    const response = await axios.post(
      MINIMAX_API_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: STOCK_ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: `请分析股票: ${stockName}` }
        ],
        temperature: 0.7,
        max_completion_tokens: 2048
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 60000
      }
    );
    
    const aiContent = response.data.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      return {
        success: false,
        error: 'AI返回内容为空'
      };
    }
    
    // 解析JSON（处理可能的干扰内容）
    let jsonStr = aiContent;
    jsonStr = jsonStr.replace(/<\|im_start\|>[\s\S]*?<\|im_end\|>/g, '');
    jsonStr = jsonStr.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
    
    // 提取JSON对象
    const jsonStart = jsonStr.indexOf('{');
    const jsonEnd = jsonStr.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
    }
    
    const analysisResult = JSON.parse(jsonStr);
    
    console.log('分析完成:', stockName);
    
    return {
      success: true,
      data: analysisResult
    };
    
  } catch (error) {
    console.error('分析失败:', error);
    
    return {
      success: false,
      error: error.message || '分析服务暂时不可用'
    };
  }
};
