const express = require('express');
const authenticate = require('../middleware/auth');
const { agentChat, agentStart } = require('../services/agentService');

const router = express.Router();

/**
 * POST /api/agent/start
 * 启动一个新的 Agent 学习会话
 * Body: { resourceId, knowledgePointId, knowledgePointTitle }
 */
router.post('/start', authenticate, async (req, res) => {
  try {
    const { resourceId, knowledgePointId, knowledgePointTitle } = req.body;

    if (!resourceId || !knowledgePointId || !knowledgePointTitle) {
      return res.status(400).json({ message: '请提供完整的学习信息（resourceId, knowledgePointId, knowledgePointTitle）' });
    }

    const result = await agentStart(
      req.user._id,
      resourceId,
      knowledgePointId,
      knowledgePointTitle
    );

    res.json({
      message: 'Agent 学习会话已启动',
      sessionId: result.sessionId,
      reply: result.reply
    });
  } catch (error) {
    console.error('Agent启动失败:', error);
    res.status(500).json({ message: '启动Agent会话失败', error: error.message });
  }
});

/**
 * POST /api/agent/chat
 * 向 Agent 发送消息，继续学习对话
 * Body: { sessionId, message }
 */
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ message: '请提供 sessionId 和 message' });
    }

    const result = await agentChat(
      req.user._id,
      sessionId,
      message,
      {} // learningContext 可从 session 中恢复
    );

    res.json({
      reply: result.reply,
      isCompleted: result.isCompleted,
      sessionState: result.sessionState
    });
  } catch (error) {
    console.error('Agent对话失败:', error);
    res.status(500).json({ message: 'Agent对话失败', error: error.message });
  }
});

module.exports = router;
