const aiService = require('../aiService');

const HINT_STRATEGIES = {
  '轻推':   '用最轻的推动方式，比如一个反问或类比，帮学生自己找到方向。不要把问题简化太多。',
  '方向指引': '给出方向性指引，指出思考的路径，但不涉及具体内容。例如指出应该从哪个角度思考。',
  '详细引导': '给出详细的思考框架和步骤，拆解问题为更小的子问题，但仍然不直接给最终答案。'
};

const DEFAULT_STRATEGY = HINT_STRATEGIES['方向指引'];

/**
 * 为学生提供分层提示，绝不直接给答案
 */
async function provideHint({ knowledgePoint, hintLevel, userStuckPoint }) {
  const strategy = HINT_STRATEGIES[hintLevel] || DEFAULT_STRATEGY;

  const prompt = `学生正在学习"${knowledgePoint}"这个知识点，现在遇到了困难。
卡住位置：${userStuckPoint || '整体理解有困难'}
提示策略：${strategy}

请生成一个苏格拉底式提示。

核心要求：
1. 绝对不能直接给出答案
2. 以反问或引导性问题结尾
3. 语气温暖、鼓励性强
4. 让学生觉得是自己找到了方向，而不是被告诉了答案
5. 只输出提示内容，不要有任何其他解释或标签`;

  const result = await aiService.callAI(prompt);

  return {
    hint: result.trim(),
    hintLevel: hintLevel
  };
}

module.exports = provideHint;
