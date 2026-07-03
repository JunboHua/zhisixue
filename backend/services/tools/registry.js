const evaluateAnswer = require('./evaluateAnswer');
const askQuestion = require('./askQuestion');
const provideHint = require('./provideHint');
const checkMastery = require('./checkMastery');
const updateProfile = require('./updateProfile');
const completeSession = require('./completeSession');
const searchKnowledge = require('./searchKnowledge');
const searchSimilarPoints = require('./searchSimilarPoints');

/**
 * Tool definitions in OpenAI/DeepSeek function-calling format
 */
const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'evaluate_answer',
      description: '评估学生对当前问题的回答质量，判断正确性（正确/部分正确/错误）和错因类型（概念错误/逻辑错误/遗漏要点/理解偏差/计算错误/其他）。每次学生回答后必须调用。',
      parameters: {
        type: 'object',
        properties: {
          userAnswer: { type: 'string', description: '学生的原始回答文本' },
          knowledgePoint: { type: 'string', description: '当前正在学习的知识点名称' },
          questionContext: { type: 'string', description: '刚才向学生提出的问题内容，用于对照评估' }
        },
        required: ['userAnswer', 'knowledgePoint']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ask_question',
      description: '根据知识点和难度生成苏格拉底式反问。难度：基础（贴近生活）、中等（推理论证）、高等（批判性思维）。',
      parameters: {
        type: 'object',
        properties: {
          knowledgePoint: { type: 'string', description: '目标知识点名称' },
          difficulty: { type: 'string', enum: ['基础', '中等', '高等'], description: '问题难度级别：基础（生活化场景）、中等（推理论证）、高等（批判性思维）' },
          focusArea: { type: 'string', description: '可选，指定问题聚焦的子方向或具体角度' }
        },
        required: ['knowledgePoint', 'difficulty']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'provide_hint',
      description: '为学生提供分层提示，帮助其找到思考方向但不直接给出答案。提示深度：轻推（反问或类比）、方向指引（指出思考路径）、详细引导（拆解为子问题）。',
      parameters: {
        type: 'object',
        properties: {
          knowledgePoint: { type: 'string', description: '当前知识点' },
          hintLevel: { type: 'string', enum: ['轻推', '方向指引', '详细引导'], description: '提示深度：轻推（反问类比）、方向指引（指出路径）、详细引导（拆解步骤）' },
          userStuckPoint: { type: 'string', description: '可选，学生具体卡在哪个环节' }
        },
        required: ['knowledgePoint', 'hintLevel']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_mastery',
      description: '查询学生对某个知识点的历史掌握度（0-100）、历史错因类型、上次练习时间。',
      parameters: {
        type: 'object',
        properties: {
          knowledgePointId: { type: 'string', description: '知识点ID或名称' }
        },
        required: ['knowledgePointId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_profile',
      description: '更新学生的学习画像。掌握度变化正数为提升、负数为下降，范围自动钳制在0-100。',
      parameters: {
        type: 'object',
        properties: {
          knowledgePointId: { type: 'string', description: '知识点ID或名称' },
          masteryDelta: { type: 'number', description: '掌握度变化值，正数表示提升' },
          errorTypes: { type: 'array', items: { type: 'string' }, description: '本次回答暴露的错因类型列表' }
        },
        required: ['knowledgePointId', 'masteryDelta']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'complete_session',
      description: '结束当前学习会话并生成学习总结。当学生连续答对且掌握度达标时调用。',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: '本次学习的简短总结' },
          achievementLevel: { type: 'string', enum: ['优秀', '良好', '需要复习'], description: '达成水平' },
          knowledgePoint: { type: 'string', description: '本次学习的知识点名称' }
        },
        required: ['summary', 'achievementLevel']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description: '在学生上传的学习资料中搜索与查询最相关的原文段落。当学生问"为什么"、"能举个例子吗"、需要原文支撑、或理解偏差时使用。返回原文段落和相关度分数。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索查询，通常基于学生的问题或困惑点' },
          resourceId: { type: 'string', description: '可选，限定在特定资料中搜索' },
          topK: { type: 'number', description: '返回结果数量，默认5' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_similar_points',
      description: '搜索与当前知识点语义相似的其他知识点（跨资料）。用于建立知识关联、推荐下一步学习路径。在一个知识点学习完成时调用。',
      parameters: {
        type: 'object',
        properties: {
          knowledgePointId: { type: 'string', description: '当前知识点ID' },
          knowledgePointTitle: { type: 'string', description: '当前知识点标题，用于语义搜索' },
          topK: { type: 'number', description: '返回结果数量，默认3' }
        },
        required: ['knowledgePointTitle']
      }
    }
  }
];

// 工具实现映射
const toolImplementations = {
  evaluate_answer: evaluateAnswer,
  ask_question: askQuestion,
  provide_hint: provideHint,
  check_mastery: checkMastery,
  update_profile: updateProfile,
  complete_session: completeSession,
  search_knowledge: searchKnowledge,
  search_similar_points: searchSimilarPoints
};

/**
 * 工具执行分发器
 * @param {string} toolName - 工具名称
 * @param {object} args - LLM 传入的工具参数
 * @param {object} context - 额外上下文 { userId, sessionId }
 */
async function executeTool(toolName, args, context) {
  const impl = toolImplementations[toolName];

  if (!impl) {
    console.error(`未知工具调用: ${toolName}`);
    return { success: false, error: `未知工具: ${toolName}` };
  }

  try {
    console.log(`执行工具: ${toolName}`, JSON.stringify(args).substring(0, 200));
    const data = await impl(args, context);
    return { success: true, data };
  } catch (error) {
    console.error(`工具 ${toolName} 执行失败:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { TOOL_DEFINITIONS, executeTool };
