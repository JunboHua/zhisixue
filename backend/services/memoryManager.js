const database = require('./database');

/**
 * 对话记忆管理器
 * 负责：对话历史存取、上下文窗口裁剪、早期对话摘要压缩、用户画像加载
 */
class MemoryManager {
  constructor() {
    // 消息存储：按 sessionId 组织，每条消息含 role, content, timestamp
    // 复用 database 的 sessions 来存储消息
    this.messageStore = new Map(); // sessionId → messages[]
  }

  /**
   * 获取会话的对话消息，自动处理上下文窗口
   */
  async getMessages(sessionId) {
    const messages = this.messageStore.get(sessionId) || [];
    return this.trimContext(messages);
  }

  /**
   * 保存会话的完整消息历史
   */
  async saveMessages(sessionId, messages) {
    // 保存 user、assistant、tool 消息（tool消息是assistant tool_calls的必需配套）
    // system消息每次重建，不保存
    const toStore = messages.filter(m =>
      m.role === 'user' || m.role === 'assistant' || m.role === 'tool'
    );
    this.messageStore.set(sessionId, toStore);
  }

  /**
   * 裁剪对话上下文，防止超出 token 限制
   */
  trimContext(messages) {
    const MAX_MESSAGES = 30;
    const MAX_TOKENS_ESTIMATE = 6000;

    // 保留最近的消息
    let trimmed = messages.slice(-MAX_MESSAGES);

    // 确保不拆散 tool_calls/tool 配对：
    // 如果截断后的第一条消息是 tool（没有前面的 assistant tool_calls），移除它
    while (trimmed.length > 0 && trimmed[0].role === 'tool') {
      trimmed.shift();
    }
    // 如果最后一条消息是 assistant 且有 tool_calls（没有后面的 tool 响应），移除它
    while (trimmed.length > 0) {
      const last = trimmed[trimmed.length - 1];
      if (last.role === 'assistant' && last.tool_calls && last.tool_calls.length > 0) {
        trimmed.pop();
      } else {
        break;
      }
    }

    // 估算 token 数：中文约 1.5 字符/token
    const totalChars = trimmed.reduce(
      (sum, m) => sum + (typeof m.content === 'string' ? m.content.length : 0),
      0
    );
    const estimatedTokens = totalChars / 1.5;

    if (estimatedTokens > MAX_TOKENS_ESTIMATE) {
      const excessRatio = MAX_TOKENS_ESTIMATE / estimatedTokens;
      const targetMessages = Math.max(4, Math.floor(trimmed.length * excessRatio));
      trimmed = trimmed.slice(-targetMessages);
      // 再次检查配对
      while (trimmed.length > 0 && trimmed[0].role === 'tool') {
        trimmed.shift();
      }
    }

    return trimmed;
  }

  /**
   * 加载用户学习画像
   */
  async getUserProfile(userId) {
    try {
      const user = await database.findUser({ _id: userId });
      if (!user || !user.learningProfile) return null;

      const profile = user.learningProfile;
      const points = profile.knowledgePoints || {};

      const masterySummary = Object.entries(points)
        .map(([id, data]) => `${id}:${data.mastery || 0}%`)
        .join(', ');

      return {
        completedPoints: profile.completedPoints || 0,
        weakAreas: profile.weakAreas || [],
        totalLearningTime: profile.totalLearningTime || 0,
        masterySummary: masterySummary || '暂无数据'
      };
    } catch (error) {
      console.error('加载用户画像失败:', error.message);
      return null;
    }
  }

  /**
   * 清除会话消息（用于会话结束时清理）
   */
  async clearMessages(sessionId) {
    this.messageStore.delete(sessionId);
  }
}

module.exports = new MemoryManager();
