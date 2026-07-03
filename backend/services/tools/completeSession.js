const aiService = require('../aiService');

/**
 * 结束当前学习会话并生成学习总结
 */
async function completeSession({ summary, achievementLevel, knowledgePoint }, context) {
  const levelMap = { '优秀': '优秀', '良好': '良好', '需要复习': '需要复习' };
  const displayLevel = levelMap[achievementLevel] || achievementLevel || '良好';

  const prompt = `请基于以下信息，生成一段温暖鼓励的学习总结：

知识点：${knowledgePoint || '本次学习内容'}
掌握程度：${displayLevel}
学习摘要：${summary || '完成了该知识点的学习'}

要求：
1. 总结学生的进步和亮点
2. 给出下一步学习方向的建议
3. 语气温暖、鼓励性强
4. 最后以一句激励的话结尾
5. 不超过200字`;

  const reportSummary = await aiService.callAI(prompt);

  return {
    summary: reportSummary.trim(),
    achievementLevel: displayLevel,
    suggestion: achievementLevel === '需要复习'
      ? '建议明天再次复习该知识点'
      : '建议继续学习下一个相关知识点'
  };
}

module.exports = completeSession;
