const express = require('express');
const database = require('../services/database');
const authenticate = require('../middleware/auth');
const aiService = require('../services/aiService');

const router = express.Router();

router.post('/start', authenticate, async (req, res) => {
  try {
    const { resourceId, knowledgePointId, knowledgePointTitle } = req.body;

    if (!resourceId || !knowledgePointId || !knowledgePointTitle) {
      return res.status(400).json({ message: '请提供完整的学习信息' });
    }

    const session = await database.createSession({
      userId: req.user._id,
      resourceId,
      knowledgePointId,
      knowledgePointTitle,
      status: 'in_progress'
    });

    const questionData = await aiService.generateQuestion(
      knowledgePointTitle,
      '',
      '中级'
    );

    const questionText = typeof questionData === 'string' ? questionData : (questionData.question || '请思考一下，这个知识点的核心概念是什么？');

    res.json({
      message: '学习会话开始',
      sessionId: session._id,
      question: questionText,
      hint: typeof questionData === 'object' ? (questionData.hint || '') : '',
      briefAnswer: typeof questionData === 'object' ? (questionData.briefAnswer || '') : ''
    });
  } catch (error) {
    res.status(500).json({ message: '开始学习会话失败', error: error.message });
  }
});

router.post('/answer', authenticate, async (req, res) => {
  try {
    const { sessionId, userAnswer } = req.body;
    
    if (!sessionId || !userAnswer) {
      return res.status(400).json({ message: '请提供会话ID和答案' });
    }

    const session = await database.findSessionById(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: '学习会话不存在' });
    }

    const analysis = await aiService.analyzeAnswer(
      session.knowledgePointTitle,
      '',
      userAnswer
    );

    let nextQuestionData = null;
    let isCompleted = false;

    if (analysis.correctness === '正确') {
      if (session.interactions.length >= 2) {
        isCompleted = true;
      } else {
        nextQuestionData = await aiService.generateQuestion(
          session.knowledgePointTitle,
          '',
          '高级'
        );
      }
    } else {
      const followUp = await aiService.generateFollowUp(
        session.knowledgePointTitle,
        userAnswer,
        analysis
      );
      
      const questionData = await aiService.generateQuestion(
        session.knowledgePointTitle,
        '',
        '初级'
      );
      
      nextQuestionData = { 
        question: followUp, 
        hint: typeof questionData === 'object' ? (questionData.hint || '') : '', 
        briefAnswer: typeof questionData === 'object' ? (questionData.briefAnswer || '') : '' 
      };
    }

    const nextQuestionText = nextQuestionData ?
      (typeof nextQuestionData === 'string' ? nextQuestionData : (nextQuestionData.question || '请继续深入思考...')) :
      '请继续思考...';
    const nextHint = nextQuestionData && typeof nextQuestionData === 'object' ? (nextQuestionData.hint || '') : '';
    const nextBriefAnswer = nextQuestionData && typeof nextQuestionData === 'object' ? (nextQuestionData.briefAnswer || '') : '';

    session.interactions.push({
      question: session.interactions.length > 0 ?
        session.interactions[session.interactions.length - 1].nextQuestion : '初始问题',
      userAnswer,
      analysis,
      nextQuestion: nextQuestionText,
      timestamp: new Date()
    });

    if (isCompleted) {
      session.status = 'completed';
      session.endTime = new Date();
      session.duration = Math.floor((session.endTime - new Date(session.startTime)) / 1000 / 60);
      session.masteryChange = 15;
    }

    await database.updateSession(session._id, session);

    if (isCompleted) {
      await updateUserProfile(req.user._id, session.knowledgePointId, analysis.errorType);
    }

    res.json({
      message: '答案提交成功',
      analysis: analysis || { correctness: '部分正确', errorType: '其他', explanation: '分析中...' },
      nextQuestion: nextQuestionText,
      hint: nextHint,
      briefAnswer: nextBriefAnswer,
      isCompleted
    });
  } catch (error) {
    res.status(500).json({ message: '提交答案失败', error: error.message });
  }
});

router.get('/sessions', authenticate, async (req, res) => {
  try {
    const sessions = await database.findSessions({ userId: req.user._id });
    
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ message: '获取学习会话列表失败', error: error.message });
  }
});

router.get('/session/:id', authenticate, async (req, res) => {
  try {
    const session = await database.findSessionById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ message: '学习会话不存在' });
    }

    res.json({ session });
  } catch (error) {
    res.status(500).json({ message: '获取学习会话失败', error: error.message });
  }
});

async function updateUserProfile(userId, knowledgePointId, errorType) {
  try {
    const user = await database.findUser({ _id: userId });
    
    if (!user.learningProfile.knowledgePoints) {
      user.learningProfile.knowledgePoints = {};
    }

    const existingPoint = user.learningProfile.knowledgePoints[knowledgePointId];
    
    if (existingPoint) {
      existingPoint.mastery = Math.min(100, existingPoint.mastery + 10);
      if (errorType && !existingPoint.wrongTypes.includes(errorType)) {
        existingPoint.wrongTypes.push(errorType);
      }
      existingPoint.lastPractice = new Date();
    } else {
      user.learningProfile.knowledgePoints[knowledgePointId] = {
        mastery: 20,
        wrongTypes: errorType ? [errorType] : [],
        lastPractice: new Date()
      };
    }

    user.learningProfile.completedPoints += 1;
    await database.updateUser(userId, user);
  } catch (error) {
    console.error('更新用户画像失败:', error);
  }
}

module.exports = router;