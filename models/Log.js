const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  commenterUsername: {
    type: String,
    required: true
  },
  commenterId: {
    type: String,
    default: 'Noma\'lum'
  },
  commentText: {
    type: String,
    required: true
  },
  commentId: {
    type: String,
    required: true
  },
  mediaId: {
    type: String,
    default: 'Noma\'lum'
  },
  replyStatus: {
    type: String,
    default: 'pending'
  },
  dmStatus: {
    type: String,
    default: 'pending'
  },
  error: {
    type: String,
    default: null
  }
});

module.exports = mongoose.model('Log', LogSchema);
