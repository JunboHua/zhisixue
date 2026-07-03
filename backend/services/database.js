const mongoose = require('mongoose');
const User = require('../models/User');
const Resource = require('../models/Resource');
const LearningSession = require('../models/LearningSession');
const MemoryStore = require('./memoryStore');

let connected = false;

/**
 * 连接 MongoDB
 * @param {string} uri - MongoDB 连接字符串
 */
async function connect(uri) {
  if (!uri || uri === 'mongodb://localhost:27017/zhisixue') {
    // URI 是默认值，尝试连接，失败则回退内存
  }

  try {
    await mongoose.connect(uri || process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    connected = true;
    console.log('[DB] MongoDB 连接成功:', mongoose.connection.host);
  } catch (error) {
    connected = false;
    console.log('[DB] MongoDB 连接失败，回退到内存存储:', error.message);
    console.log('[DB] 内存模式 — 数据不会持久化，重启后丢失');
  }
}

function isConnected() {
  return connected;
}

// ========== User CRUD ==========

async function createUser(userData) {
  if (!connected) return MemoryStore.createUser(userData);
  const user = new User(userData);
  return user.save();
}

async function findUser(query) {
  if (!connected) return MemoryStore.findUser(query);

  // 将 MemoryStore 风格的查询转为 Mongoose 风格
  const mongoQuery = {};

  if (query._id) {
    mongoQuery._id = mongoose.Types.ObjectId.isValid(query._id)
      ? query._id
      : null;
    if (!mongoQuery._id) return null;
  }
  if (query.username) mongoQuery.username = query.username;
  if (query.email) mongoQuery.email = query.email;

  if (query.$or) {
    const orConditions = [];
    for (const cond of query.$or) {
      const c = {};
      if (cond.username) c.username = cond.username;
      if (cond.email) c.email = cond.email;
      if (Object.keys(c).length) orConditions.push(c);
    }
    if (orConditions.length) mongoQuery.$or = orConditions;
  }

  if (Object.keys(mongoQuery).length === 0) return null;
  return User.findOne(mongoQuery);
}

async function updateUser(userId, updateData) {
  if (!connected) return MemoryStore.updateUser(userId, updateData);

  const id = mongoose.Types.ObjectId.isValid(userId) ? userId : null;
  if (!id) return null;

  updateData.updatedAt = new Date();
  return User.findByIdAndUpdate(id, { $set: updateData }, { returnDocument: 'after' });
}

// ========== Resource CRUD ==========

async function createResource(resourceData) {
  if (!connected) return MemoryStore.createResource(resourceData);
  const resource = new Resource(resourceData);
  return resource.save();
}

async function findResources(query) {
  if (!connected) return MemoryStore.findResources(query);

  const filter = {};
  if (query.userId) {
    filter.userId = mongoose.Types.ObjectId.isValid(query.userId)
      ? query.userId : null;
  }
  return Resource.find(filter).sort({ createdAt: -1 });
}

async function findResourceById(id) {
  if (!connected) return MemoryStore.findResourceById(id);

  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Resource.findById(id);
}

async function updateResource(id, updateData) {
  if (!connected) return MemoryStore.updateResource(id, updateData);

  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Resource.findByIdAndUpdate(id, { $set: updateData }, { returnDocument: 'after' });
}

async function deleteResource(id) {
  if (!connected) return MemoryStore.deleteResource(id);

  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Resource.findByIdAndDelete(id);
}

// ========== LearningSession CRUD ==========

async function createSession(sessionData) {
  if (!connected) return MemoryStore.createSession(sessionData);
  const session = new LearningSession(sessionData);
  return session.save();
}

async function findSessions(query) {
  if (!connected) return MemoryStore.findSessions(query);

  const filter = {};
  if (query.userId) {
    filter.userId = mongoose.Types.ObjectId.isValid(query.userId)
      ? query.userId : null;
  }
  return LearningSession.find(filter).sort({ createdAt: -1 });
}

async function findSessionById(id) {
  if (!connected) return MemoryStore.findSessionById(id);

  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return LearningSession.findById(id);
}

async function updateSession(id, updateData) {
  if (!connected) return MemoryStore.updateSession(id, updateData);

  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return LearningSession.findByIdAndUpdate(id, { $set: updateData }, { returnDocument: 'after' });
}

module.exports = {
  connect,
  isConnected,
  createUser,
  findUser,
  updateUser,
  createResource,
  findResources,
  findResourceById,
  updateResource,
  deleteResource,
  createSession,
  findSessions,
  findSessionById,
  updateSession
};
