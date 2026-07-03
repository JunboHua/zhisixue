const axios = require('axios');

const apiKey = process.env.DEEPSEEK_API_KEY;
const apiUrl = process.env.DEEPSEEK_EMBEDDING_URL || 'https://api.deepseek.com/v1/embeddings';
const useMock = !apiKey || apiKey === 'your_deepseek_api_key_here' || apiKey.includes('****');

// 模拟向量维度（与真实 API 保持一致）
const MOCK_EMBEDDING_DIM = 1536;

/**
 * 生成模拟向量（用于开发测试，无需 API Key）
 * 基于文本的简单哈希生成确定性向量，相同文本生成相同向量
 */
function generateMockEmbedding(text) {
  const vector = new Array(MOCK_EMBEDDING_DIM);
  let hash = 0;

  // 简单哈希函数：相同文本生成相同向量
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  // 用哈希种子生成向量
  for (let i = 0; i < MOCK_EMBEDDING_DIM; i++) {
    const seed = hash + i * 2654435761;
    const t = Math.sin(seed) * 10000;
    vector[i] = t - Math.floor(t);
  }

  // 归一化
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map(v => v / magnitude);
}

/**
 * 批量文本转向量
 * @param {string[]} texts - 文本数组（最多32条）
 * @returns {Promise<number[][]>} 向量数组
 */
async function embedTexts(texts) {
  if (useMock) {
    console.log(`[Embedding] Mock模式：为 ${texts.length} 条文本生成模拟向量`);
    return texts.map(text => generateMockEmbedding(text));
  }

  try {
    const response = await axios.post(
      apiUrl,
      {
        model: 'deepseek-chat',
        input: texts
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.data.map(d => d.embedding);
  } catch (error) {
    console.error('[Embedding] API调用失败，回退到Mock:', error.message);
    return texts.map(text => generateMockEmbedding(text));
  }
}

/**
 * 单条查询文本转向量
 * @param {string} query
 * @returns {Promise<number[]>}
 */
async function embedQuery(query) {
  const results = await embedTexts([query]);
  return results[0];
}

module.exports = { embedTexts, embedQuery };
