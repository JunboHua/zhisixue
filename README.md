 # 问乎 — AI 启发式问答

基于大语言模型的苏格拉底式智能学习助手。上传学习资料，AI 不直接给答案，而是通过层层反问引导学生自主思考，构建知识体系。

---

## 功能演示

```
上传资料 → AI 提取知识点 → 苏格拉底式问答

学生：函数是什么？
AI：   如果你要描述"气温随时间变化"这个现象，
       你觉得哪些量在变？它们之间有什么关系？
       
学生：时间和温度都在变，温度依赖于时间
AI：   很好！你发现了变量之间的依赖关系。
       那如果我说"早上8点和下午2点都是25°C"，
       这还满足你定义的依赖关系吗？
```

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | uni-app (Vue 3 + Pinia + TypeScript) |
| App | Capacitor 6 → Android APK |
| 后端 | Express.js (Node.js) |
| 数据库 | MongoDB Atlas |
| AI | DeepSeek API (deepseek-chat) |
| Agent | 自定义 Function Calling Loop（8 个工具） |
| RAG | 句子级 Chunking + 向量索引 + 混合检索 |
| 公网 | ngrok 隧道 |

## 项目结构

```
zhisixue/
├── README.md
├── RUN.md                          # 快速启动指南
├── 开发项目计划书.md                 # 详细架构文档
│
├── backend/
│   ├── index.js                    # 入口，Express 启动
│   ├── .env                        # 环境变量（需自行配置）
│   ├── models/                     # Mongoose 数据模型
│   │   ├── User.js
│   │   ├── Resource.js
│   │   └── LearningSession.js
│   ├── routes/                     # API 路由
│   │   ├── auth.js                 # 注册/登录
│   │   ├── resources.js            # 文件上传+解析+RAG入库
│   │   ├── learning.js             # 学习会话（兼容旧版）
│   │   ├── ai.js                   # AI 接口（兼容旧版）
│   │   └── agent.js                # Agent 接口（新版）
│   ├── services/                   # 核心服务
│   │   ├── database.js             # MongoDB/内存双模式
│   │   ├── aiService.js            # LLM 调用 + JSON 提取
│   │   ├── agentService.js         # Agent Loop + 工具调度
│   │   ├── memoryManager.js        # 对话历史管理
│   │   ├── chunkingService.js      # 文档切分
│   │   ├── embeddingService.js     # 文本向量化
│   │   ├── vectorStore.js          # 向量索引+检索
│   │   ├── memoryStore.js          # 内存存储（回退）
│   │   └── tools/                  # Agent 工具集
│   │       ├── registry.js         # 工具注册+Schema
│   │       ├── askQuestion.js      # 苏格拉底提问
│   │       ├── evaluateAnswer.js   # 答案评估
│   │       ├── provideHint.js      # 分层提示
│   │       ├── checkMastery.js     # 掌握度查询
│   │       ├── updateProfile.js    # 学习画像更新
│   │       ├── completeSession.js  # 会话完成
│   │       ├── searchKnowledge.js  # RAG 检索
│   │       └── searchSimilarPoints.js
│   └── middleware/
│       └── auth.js                 # JWT 认证
│
└── frontend/
    ├── capacitor.config.ts         # Capacitor 配置
    ├── android/                    # Android 原生项目
    ├── src/
    │   ├── pages/                  # 页面
    │   │   ├── index/index.vue     # 首页
    │   │   ├── auth/login.vue      # 登录
    │   │   ├── auth/register.vue   # 注册
    │   │   ├── resources/list.vue  # 资料列表
    │   │   ├── resources/upload.vue# 上传
    │   │   ├── learning/study.vue  # 学习页
    │   │   ├── learning/report.vue # 学习报告
    │   │   └── profile/profile.vue # 个人中心
    │   ├── stores/user.ts          # Pinia 状态
    │   └── utils/api.ts            # API 封装
    └── package.json
```

## 快速开始

### 1. 准备环境

- Node.js >= 20
- MongoDB Atlas 账号（免费）或本地 MongoDB

### 2. 配置环境变量

```bash
cd backend
cp .env.example .env   # 编辑 .env
```

```env
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/zhisixue
JWT_SECRET=your_jwt_secret
DEEPSEEK_API_KEY=sk-xxxxxxxx
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
DEEPSEEK_MODEL=deepseek-chat
```

### 3. 启动后端

```bash
cd backend
npm install
npm start        # → http://localhost:3000
```

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev:h5   # → http://localhost:5173
```

不配 MongoDB 也能运行 —— 自动回退内存存储。

## 构建 Android APK

```bash
cd frontend
npm run build:h5             # 构建 H5
npx cap sync                 # 同步到 Android 项目
```

然后用 Android Studio 打开 `frontend/android/`，Build → Build APK。

> 国内用户：Gradle/Maven 已配置腾讯云和阿里云镜像，无需代理。

## 公网访问（真机测试）

```bash
# 注册 https://ngrok.com，获取域名
ngrok http 3000 --domain=your-domain.ngrok-free.dev
```

然后修改 `frontend/src/utils/api.ts` 中的 `getBaseUrl()` 为 ngrok 地址，重新 Build APK。

## API 接口

### 认证

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/auth/register | 注册 | - |
| POST | /api/auth/login | 登录 | - |
| GET | /api/auth/profile | 个人信息 | JWT |

### 资料管理

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/resources/upload | 上传文件（PDF/Word/图片/文本） | JWT |
| GET | /api/resources/list | 资料列表 | JWT |
| GET | /api/resources/:id | 资料详情 | JWT |
| DELETE | /api/resources/:id | 删除资料 | JWT |

### Agent 教学

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/agent/start | 启动学习会话 | JWT |
| POST | /api/agent/chat | 发送消息 | JWT |

请求示例：

```bash
# 注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","email":"demo@test.com","password":"123456"}'

# 上传资料
curl -X POST http://localhost:3000/api/resources/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/document.pdf"

# 开始学习（Agent）
curl -X POST http://localhost:3000/api/agent/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"resourceId":"<rid>","knowledgePointId":"p1","knowledgePointTitle":"函数的定义"}'

# 对话
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"sessionId":"<sid>","message":"我认为函数就像一个黑盒..."}'
```

## Agent 架构

Agent 使用 OpenAI/DeepSeek Function Calling 协议，拥有 8 个工具自主决策教学：

```
学生回答 → evaluate_answer 评估 → check_mastery 查掌握度
    ↓
  正确 → update_profile(+15) → ask_question(高等)
  部分 → provide_hint → 反问引导
  错误 → provide_hint → ask_question(基础)
    ↓
  掌握度≥80% + 连续正确 → complete_session
```

## RAG 检索流程

```
文件上传 → 全文提取 → 句子级切分(~500字/块) 
    → Embedding 向量化 → 向量库存储
    ↓
Agent 教学时调用 search_knowledge
    → 混合检索(语义+关键词) → Top-K 原文段落
    → 注入上下文 → 基于原文生成回复
```

## 支持的文档格式

| 格式 | 状态 | 说明 |
|------|------|------|
| .txt | ✅ | 纯文本 |
| .pdf | ✅ | pdf-parse 提取 |
| .docx | ✅ | mammoth 提取 |
| .doc | ⚠️ | 二进制提取（建议转 .docx） |
| .png/.jpg | ⚠️ | 返回占位文本（待 OCR） |
| .ppt | ❌ | 模型已定义，提取待实现 |

## 环境变量

```env
# 服务端口
PORT=3000

# MongoDB 连接（留空则用内存存储）
MONGODB_URI=mongodb+srv://...

# JWT 密钥
JWT_SECRET=your_secret

# DeepSeek API
DEEPSEEK_API_KEY=sk-xxxx
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
DEEPSEEK_MODEL=deepseek-chat

# 开发模式
NODE_ENV=development
```

## 后续规划

- [ ] iOS 版本
- [ ] 流式 SSE 输出
- [ ] 语音问答
- [ ] 错题本 + 遗忘曲线复习
- [ ] 知识点图谱可视化
- [ ] 暗色模式
- [ ] Docker 部署

## License

MIT
