const axios = require('axios');
const { TOOL_DEFINITIONS, executeTool } = require('./tools/registry');
const memoryManager = require('./memoryManager');
const database = require('./database');

// Agent 的完整 System Prompt
const AGENT_SYSTEM_PROMPT = `你是一位苏格拉底式AI导师，正在通过一对一对话引导学生深度学习。你必须严格遵守以下规则：

## 核心原则
1. 永远不要直接给出答案或解释——通过提问引导学生自己推导
2. 根据学生的回答质量动态调整教学策略
3. 使用工具来提问、评估、提示、追踪进度
4. 每次收到学生回答后，立即调用 evaluate_answer 工具进行评估

## 教学流程
收到学生回答后的标准操作：
步骤1: 调用 evaluate_answer 评估回答质量
步骤2: 调用 check_mastery 查看知识点掌握度
步骤3: 根据评估结果决策下一步（参见下方决策树）
步骤4: 若继续教学，调用 ask_question 生成新问题
步骤5: 若学生已掌握（掌握度≥80且本次正确），调用 complete_session(achievementLevel="优秀"|"良好") 结束

## 决策树

### 学生回答正确 (evaluate_answer 返回"正确")
→ 调用 update_profile(masteryDelta=+15)
→ 调用 ask_question(difficulty="高等") 提出挑战性问题
→ 鼓励学生，然后立即抛出更难的问题
→ 不要说"你答对了"，而是用新问题推进

### 学生回答部分正确 (evaluate_answer 返回"部分正确")
→ 调用 provide_hint(hintLevel="方向指引")
→ 不直接指出哪里对、哪里错
→ 用反问引导学生自己发现遗漏："你提到的X有道理，但如果在Y情况下呢？"

### 学生回答错误 (evaluate_answer 返回"错误")
→ 调用 provide_hint(hintLevel="轻推")
→ 调用 ask_question(difficulty="基础") 退回到基础问题
→ 绝不说"你错了"或给出正确答案
→ 连续错误2次时，用生活化场景重建理解

### 学生表示困惑时
→ 调用 provide_hint 获取对应级别的提示
→ 多次请求提示（≥3次）则显著降低难度

### 学生已掌握该知识点
→ 调用 complete_session 生成总结
→ 肯定学生的进步

## 回复风格
- 每个回复不超过3句话
- 永远以问题结尾
- 使用"你觉得..."、"如果..."、"能否想一下..."
- 禁止："正确答案是..."、"你应该..."、"不对..."

## RAG 工具使用规则
你有两个检索工具可以访问学生上传的学习资料原文：

### search_knowledge — 搜索原文段落
调用时机：
- 学生问"为什么"、"能举个例子吗"、"具体怎么解释"时
- 需要引用原文中的具体案例或解释来支撑你的提问时
- 学生的错误表明对某个概念的理解有偏差时
- 你想确认原文中是否有某个细节时

使用方法：调用后你会得到相关原文段落。把这些段落的要点融入你的思考，但**不要直接念给学生听**——用苏格拉底式提问引导学生自己去发现原文中的要点。

### search_similar_points — 跨资料知识关联
调用时机：当一个知识点学习完成时，搜索其他资料中的关联知识点。
使用方法：如果发现强关联知识点，在学习总结中建议学生下一步学习。`;

const MAX_LOOP_ITERATIONS = 10;

// 检测是否使用 Mock 模式（API Key 未配置或为占位符）
const apiKey = process.env.DEEPSEEK_API_KEY;
const useMock = !apiKey || apiKey === 'your_deepseek_api_key_here' || apiKey.includes('****');

// Mock 问题列表（用于无 API Key 时的演示）
const MOCK_QUESTIONS = [
  '如果你要向一个完全没学过数学的人解释"函数"是什么，你会怎么用生活中的例子来说明？',
  '假设我们有一个函数 f(x)=2x+1，当 x 从 1 增加到 3 时，f(x) 会如何变化？这个过程告诉了你关于这个函数的什么信息？',
  '你提到了一个很好的观点！那么你能想出一个场景，其中输入和输出之间的关系不是函数关系吗？为什么？',
  '如果把函数的定义域从实数缩小到整数，这对函数图像会产生什么影响？你觉得为什么会这样？',
  '恭喜你完成了这个知识点的学习！你对函数的理解越来越深入了。现在，回顾一下我们讨论的内容，你觉得函数的哪三个性质最重要？'
];

const MOCK_HINT = '试着从「每个输入是否都有唯一的输出」这个角度思考。如果某个输入可以对应两个不同的输出，那它还满足函数的定义吗？';

let mockQuestionIndex = 0;

function getMockReply(userMessage) {
  if (mockQuestionIndex >= MOCK_QUESTIONS.length) {
    return {
      reply: MOCK_QUESTIONS[MOCK_QUESTIONS.length - 1],
      isCompleted: true
    };
  }
  const reply = MOCK_QUESTIONS[mockQuestionIndex];
  mockQuestionIndex++;
  return {
    reply,
    isCompleted: mockQuestionIndex >= MOCK_QUESTIONS.length
  };
}

/**
 * 对 DeepSeek API 发起 LLM 调用（支持 function calling）
 */
async function callLLM(messages) {
  // Mock 模式：直接返回模拟响应
  if (useMock) {
    console.log('[Agent] Mock模式：不调用真实API');
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const hasTools = messages.some(m => m.role === 'tool');

    // 如果有工具调用结果待处理，返回模拟的文本回复
    if (hasTools) {
      return {
        role: 'assistant',
        content: '让我根据刚才的分析继续引导你思考...'
      };
    }

    // 如果刚加了系统提示要求生成问题，模拟一个 tool_call
    const lastSystemMsg = [...messages].reverse().find(m => m.role === 'system');
    if (lastSystemMsg && lastSystemMsg.content.includes('请先调用 ask_question')) {
      return {
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: 'call_mock_' + Date.now(),
          type: 'function',
          function: {
            name: 'ask_question',
            arguments: JSON.stringify({
              knowledgePoint: '当前知识点',
              difficulty: '中等'
            })
          }
        }]
      };
    }

    // 如果用户刚发了回答，模拟 evaluate_answer + ask_question
    if (lastUserMsg && lastUserMsg.content.length > 5) {
      return {
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: 'call_mock_eval_' + Date.now(),
          type: 'function',
          function: {
            name: 'evaluate_answer',
            arguments: JSON.stringify({
              userAnswer: lastUserMsg.content.substring(0, 200),
              knowledgePoint: '当前知识点'
            })
          }
        }]
      };
    }

    return { role: 'assistant', content: MOCK_QUESTIONS[0] };
  }

  // 真实 API 调用...
  const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  try {
    const response = await axios.post(
      apiUrl,
      {
        model: model,
        messages: messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    return response.data.choices[0].message;
  } catch (error) {
    const status = error.response?.status;
    const errMsg = error.response?.data || error.message;
    console.error(`Agent LLM 调用失败 (HTTP ${status}):`, JSON.stringify(errMsg).substring(0, 200));

    // 认证失败或服务端错误 → 回退到 Mock 模式
    if (status === 401 || status === 403) {
      console.log('[Agent] API Key 无效，自动切换到 Mock 模式');
      // 递归调用自身，但下次会走 useMock 分支
      // 直接返回 Mock 响应
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMsg && lastUserMsg.content.length > 5) {
        return {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call_fallback_' + Date.now(),
            type: 'function',
            function: {
              name: 'evaluate_answer',
              arguments: JSON.stringify({
                userAnswer: lastUserMsg.content.substring(0, 200),
                knowledgePoint: '当前知识点'
              })
            }
          }]
        };
      }
      return { role: 'assistant', content: MOCK_QUESTIONS[0] };
    }

    // 其他API错误（400, 500等）→ 尝试不带tools的重试
    if (status === 400 || status === 500) {
      try {
        const fallbackResponse = await axios.post(
          apiUrl,
          { model, messages, temperature: 0.7, max_tokens: 2000 },
          { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 }
        );
        return fallbackResponse.data.choices[0].message;
      } catch (fbError) {
        console.error('[Agent] 回退调用也失败，使用 Mock:', fbError.message);
        return { role: 'assistant', content: MOCK_QUESTIONS[0] };
      }
    }

    throw error;
  }
}

/**
 * 为 Agent 构建 System Prompt（注入用户画像）
 */
function buildSystemPrompt(profile) {
  let prompt = AGENT_SYSTEM_PROMPT;

  if (profile) {
    prompt += `\n\n## 当前学生画像
- 已完成知识点数：${profile.completedPoints || 0}
- 待加强领域：${(profile.weakAreas || []).join('、') || '无'}
- 累计学习时间：${profile.totalLearningTime || 0}分钟
- 知识点掌握度概况：${profile.masterySummary || '暂无数据'}`;
  }

  return prompt;
}

/**
 * 从消息历史中提取工具调用摘要（用于日志/调试）
 */
function extractToolCallSummary(messages) {
  return messages
    .filter(m => m.role === 'tool')
    .map(m => {
      try {
        const data = JSON.parse(m.content);
        return data.success !== undefined
          ? (data.success ? 'success' : 'error')
          : 'ok';
      } catch {
        return 'ok';
      }
    });
}

/**
 * Agent 核心：发起或继续一个教学对话
 *
 * @param {string} userId - 用户ID
 * @param {string} sessionId - 会话ID
 * @param {string} userMessage - 用户当前输入的消息
 * @param {object} learningContext - 学习上下文 { knowledgePoint, resourceId, knowledgePointId }
 * @returns {object} { reply, isCompleted, sessionState }
 */
async function agentChat(userId, sessionId, userMessage, learningContext = {}) {
  // 1. 加载上下文
  const history = await memoryManager.getMessages(sessionId);
  const profile = await memoryManager.getUserProfile(userId);

  // 2. 构建消息数组
  const messages = [
    { role: 'system', content: buildSystemPrompt(profile) },
    ...history,
    { role: 'user', content: userMessage }
  ];

  // 如果是新会话的第一条消息，追加学习上下文信息
  if (history.length === 0 && learningContext.knowledgePoint) {
    messages.push({
      role: 'system',
      content: `[本次学习信息] 知识点：${learningContext.knowledgePoint}，知识点ID：${learningContext.knowledgePointId || ''}。请先调用 ask_question(difficulty="intermediate") 开始第一次提问。`
    });
  }

  // 3. Agent 自主循环
  let loopCount = 0;
  let isCompleted = false;
  let latestHint = '';
  let latestBriefAnswer = '';

  while (loopCount < MAX_LOOP_ITERATIONS) {
    loopCount++;

    // 调用 LLM
    const assistantMsg = await callLLM(messages);
    messages.push(assistantMsg);

    // 检查是否有 tool_calls
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      for (const toolCall of assistantMsg.tool_calls) {
        const toolName = toolCall.function.name;
        let toolArgs;

        try {
          toolArgs = JSON.parse(toolCall.function.arguments);
        } catch {
          toolArgs = {};
        }

        console.log(`[Agent Loop ${loopCount}] 调用工具: ${toolName}`);

        // 执行工具
        const toolResult = await executeTool(toolName, toolArgs, { userId, sessionId });

        // 收集 hint 和 briefAnswer
        if (toolResult.success && toolResult.data) {
          if (toolResult.data.hint && !latestHint) latestHint = toolResult.data.hint;
          if (toolResult.data.briefAnswer && !latestBriefAnswer) latestBriefAnswer = toolResult.data.briefAnswer;
        }

        // 检测是否调用了 complete_session
        if (toolName === 'complete_session' && toolResult.success) {
          isCompleted = true;
        }

        // 将工具结果追加到消息数组
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }

      // 继续循环，让 LLM 处理工具结果
      continue;
    }

    // 没有 tool_calls → LLM 给用户的最终回复
    // 保存对话历史
    await memoryManager.saveMessages(sessionId, messages);

    // 更新学习会话的交互记录
    await updateSessionRecord(sessionId, messages, learningContext);

    return {
      reply: assistantMsg.content || '请继续思考...',
      hint: latestHint || '',
      briefAnswer: latestBriefAnswer || '',
      isCompleted,
      sessionState: {
        loopCount,
        toolCallsMade: extractToolCallSummary(messages)
      }
    };
  }

  // 循环次数超限 → 强制结束
  console.warn(`Agent 会话 ${sessionId} 达到最大循环次数`);
  await memoryManager.saveMessages(sessionId, messages);

  return {
    reply: '你已经进行了很多思考，非常棒！让我们先休息一下，回顾一下今天学到的内容。',
    isCompleted: true,
    sessionState: {
      loopCount,
      toolCallsMade: extractToolCallSummary(messages),
      maxLoopsReached: true
    }
  };
}

/**
 * 更新学习会话记录（与现有 learning 路由兼容）
 */
async function updateSessionRecord(sessionId, messages, learningContext) {
  try {
    const session = await database.findSessionById(sessionId);
    if (!session) return;

    // 提取最后的 user 消息和 assistant 回复
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');

    if (lastUserMsg && lastAssistantMsg) {
      session.interactions.push({
        question: session.interactions.length > 0
          ? session.interactions[session.interactions.length - 1].nextQuestion
          : '开始学习',
        userAnswer: lastUserMsg.content,
        analysis: {
          correctness: 'partial',
          errorType: 'other',
          explanation: 'Agent 模式下的自动分析'
        },
        nextQuestion: lastAssistantMsg.content,
        timestamp: new Date()
      });
    }

    await database.updateSession(sessionId, session);
  } catch (error) {
    console.error('更新会话记录失败:', error.message);
  }
}

/**
 * 启动新学习会话
 */
async function agentStart(userId, resourceId, knowledgePointId, knowledgePointTitle) {
  const session = await database.createSession({
    userId,
    resourceId,
    knowledgePointId,
    knowledgePointTitle,
    status: 'in_progress'
  });

  // 第一条消息：告诉Agent开始教学
  const result = await agentChat(userId, session._id, '我开始学习了', {
    knowledgePoint: knowledgePointTitle,
    resourceId,
    knowledgePointId
  });

  return {
    sessionId: session._id,
    reply: result.reply,
    hint: result.hint || '',
    briefAnswer: result.briefAnswer || '',
    isCompleted: false
  };
}

module.exports = { agentChat, agentStart };
