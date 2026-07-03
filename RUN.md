# 智思学项目运行指南

## 快速启动

### 1. 后端服务

```bash
cd backend
npm install
npm start
```

后端服务会在 http://localhost:3000 启动

### 2. 前端项目

```bash
cd frontend
npm install
npm run dev:h5
```

前端服务会在 http://localhost:5173 启动

## 环境配置

### 通义千问API配置

编辑 `backend/.env` 文件：

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/zhisixue
JWT_SECRET=zhisixue_secret_key_2024
QIANWEN_API_KEY=你的API_KEY
QIANWEN_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
NODE_ENV=development
```

### 获取API Key

1. 访问 https://dashscope.console.aliyun.com/
2. 登录/注册账号
3. 创建API Key
4. 确保已开通 qwen-turbo 模型服务（免费额度可用）

## 功能说明

### 当前模式
- **自动回退**: 当API不可用时，自动使用模拟数据
- **真实AI**: 配置有效的API Key后，会使用通义千问提供真实响应

### 可用模型
- qwen-turbo (推荐，成本低，速度快)
- qwen-plus
- qwen-max

## 测试API

```bash
# 注册用户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"123456"}'

# 开始学习
curl -X POST http://localhost:3000/api/learning/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 你的token" \
  -d '{"resourceId":"res1","knowledgePointId":"point1","knowledgePointTitle":"数学函数"}'
```

## 项目结构

```
zhisixue/
├── backend/
│   ├── routes/          # API路由
│   ├── services/        # 业务逻辑
│   ├── middleware/      # 中间件
│   ├── models/          # 数据模型
│   └── index.js         # 入口文件
└── frontend/
    ├── src/
    │   ├── pages/       # 页面
    │   ├── stores/      # 状态管理
    │   └── utils/       # 工具函数
    └── package.json
```
