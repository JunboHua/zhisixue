const database = require('../database');

/**
 * 查询学生对某个知识点的历史掌握度
 */
async function checkMastery({ knowledgePointId }, context) {
  const user = await database.findUser({ _id: context.userId });

  if (!user || !user.learningProfile || !user.learningProfile.knowledgePoints) {
    return {
      mastery: 0,
      wrongTypes: [],
      lastPractice: null,
      isNew: true
    };
  }

  const pointData = user.learningProfile.knowledgePoints[knowledgePointId];

  if (!pointData) {
    return {
      mastery: 0,
      wrongTypes: [],
      lastPractice: null,
      isNew: true
    };
  }

  return {
    mastery: pointData.mastery || 0,
    wrongTypes: pointData.wrongTypes || [],
    lastPractice: pointData.lastPractice || null,
    isNew: false
  };
}

module.exports = checkMastery;
