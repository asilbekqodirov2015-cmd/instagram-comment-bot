const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
  triggerType: {
    type: String,
    enum: ['all', 'keywords'],
    default: 'all'
  },
  keywords: {
    type: [String],
    default: []
  },
  commentReplyText: {
    type: String,
    default: 'Javobingizni lizingizga (DM) yubordik! 📩'
  },
  commentReplies: {
    type: [String],
    default: ['Javobingizni lizingizga (DM) yubordik! 📩']
  },
  dmType: {
    type: String,
    enum: ['text', 'image', 'video', 'text_image', 'text_video'],
    default: 'text'
  },
  dmText: {
    type: String,
    default: 'Salom! Bizga kommentariya qoldirganingiz uchun rahmat. Siz so\'ragan ma\'lumotlar shu yerda.'
  },
  dmMediaUrl: {
    type: String,
    default: ''
  },
  pageAccessToken: {
    type: String,
    default: ''
  },
  verifyToken: {
    type: String,
    default: 'instagram_bot_secret_token_2026'
  }
}, { timestamps: true });

module.exports = mongoose.model('Config', ConfigSchema);
