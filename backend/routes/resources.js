const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const database = require('../services/database');
const authenticate = require('../middleware/auth');
const aiService = require('../services/aiService');
const { splitDocument } = require('../services/chunkingService');
const { embedTexts } = require('../services/embeddingService');
const vectorStore = require('../services/vectorStore');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 Word 文档（.doc / .docx）'), false);
    }
  }
});

router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的文件' });
    }

    console.log('文件信息:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      path: req.file.path,
      size: req.file.size
    });

    const resource = await database.createResource({
      userId: req.user._id,
      title: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
      type: 'word',
      filePath: req.file.path,
      status: 'processing'
    });

    const content = await extractWordText(req.file.path);
    console.log('提取的文件内容长度:', content.length);
    console.log('提取的文件内容前200字:', content.substring(0, 200));
    resource.content = content;

    // --- RAG 索引：文档切分 + 向量化 + 入库 ---
    try {
      const chunks = splitDocument(content);
      if (chunks.length > 0) {
        const chunkTexts = chunks.map(c => c.text);
        console.log(`[RAG] 文档切分为 ${chunks.length} 块，开始向量化...`);
        const embeddings = await embedTexts(chunkTexts);
        await vectorStore.addDocuments(chunks, embeddings, {
          resourceId: resource._id,
          title: resource.title,
          userId: req.user._id
        });
        console.log(`[RAG] 文档索引完成: ${resource.title}`);
      }
    } catch (ragError) {
      // RAG 索引失败不应阻断上传流程
      console.error('[RAG] 索引失败（不影响上传）:', ragError.message);
    }

    const knowledgeResult = await aiService.parseKnowledge(content);
    console.log('AI解析结果:', JSON.stringify(knowledgeResult).substring(0, 500));
    resource.knowledgePoints = knowledgeResult.knowledgeTree || [
      { id: 'point1', title: '知识点1', description: '知识点1描述', parentId: '', level: 1 },
      { id: 'point2', title: '知识点2', description: '知识点2描述', parentId: '', level: 1 },
    ];
    resource.status = 'completed';

    await database.updateResource(resource._id, resource);

    res.json({
      message: '文件上传并解析成功',
      resource: {
        id: resource._id,
        title: resource.title,
        knowledgePoints: resource.knowledgePoints
      }
    });
  } catch (error) {
    console.error('上传处理错误:', error);
    res.status(500).json({ message: '文件上传失败', error: error.message });
  }
});

async function extractWordText(filePath) {
  // 1. 先尝试 mammoth（支持 .docx）
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value.trim();
    if (text.length > 50) return text.substring(0, 10000);
  } catch {}

  // 2. 尝试 officeparser（需要 LibreOffice）
  try {
    const officeparser = require('officeparser');
    const text = await officeparser.parseOfficeAsync(filePath);
    if (text && text.trim().length > 50) return text.trim().substring(0, 10000);
  } catch {}

  // 3. 二进制提取（适配旧版 .doc）
  try {
    const buf = fs.readFileSync(filePath);
    let raw = '';
    for (let i = 0; i < buf.length - 2; i++) {
      const code = buf.readUInt16LE(i);
      if ((code >= 0x4E00 && code <= 0x9FFF) ||
          (code >= 0x3000 && code <= 0x303F) ||
          (code >= 0xFF00 && code <= 0xFFEF) ||
          (code >= 0x0020 && code <= 0x007E) ||
          code === 0x000A || code === 0x000D) {
        raw += String.fromCharCode(code);
        i++;
      }
    }
    const lines = raw.split(/[\r\n]+/);
    const validLines = lines.filter(line => {
      const chineseCount = (line.match(/[一-鿿]/g) || []).length;
      return chineseCount >= 3 || (line.trim().length > 0 && chineseCount > 0);
    });
    const cleaned = validLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    if (cleaned.length > 80) return cleaned.substring(0, 10000);
  } catch {}

  return '无法解析此文档，请转换为 .docx 格式后重试。';
}

router.get('/list', authenticate, async (req, res) => {
  try {
    const resources = await database.findResources({ userId: req.user._id });
    
    res.json({ resources });
  } catch (error) {
    res.status(500).json({ message: '获取资源列表失败', error: error.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const resource = await database.findResourceById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ message: '资源不存在' });
    }

    if (resource.userId !== req.user._id) {
      return res.status(403).json({ message: '无权访问该资源' });
    }

    res.json({ resource });
  } catch (error) {
    res.status(500).json({ message: '获取资源失败', error: error.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const resource = await database.findResourceById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ message: '资源不存在' });
    }

    if (resource.userId !== req.user._id) {
      return res.status(403).json({ message: '无权删除该资源' });
    }

    fs.unlinkSync(resource.filePath);
    await Promise.all([
      database.deleteResource(req.params.id),
      vectorStore.deleteByResourceId(req.params.id)
    ]);

    res.json({ message: '资源删除成功' });
  } catch (error) {
    res.status(500).json({ message: '删除资源失败', error: error.message });
  }
});

module.exports = router;