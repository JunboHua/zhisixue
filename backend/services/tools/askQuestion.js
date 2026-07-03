const aiService = require('../aiService');

const PROMPT_TEMPLATES = {
  '基础': `请基于以下知识点，生成一个非常基础、贴近日常生活的苏格拉底式提问：

知识点：{knowledgePoint}
知识点描述：{description}
目标难度：初级——问题应贴近生活场景，让学生能轻松入手

请按照以下JSON格式输出：
{
  "question": "苏格拉底式提问，引导用户自主思考",
  "hint": "解题思路提示（轻度提示）",
  "briefAnswer": "简要答案要点（供AI导师参考，不直接展示给学生）"
}

要求：
1. 从日常生活中的具体场景出发提问
2. 问题要简单易懂，让学生有信心回答
3. 仍然保持苏格拉底式反问风格`,

  '中等': `请基于以下知识点，生成一个需要推理论证的中等难度苏格拉底式提问：

知识点：{knowledgePoint}
知识点描述：{description}
目标难度：中级——问题需要一定的逻辑推理能力

请按照以下JSON格式输出：
{
  "question": "苏格拉底式提问，引导用户推理论证",
  "hint": "解题思路提示（方向性提示）",
  "briefAnswer": "简要答案要点（供AI导师参考，不直接展示给学生）"
}

要求：
1. 问题需要学生进行比较、分析或推理论证
2. 从应用场景、对比分析、假设推理等角度提问
3. 不要直接提问"什么是XX"之类的问题`,

  '高等': `请基于以下知识点，生成一个需要批判性思维的高级苏格拉底式提问：

知识点：{knowledgePoint}
知识点描述：{description}
目标难度：高级——问题需要批判性思维和创造性思考

请按照以下JSON格式输出：
{
  "question": "高级苏格拉底式提问，挑战学生的理解深度",
  "hint": "解题思路提示（轻度方向性提示）",
  "briefAnswer": "简要答案要点（供AI导师参考，不直接展示给学生）"
}

要求：
1. 问题需要学生质疑假设、考虑边缘情况或提出新见解
2. 引导学生思考"为什么"和"如果不这样会怎样"
3. 鼓励学生挑战常规思维框架`
};

/**
 * 根据知识点和难度生成苏格拉底式提问
 */
async function askQuestion({ knowledgePoint, difficulty, focusArea }) {
  const template = PROMPT_TEMPLATES[difficulty] || PROMPT_TEMPLATES['中等'];

  const prompt = template
    .replace('{knowledgePoint}', knowledgePoint)
    .replace('{description}', focusArea || '');

  const result = await aiService.callAI(prompt);

  try {
    const parsed = JSON.parse(result);
    return {
      question: parsed.question || result,
      hint: parsed.hint || '',
      briefAnswer: parsed.briefAnswer || '',
      difficulty: difficulty
    };
  } catch {
    return {
      question: result,
      hint: '',
      briefAnswer: '',
      difficulty: difficulty
    };
  }
}

module.exports = askQuestion;
