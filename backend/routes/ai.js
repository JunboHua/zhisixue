const express = require('express');
const authenticate = require('../middleware/auth');
const aiService = require('../services/aiService');

const router = express.Router();

router.post('/parse', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: '请提供学习资料内容' });
    }

    const result = await aiService.parseKnowledge(content);
    
    res.json({
      message: '知识点解析成功',
      data: result
    });
  } catch (error) {
    res.status(500).json({ message: '知识点解析失败', error: error.message });
  }
});

router.post('/question', authenticate, async (req, res) => {
  try {
    const { knowledgePoint, description, userLevel } = req.body;
    
    if (!knowledgePoint) {
      return res.status(400).json({ message: '请提供知识点' });
    }

    const question = await aiService.generateQuestion(
      knowledgePoint,
      description || '',
      userLevel || '中级'
    );
    
    res.json({
      message: '提问生成成功',
      question
    });
  } catch (error) {
    res.status(500).json({ message: '提问生成失败', error: error.message });
  }
});

router.post('/analyze', authenticate, async (req, res) => {
  try {
    const { knowledgePoint, description, userAnswer } = req.body;
    
    if (!knowledgePoint || !userAnswer) {
      return res.status(400).json({ message: '请提供知识点和用户答案' });
    }

    const analysis = await aiService.analyzeAnswer(
      knowledgePoint,
      description || '',
      userAnswer
    );
    
    res.json({
      message: '答案分析成功',
      analysis
    });
  } catch (error) {
    res.status(500).json({ message: '答案分析失败', error: error.message });
  }
});

router.post('/followup', authenticate, async (req, res) => {
  try {
    const { knowledgePoint, userAnswer, analysis } = req.body;
    
    if (!knowledgePoint || !userAnswer || !analysis) {
      return res.status(400).json({ message: '请提供完整的分析数据' });
    }

    const followUp = await aiService.generateFollowUp(
      knowledgePoint,
      userAnswer,
      analysis
    );
    
    res.json({
      message: '追问生成成功',
      followUp
    });
  } catch (error) {
    res.status(500).json({ message: '追问生成失败', error: error.message });
  }
});

router.post('/report', authenticate, async (req, res) => {
  try {
    const { knowledgePoints, duration, interactions, correctCount, errorDistribution, masteryChange } = req.body;
    
    const report = await aiService.generateReport(
      req.user._id,
      knowledgePoints,
      duration,
      interactions,
      correctCount,
      errorDistribution,
      masteryChange
    );
    
    res.json({
      message: '报告生成成功',
      report
    });
  } catch (error) {
    res.status(500).json({ message: '报告生成失败', error: error.message });
  }
});

module.exports = router;