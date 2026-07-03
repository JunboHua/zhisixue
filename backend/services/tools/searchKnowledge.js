const vectorStore = require('../vectorStore');
const { embedQuery } = require('../embeddingService');
const database = require('../database');

/**
 * RAG 检索工具：在学生上传的学习资料中搜索相关内容
 *
 * 使用场景：
 * - 学生追问"为什么"、"能举个例子吗"时
 * - Agent 需要引用原文来支撑提问时
 * - 学生理解偏差，需要调取原文解释时
 */
async function searchKnowledge({ query, resourceId, topK }, context) {
  const k = topK || 5;

  // 1. 将查询转为向量
  const queryEmbedding = await embedQuery(query);

  // 2. 混合检索（语义 + 关键词）
  const results = await vectorStore.hybridSearch(
    query,
    queryEmbedding,
    k,
    context.userId,
    resourceId || null
  );

  // 3. 格式化返回结果
  if (results.length === 0) {
    return {
      results: [],
      message: '未找到与查询相关的资料内容'
    };
  }

  const formatted = results.map((r, i) => ({
    rank: i + 1,
    text: r.text,
    relevance: Math.round(r.score * 100) / 100,
    source: r.metadata.title || '未知资料',
    location: `第${r.metadata.chunkIndex + 1}段`
  }));

  return {
    results: formatted,
    totalFound: formatted.length,
    query: query
  };
}

module.exports = searchKnowledge;
