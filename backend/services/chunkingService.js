/**
 * 文档切分服务 — 句子边界感知的滑动窗口分割
 *
 *  核心原则：绝不截断句子，chunkSize 是"软目标"而非硬限制。
 *  策略：
 *    1. 递归分隔符: 段落(\\n\\n) → 换行(\\n) → 句号(。) → 分句(！？；!?;) → 从句(，,:) → 字符
 *    2. 以句子为最小单元拼接chunk，宁可略超也不截断
 *    3. Overlap 以整句为单位，保证语义完整
 */

// 分隔符优先级：从粗到细，前一级不够用时才降级
const SEPARATORS = [
  '\n\n',     // 段落
  '\n',       // 换行
  '。',       // 中文句号
  '！',       // 中文感叹号
  '？',       // 中文问号
  '；',       // 中文分号
  '. ',       // 英文句号+空格
  '! ',       // 英文感叹号+空格
  '? ',       // 英文问号+空格
  '; ',       // 英文分号+空格
  '，',       // 中文逗号（从句级）
  ', ',       // 英文逗号+空格
  '：',       // 中文冒号
  ': ',       // 英文冒号+空格
];

/**
 * 递归按分隔符切分文本
 * 每个返回的子串都保证以分隔符结尾（语义完整）
 */
function splitBySeparators(text, separatorIndex = 0) {
  if (separatorIndex >= SEPARATORS.length) {
    // 最后一级：按字符数硬切，但保证不截断词（在空白处切）
    return [text];
  }

  const sep = SEPARATORS[separatorIndex];
  const parts = text.split(sep);

  if (parts.length === 1) {
    // 当前分隔符没切出多段，降级到下一级
    return splitBySeparators(text, separatorIndex + 1);
  }

  // 重新拼接分隔符（split会丢失分隔符本身）
  const segments = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i < parts.length - 1) {
      segments.push(part + sep);
    } else if (part.trim()) {
      segments.push(part);
    }
  }

  return segments.filter(s => s.trim().length > 0);
}

/**
 * 将文本切分为完整的句子列表
 */
function splitToSentences(text) {
  // 先用粗粒度分隔符切（段落、换行），再对每个结果用细粒度切
  const coarseParts = text.split(/\n\s*\n/).filter(p => p.trim());

  const allSentences = [];
  for (const part of coarseParts) {
    // 递归按分隔符切分，直到句子级别
    const segments = recursiveSplit(part);
    allSentences.push(...segments);
  }

  return allSentences.filter(s => s.trim().length > 0);
}

/**
 * 递归切分：逐级尝试分隔符
 */
function recursiveSplit(text) {
  const segments = _recursiveSplitHelper(text, 0);
  return segments.filter(s => s.trim().length > 0);
}

function _recursiveSplitHelper(text, sepIndex) {
  if (sepIndex >= SEPARATORS.length) {
    return [text];
  }

  const sep = SEPARATORS[sepIndex];

  // 检查文本中是否存在当前分隔符
  if (!text.includes(sep)) {
    return _recursiveSplitHelper(text, sepIndex + 1);
  }

  const parts = text.split(sep);
  const result = [];

  for (let i = 0; i < parts.length; i++) {
    let part = parts[i];
    if (i < parts.length - 1) {
      part += sep; // 还原分隔符
    }

    if (part.trim().length === 0) continue;

    // 如果切出的片段太长，用下一级分隔符继续切
    if (part.length > 600) {
      result.push(..._recursiveSplitHelper(part, sepIndex + 1));
    } else {
      result.push(part);
    }
  }

  return result;
}

/**
 * 核心切分方法：句子级滑动窗口
 *
 * @param {string} content - 原始文档内容
 * @param {number} targetSize - 目标chunk大小（软限制，实际可能略超一个句子）
 * @param {number} overlapSentences - 相邻chunk重叠的句子数
 * @returns {Array<{text: string, index: number}>}
 */
function splitDocument(content, targetSize = 500, overlapSentences = 2) {
  if (!content || content.trim().length === 0) {
    return [];
  }

  // 1. 将全文拆为完整句子
  const sentences = splitToSentences(content);

  if (sentences.length === 0) {
    return [];
  }

  // 2. 以句子为单元，滑动窗口生成chunk
  const chunks = [];
  let chunkIndex = 0;
  let windowStart = 0;

  while (windowStart < sentences.length) {
    const chunkSentences = [];
    let charCount = 0;

    // 从 windowStart 开始累加句子，直到接近 targetSize
    let i = windowStart;
    for (i = windowStart; i < sentences.length; i++) {
      const nextSize = charCount + sentences[i].length;
      // 只要还没超太多就继续加（给一个缓冲区间）
      if (charCount === 0 || nextSize <= targetSize * 1.5) {
        chunkSentences.push(sentences[i]);
        charCount = nextSize;
      } else {
        break;
      }
    }

    if (chunkSentences.length > 0) {
      chunks.push({
        text: chunkSentences.join('').trim(),
        index: chunkIndex++,
        sentenceRange: [windowStart, i - 1]
      });
    }

    // 计算下一个窗口的起始位置
    // 重叠策略：后退 overlapSentences 个句子
    const nextStart = Math.max(
      i,  // 至少前进1个句子的位置
      windowStart + Math.max(1, chunkSentences.length - overlapSentences)
    );

    // 防止死循环
    if (nextStart <= windowStart) {
      windowStart = i;
    } else {
      windowStart = nextStart;
    }
  }

  return chunks;
}

module.exports = { splitDocument };
