const aiService = require('../aiService');

/**
 * 评估学生对当前问题的回答质量，判断正确性和错因
 */
async function evaluateAnswer({ userAnswer, knowledgePoint, questionContext }) {
  const prompt = `请分析以下对话，判断用户答案的正确性并分类错因：

知识点：${knowledgePoint}
知识点描述：${questionContext || ''}
用户答案：${userAnswer}

请按照以下JSON格式输出分析结果（JSON字段名用英文，字段值用中文）：
{
  "correctness": "正确|部分正确|错误",
  "errorType": "概念错误|逻辑错误|遗漏要点|理解偏差|计算错误|其他",
  "explanation": "详细的分析说明，供AI导师内部参考，不直接展示给学生",
  "suggestion": "给AI导师的引导方向建议，如何通过提问引导学生自我发现"
}

要求：分析客观准确，错因分类清晰。`;

  const result = await aiService.callAI(prompt);

  try {
    const parsed = JSON.parse(result);

    // 统一映射为中文值
    const correctnessMap = {
      'correct': '正确', 'partial': '部分正确', 'wrong': '错误',
      '正确': '正确', '部分正确': '部分正确', '错误': '错误'
    };
    const errorTypeMap = {
      'concept': '概念错误', 'logic': '逻辑错误', 'missing': '遗漏要点',
      'misunderstanding': '理解偏差', 'calculation': '计算错误', 'other': '其他',
      '概念错误': '概念错误', '逻辑错误': '逻辑错误', '遗漏要点': '遗漏要点',
      '理解偏差': '理解偏差', '计算错误': '计算错误', '其他': '其他'
    };

    return {
      correctness: correctnessMap[parsed.correctness] || '部分正确',
      errorType: errorTypeMap[parsed.errorType] || '其他',
      explanation: parsed.explanation || '',
      suggestion: parsed.suggestion || ''
    };
  } catch {
    return {
      correctness: '部分正确',
      errorType: '其他',
      explanation: '分析结果解析失败',
      suggestion: '请继续引导学生深入思考'
    };
  }
}

module.exports = evaluateAnswer;
