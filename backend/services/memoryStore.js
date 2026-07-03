let users = [];
let resources = [];
let sessions = [];
let userIdCounter = 1;
let resourceIdCounter = 1;
let sessionIdCounter = 1;

class MemoryStore {
  static async createUser(userData) {
    const user = {
      _id: `user_${userIdCounter++}`,
      ...userData,
      learningProfile: {
        knowledgePoints: {},
        weakAreas: [],
        totalLearningTime: 0,
        completedPoints: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    users.push(user);
    return user;
  }

  static async findUser(query) {
    return users.find(user => {
      if (query.username) return user.username === query.username;
      if (query.email) return user.email === query.email;
      if (query._id) return user._id === query._id;
      if (query.$or) {
        return query.$or.some(condition => {
          if (condition.username) return user.username === condition.username;
          if (condition.email) return user.email === condition.email;
          return false;
        });
      }
      return false;
    });
  }

  static async updateUser(userId, updateData) {
    const index = users.findIndex(u => u._id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], ...updateData, updatedAt: new Date() };
      return users[index];
    }
    return null;
  }

  static async createResource(resourceData) {
    const resource = {
      _id: `resource_${resourceIdCounter++}`,
      ...resourceData,
      createdAt: new Date()
    };
    resources.push(resource);
    return resource;
  }

  static async findResources(query) {
    return resources.filter(r => r.userId === query.userId);
  }

  static async findResourceById(id) {
    return resources.find(r => r._id === id);
  }

  static async updateResource(id, updateData) {
    const index = resources.findIndex(r => r._id === id);
    if (index !== -1) {
      resources[index] = { ...resources[index], ...updateData };
      return resources[index];
    }
    return null;
  }

  static async deleteResource(id) {
    const index = resources.findIndex(r => r._id === id);
    if (index !== -1) {
      return resources.splice(index, 1)[0];
    }
    return null;
  }

  static async createSession(sessionData) {
    const session = {
      _id: `session_${sessionIdCounter++}`,
      ...sessionData,
      interactions: [],
      createdAt: new Date()
    };
    sessions.push(session);
    return session;
  }

  static async findSessions(query) {
    return sessions.filter(s => s.userId === query.userId).reverse();
  }

  static async findSessionById(id) {
    return sessions.find(s => s._id === id);
  }

  static async updateSession(id, updateData) {
    const index = sessions.findIndex(s => s._id === id);
    if (index !== -1) {
      sessions[index] = { ...sessions[index], ...updateData };
      return sessions[index];
    }
    return null;
  }
}

module.exports = MemoryStore;