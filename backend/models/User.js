const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: ''
  },
  learningProfile: {
    knowledgePoints: {
      type: Map,
      of: {
        mastery: { type: Number, default: 0 },
        wrongTypes: { type: [String], default: [] },
        lastPractice: { type: Date }
      },
      default: {}
    },
    weakAreas: {
      type: [String],
      default: []
    },
    totalLearningTime: {
      type: Number,
      default: 0
    },
    completedPoints: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('User', userSchema);