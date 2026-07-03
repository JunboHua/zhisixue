require('dotenv').config();
const express = require('express');
const cors = require('cors');
const database = require('./services/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/learning', require('./routes/learning'));
app.use('/api/agent', require('./routes/agent'));

app.get('/', (req, res) => {
  res.send('智思学 AI 苏格拉底学习助手 - 后端服务');
});

// 连接数据库后启动服务
async function start() {
  await database.connect(process.env.MONGODB_URI);
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`数据库模式: ${database.isConnected() ? 'MongoDB' : '内存存储'}`);
  });
}

start();