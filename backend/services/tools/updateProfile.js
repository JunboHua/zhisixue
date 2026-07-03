const database = require('../database');

/**
 * 更新学生的学习画像，记录掌握度变化和错因
 */
async function updateProfile({ knowledgePointId, masteryDelta, errorTypes }, context) {
  const user = await database.findUser({ _id: context.userId });

  if (!user) {
    return { success: false, error: '用户不存在' };
  }

  if (!user.learningProfile) {
    user.learningProfile = {
      knowledgePoints: {},
      weakAreas: [],
      totalLearningTime: 0,
      completedPoints: 0
    };
  }

  if (!user.learningProfile.knowledgePoints) {
    user.learningProfile.knowledgePoints = {};
  }

  const existing = user.learningProfile.knowledgePoints[knowledgePointId];

  if (existing) {
    existing.mastery = Math.min(100, Math.max(0, existing.mastery + masteryDelta));
    if (errorTypes && errorTypes.length > 0) {
      for (const et of errorTypes) {
        if (!existing.wrongTypes.includes(et)) {
          existing.wrongTypes.push(et);
        }
      }
    }
    existing.lastPractice = new Date();
  } else {
    user.learningProfile.knowledgePoints[knowledgePointId] = {
      mastery: Math.max(0, 10 + masteryDelta),
      wrongTypes: errorTypes || [],
      lastPractice: new Date()
    };
  }

  user.learningProfile.completedPoints = Object.keys(user.learningProfile.knowledgePoints).length;

  await database.updateUser(context.userId, user);

  return {
    success: true,
    newMastery: user.learningProfile.knowledgePoints[knowledgePointId].mastery,
    totalCompletedPoints: user.learningProfile.completedPoints
  };
}

module.exports = updateProfile;
