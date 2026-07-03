/**
 * 内存向量存储 — 余弦相似度检索
 * Demo 阶段使用内存，生产阶段可替换为 LanceDB/PGVector
 */

class VectorStore {
  constructor() {
    // { id, text, embedding: number[], metadata: { resourceId, title, chunkIndex, userId } }
    this.documents = [];
    this.idCounter = 0;
  }

  /**
   * 批量添加文档块
   * @param {Array<{text: string, index: number}>} chunks - 文档切分结果
   * @param {number[][]} embeddings - 对应的向量数组
   * @param {{ resourceId: string, title: string, userId: string }} metadata
   */
  async addDocuments(chunks, embeddings, metadata) {
    if (chunks.length !== embeddings.length) {
      throw new Error(`chunks 数量(${chunks.length})与 embeddings 数量(${embeddings.length})不一致`);
    }

    const added = [];
    for (let i = 0; i < chunks.length; i++) {
      const doc = {
        id: `vec_${++this.idCounter}`,
        text: chunks[i].text,
        embedding: embeddings[i],
        metadata: {
          ...metadata,
          chunkIndex: chunks[i].index
        }
      };
      this.documents.push(doc);
      added.push(doc);
    }

    console.log(`[VectorStore] 入库 ${added.length} 个文档块，资源: ${metadata.title}`);
    return added;
  }

  /**
   * 余弦相似度检索
   * @param {number[]} queryEmbedding - 查询向量
   * @param {number} topK - 返回结果数
   * @param {string} userId - 可选，只检索特定用户的文档
   * @param {string} resourceId - 可选，只检索特定资源的文档
   */
  async similaritySearch(queryEmbedding, topK = 5, userId = null, resourceId = null) {
    // 按用户/资源过滤
    let candidates = this.documents;
    if (userId) {
      candidates = candidates.filter(d => d.metadata.userId === userId);
    }
    if (resourceId) {
      candidates = candidates.filter(d => d.metadata.resourceId === resourceId);
    }

    if (candidates.length === 0) {
      return [];
    }

    // 计算余弦相似度
    const scored = candidates.map(doc => ({
      id: doc.id,
      text: doc.text,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
      metadata: doc.metadata
    }));

    // 按相似度降序排列
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK);
  }

  /**
   * 混合检索：语义相似度 + 关键词BM25重排序
   * @param {string} query - 原始查询文本
   * @param {number[]} queryEmbedding - 查询向量
   * @param {number} topK
   * @param {string} userId
   * @param {string} resourceId
   */
  async hybridSearch(query, queryEmbedding, topK = 5, userId = null, resourceId = null) {
    // 先用语义搜索获取候选集（2倍 topK）
    const candidates = await this.similaritySearch(
      queryEmbedding,
      topK * 2,
      userId,
      resourceId
    );

    if (candidates.length === 0) {
      return [];
    }

    // BM25 关键词权重重排序
    const queryTerms = tokenize(query);
    const reranked = candidates.map(doc => {
      const bm25Score = computeBM25Score(doc.text, queryTerms);
      // 混合分数：70% 语义 + 30% 关键词
      doc.score = doc.score * 0.7 + bm25Score * 0.3;
      return doc;
    });

    reranked.sort((a, b) => b.score - a.score);
    return reranked.slice(0, topK);
  }

  /**
   * 按资源ID删除所有关联文档块
   */
  async deleteByResourceId(resourceId) {
    const before = this.documents.length;
    this.documents = this.documents.filter(
      d => d.metadata.resourceId !== resourceId
    );
    const removed = before - this.documents.length;
    console.log(`[VectorStore] 删除资源 ${resourceId} 的 ${removed} 个文档块`);
    return removed;
  }

  /**
   * 获取存储统计
   */
  getStats() {
    const resourceIds = new Set(this.documents.map(d => d.metadata.resourceId));
    return {
      totalChunks: this.documents.length,
      totalResources: resourceIds.size,
      avgChunkLength: this.documents.length > 0
        ? Math.round(this.documents.reduce((sum, d) => sum + d.text.length, 0) / this.documents.length)
        : 0
    };
  }
}

/**
 * 余弦相似度计算
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error(`向量维度不匹配: ${vecA.length} vs ${vecB.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

/**
 * 简单中文分词（基于字符级bigram + 单字）
 */
function tokenize(text) {
  const cleaned = text.replace(/[^一-龥a-zA-Z0-9]/g, ' ').toLowerCase();
  const terms = [];

  // 中文：bigram
  for (let i = 0; i < cleaned.length - 1; i++) {
    const bigram = cleaned.substring(i, i + 2);
    if (/[一-龥]/.test(bigram)) {
      terms.push(bigram);
    }
  }

  // 英文：按空格分词
  const words = cleaned.split(/\s+/).filter(w => w.length > 1);
  terms.push(...words);

  return terms;
}

/**
 * 简化版 BM25 分数计算
 */
function computeBM25Score(text, queryTerms) {
  const docTerms = tokenize(text);
  let score = 0;

  for (const qTerm of queryTerms) {
    const termFreq = docTerms.filter(t => t === qTerm).length;
    if (termFreq > 0) {
      // 简化的TF-IDF: TF * log(1 + 1/DF)
      score += Math.log(1 + termFreq);
    }
  }

  // 归一化到 [0, 1]
  return Math.min(1, score / (queryTerms.length || 1));
}

// 单例
const vectorStore = new VectorStore();

module.exports = vectorStore;
