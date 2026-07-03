const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  userAnswer: {
    type: String,
    required: true
  },
  analysis: {
    correctness: {
      type: String,
      enum: ['correct', 'partial', 'wrong']
    },
    errorType: {
      type: String,
      enum: ['concept', 'logic', 'missing', 'misunderstanding', 'calculation', 'other']
    },
    explanation: String
  },
  nextQuestion: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const learningSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resourceId: {
    type: String,
    required: true
  },
  knowledgePointId: {
    type: String,
    required: true
  },
  knowledgePointTitle: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'paused'],
    default: 'in_progress'
  },
  interactions: [interactionSchema],
  masteryChange: {
    type: Number,
    default: 0
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  duration: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('LearningSession', learningSessionSchema);