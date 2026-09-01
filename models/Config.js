const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  facebookPageId: {
    type: String,
    default: '',
    index: true
  },
  pageName: {
    type: String,
    default: ''
  },
  instagramAccountId: {
    type: String,
    default: ''
  },
  instagramUsername: {
    type: String,
    default: ''
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  lastConnectedAt: {
    type: Date
  },
  // Scope of Target Posts / Reels
  postScope: {
    type: String,
    enum: ['all', 'specific'],
    default: 'all'
  },
  targetMediaId: {
    type: String,
    default: ''
  },
  targetMediaUrl: {
    type: String,
    default: ''
  },
  targetMediaCaption: {
    type: String,
    default: ''
  },
  targetMediaThumbnail: {
    type: String,
    default: ''
  },
  // Comment Trigger Settings
  triggerType: {
    type: String,
    enum: ['all', 'keywords'],
    default: 'all'
  },
  keywords: {
    type: [String],
    default: []
  },
  // Atmetka / Mention commenter (@username)
  mentionUser: {
    type: Boolean,
    default: true
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
    enum: ['text', 'image', 'video', 'text_image', 'text_video', 'ai'],
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
  },
  // Gemini AI Sales Agent Settings
  aiEnabled: {
    type: Boolean,
    default: false
  },
  aiSystemPrompt: {
    type: String,
    default: 'Siz professional Instagram biznes yordamchisisiz. Mijozlarning so\'rovlariga samimiy, aniq va sotuvni rag\'batlantiruvchi tarzda o\'zbek tilida javob bering.'
  },
  aiTone: {
    type: String,
    enum: ['friendly', 'professional', 'sales'],
    default: 'friendly'
  },
  // Test Mode & Reply Limit Safety Cap
  replyLimit: {
    type: Number,
    default: 0 // 0 means unlimited, or 5, 10, 50
  },
  replyCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Config', ConfigSchema);
