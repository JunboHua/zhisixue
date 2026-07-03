const vectorStore = require('../vectorStore');
const { embedQuery } = require('../embeddingService');

/**
 * 跨资料知识点关联工具
 *
 * 使用场景：
 * - 一个知识点学习完成时，查找其他资料中的关联知识点
 * - 帮助学生建立跨学科/跨资料的知识网络
 * - 建议下一步学习路径
 */
async function searchSimilarPoints({ knowledgePointId, knowledgePointTitle, topK }, context) {
  const k = topK || 3;

  // 1. 将知识点标题转为向量
  const queryText = knowledgePointTitle || knowledgePointId;
  const queryEmbedding = await embedQuery(queryText);

  // 2. 在向量库中搜索（排除当前知识点自己）
  const results = await vectorStore.similaritySearch(
    queryEmbedding,
    k + 1,  // 多取1个，以防当前知识点自己排在第一位
    context.userId,
    null  // 不限制资源ID，跨资料搜索
  );

  // 过滤掉相似度过高的结果（大概率是当前知识点自己）
  const filtered = results.filter(r =>
    !r.metadata.knowledgePointId ||
    r.metadata.knowledgePointId !== knowledgePointId
  ).slice(0, k);

  if (filtered.length === 0) {
    return {
      similarPoints: [],
      message: '在已有资料中暂未发现与本知识点高度关联的内容，可以继续深入当前知识点的学习'
    };
  }

  const formatted = filtered.map((r, i) => ({
    rank: i + 1,
    relatedContent: r.text.substring(0, 300),
    similarity: Math.round(r.score * 100) / 100,
    source: r.metadata.title || '未知资料'
  }));

  return {
    similarPoints: formatted,
    totalFound: formatted.length
  };
}

module.exports = searchSimilarPoints;
