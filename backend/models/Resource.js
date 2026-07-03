const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['pdf', 'word', 'image', 'text', 'ppt'],
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  knowledgePoints: [{
    id: String,
    title: String,
    description: String,
    parentId: String,
    level: Number
  }],
  status: {
    type: String,
    enum: ['uploading', 'processing', 'completed', 'failed'],
    default: 'uploading'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Resource', resourceSchema);