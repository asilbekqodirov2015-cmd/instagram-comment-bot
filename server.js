const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// Mongoose Models
const User = require('./models/User');
const Config = require('./models/Config');
const Log = require('./models/Log');

// Authentication middleware and routes
const auth = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const billingRoutes = require('./routes/billing');
const adminRoutes = require('./routes/admin');
const metaConnectRoutes = require('./routes/metaConnect');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mount Authentication & SaaS routes
app.use('/api/auth', authRoutes);
app.use('/api/billing', auth, billingRoutes);
app.use('/api/admin', auth, adminRoutes);
app.use('/api/meta', auth, metaConnectRoutes);

const CONFIG_PATH = path.join(__dirname, 'config.json');
const LOGS_PATH = path.join(__dirname, 'logs.json');

// --- DATABASE CONNECTION ---
let isMongoConnected = false;
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
  console.log('Connecting to MongoDB...');
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('Successfully connected to MongoDB!');
      isMongoConnected = true;
    })
    .catch(err => {
      console.error('MongoDB connection error, running in Local JSON fallback mode:', err.message);
      isMongoConnected = false;
    });
} else {
  console.log('MONGODB_URI environment variable is missing. Running in Local Mode with config.json and logs.json.');
}

// --- CONFIGURATION MANAGEMENT (SaaS Scoped by userId) ---

const DEFAULT_CONFIG = {
  facebookPageId: '',
  triggerType: 'all',
  keywords: [],
  commentReplyText: 'Javobingizni lizingizga (DM) yubordik! 📩',
  commentReplies: ['Javobingizni lizingizga (DM) yubordik! 📩'],
  dmType: 'text',
  dmText: 'Salom! Bizga kommentariya qoldirganingiz uchun rahmat. Siz so\'ragan ma\'lumotlar shu yerda.',
  dmMediaUrl: '',
  pageAccessToken: '',
  verifyToken: 'instagram_bot_secret_token_2026'
};

// Helper: Get Config for a specific user
async function getConfiguration(userId) {
  if (isMongoConnected) {
    try {
      let config = await Config.findOne({ userId });
      if (!config) {
        config = new Config({ userId, ...DEFAULT_CONFIG });
        await config.save();
      }
      return config.toObject();
    } catch (error) {
      console.error(`Error reading config from MongoDB for user ${userId}, using local fallback:`, error.message);
    }
  }

  // Local file fallback (scoped by userId)
  try {
    let configs = {};
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      configs = JSON.parse(data);
    }
    if (!configs[userId]) {
      configs[userId] = { userId, ...DEFAULT_CONFIG };
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(configs, null, 2), 'utf8');
    }
    return configs[userId];
  } catch (error) {
    console.error('Error reading local config file:', error.message);
  }
  return { userId, ...DEFAULT_CONFIG };
}

// Helper: Save Config for a specific user
async function saveConfiguration(userId, newConfig) {
  if (isMongoConnected) {
    try {
      let config = await Config.findOne({ userId });
      if (!config) {
        config = new Config({ userId, ...newConfig });
      } else {
        Object.assign(config, newConfig);
      }
      await config.save();
      return true;
    } catch (error) {
      console.error(`Error saving config to MongoDB for user ${userId}:`, error.message);
    }
  }

  // Local file saving fallback
  try {
    let configs = {};
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      configs = JSON.parse(data);
    }
    configs[userId] = { userId, ...newConfig };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configs, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing local config file:', error.message);
    return false;
  }
}

// Helper: Write Log Entry (SaaS Scoped by userId)
async function writeLogEntry(userId, logEntry) {
  const timestamp = new Date().toISOString();
  
  if (isMongoConnected) {
    try {
      const newLog = new Log({
        userId,
        timestamp,
        ...logEntry
      });
      await newLog.save();
      return;
    } catch (error) {
      console.error(`Error writing log to MongoDB for user ${userId}:`, error.message);
    }
  }

  // Local file saving fallback
  try {
    let logs = [];
    if (fs.existsSync(LOGS_PATH)) {
      const data = fs.readFileSync(LOGS_PATH, 'utf8');
      logs = JSON.parse(data);
    }
    const newLog = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      userId,
      timestamp,
      ...logEntry
    };
    logs.unshift(newLog);
    if (logs.length > 500) {
      logs = logs.slice(0, 500); // Cap at 500 logs locally
    }
    fs.writeFileSync(LOGS_PATH, JSON.stringify(logs, null, 2), 'utf8');
  } catch (error) {
    console.error('Error adding local log:', error.message);
  }
}

// Helper: Send Meta Message Request
async function sendMetaMessage(recipient, messageContent, accessToken) {
  const url = `https://graph.facebook.com/v20.0/me/messages`;
  const response = await axios.post(url, {
    recipient,
    message: messageContent
  }, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data;
}

// Helper: Post public comment reply
async function postCommentReply(commentId, replyText, accessToken) {
  const url = `https://graph.facebook.com/v20.0/${commentId}/replies`;
  const response = await axios.post(url, {
    message: replyText
  }, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data;
}

// --- API ROUTES FOR DASHBOARD (Protected by Auth middleware) ---

// GET config
app.get('/api/config', auth, async (req, res) => {
  const config = await getConfiguration(req.user.id);
  res.json(config);
});

// POST config
app.post('/api/config', auth, async (req, res) => {
  const currentConfig = await getConfiguration(req.user.id);
  const newConfig = { ...currentConfig, ...req.body };
  
  const success = await saveConfiguration(req.user.id, newConfig);
  if (success) {
    res.json({ success: true, config: newConfig });
  } else {
    res.status(500).json({ success: false, message: 'Sozlamalarni saqlashda xatolik yuz berdi' });
  }
});

// GET logs
app.get('/api/logs', auth, async (req, res) => {
  try {
    if (isMongoConnected) {
      // Fetch latest 100 logs for authenticated user
      const logs = await Log.find({ userId: req.user.id }).sort({ timestamp: -1 }).limit(100);
      return res.json(logs);
    }
    
    if (fs.existsSync(LOGS_PATH)) {
      const data = fs.readFileSync(LOGS_PATH, 'utf8');
      const allLogsList = JSON.parse(data);
      // Filter logs by userId
      const userLogs = allLogsList.filter(l => l.userId === req.user.id);
      return res.json(userLogs);
    }
    res.json([]);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET stats
app.get('/api/stats', auth, async (req, res) => {
  try {
    if (isMongoConnected) {
      const totalComments = await Log.countDocuments({ userId: req.user.id });
      const successReplies = await Log.countDocuments({ userId: req.user.id, replyStatus: 'success' });
      const successDMs = await Log.countDocuments({ userId: req.user.id, dmStatus: 'success' });
      const failedCount = await Log.countDocuments({
        userId: req.user.id,
        $or: [{ replyStatus: 'failed' }, { dmStatus: 'failed' }]
      });
      return res.json({ totalComments, successReplies, successDMs, failedCount });
    }
    
    // Local JSON stats aggregator fallback
    let logs = [];
    if (fs.existsSync(LOGS_PATH)) {
      const data = fs.readFileSync(LOGS_PATH, 'utf8');
      logs = JSON.parse(data);
    }
    
    const userLogs = logs.filter(l => l.userId === req.user.id);
    const totalComments = userLogs.length;
    const successReplies = userLogs.filter(l => l.replyStatus === 'success').length;
    const successDMs = userLogs.filter(l => l.dmStatus === 'success').length;
    const failedCount = userLogs.filter(l => l.replyStatus === 'failed' || l.dmStatus === 'failed').length;
    
    res.json({ totalComments, successReplies, successDMs, failedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Clear logs
app.post('/api/logs/clear', auth, async (req, res) => {
  try {
    if (isMongoConnected) {
      await Log.deleteMany({ userId: req.user.id });
      return res.json({ success: true });
    }
    
    let logs = [];
    if (fs.existsSync(LOGS_PATH)) {
      const data = fs.readFileSync(LOGS_PATH, 'utf8');
      logs = JSON.parse(data);
    }
    // Delete logs of this user
    const remainingLogs = logs.filter(l => l.userId !== req.user.id);
    fs.writeFileSync(LOGS_PATH, JSON.stringify(remainingLogs, null, 2), 'utf8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Local test simulation trigger
app.post('/api/test-trigger', auth, async (req, res) => {
  try {
    const { username, comment, mediaId } = req.body;
    const config = await getConfiguration(req.user.id);

    // Check post scope if mediaId is provided
    if (config.postScope === 'specific' && config.targetMediaId && mediaId && mediaId !== config.targetMediaId) {
      return res.status(400).json({
        success: false,
        message: `Ushbu post/video bot tomonidan kuzatilmayapti. Bot faqat tanlangan postga (${config.targetMediaCaption || config.targetMediaId}) javob berishga sozlangan.`
      });
    }

    // Check keywords
    let matches = false;
    if (config.triggerType === 'all') {
      matches = true;
    } else if (config.triggerType === 'keywords') {
      const lower = (comment || '').toLowerCase();
      matches = (config.keywords || []).some(kw => kw && lower.includes(kw.trim().toLowerCase()));
    }

    if (!matches) {
      return res.status(400).json({
        success: false,
        message: `Komment kalit so'zlarga to'g'ri kelmadi. Kalit so'zlar: [${(config.keywords || []).join(', ')}]`
      });
    }

    // Format reply with mention
    const replies = config.commentReplies && config.commentReplies.length > 0 
      ? config.commentReplies 
      : [config.commentReplyText || 'Javobingizni lizingizga (DM) yubordik! 📩'];
    const selectedReply = replies[Math.floor(Math.random() * replies.length)];

    let formattedReply = selectedReply;
    if (formattedReply.includes('{username}')) {
      formattedReply = formattedReply.replace(/\{username\}/gi, `@${username}`);
    } else if (config.mentionUser !== false && username) {
      formattedReply = `@${username} ${formattedReply}`;
    }

    // Format DM
    const formattedDm = (config.dmText || '').replace(/\{username\}/gi, username);

    // Write test log
    await writeLogEntry(req.user.id, {
      commenterUsername: username,
      commenterId: 'test_user_123',
      commentText: comment,
      commentId: 'test_cmt_' + Date.now(),
      mediaId: mediaId || config.targetMediaId || 'test_media_123',
      replyText: formattedReply,
      dmText: formattedDm,
      dmType: config.dmType || 'text',
      replyStatus: 'success',
      dmStatus: 'success'
    });

    res.json({
      success: true,
      message: 'Test simulyatsiyasi muvaffaqiyatli yakunlandi! Kommentga @atmetka bilan javob berildi va DM yuborildi.',
      reply: formattedReply,
      dm: formattedDm
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Test xatoligi: ' + err.message });
  }
});

// --- WEBHOOK ROUTES (SaaS Dynamic Routing) ---

// GET: Webhook Verification (Checks against App Master verify token)
app.get('/webhook', (req, res) => {
  const MASTER_VERIFY_TOKEN = process.env.INITIAL_VERIFY_TOKEN || 'instagram_bot_secret_token_2026';

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === MASTER_VERIFY_TOKEN) {
      console.log('Webhook Master Verification Successful!');
      res.status(200).send(challenge);
    } else {
      console.log('Webhook verification failed. Token mismatch.');
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// POST: Receive events from Instagram and Route to matching User Configuration dynamically
app.post('/webhook', async (req, res) => {
  const body = req.body;

  // Check if this is an event from Instagram subscription
  if (body.object === 'instagram') {
    for (const entry of body.entry) {
      const entryPageId = entry.id; // Facebook Page ID receiving the comment
      if (!entry.changes || !entryPageId) continue;
      
      // Dynamic Lookup: Find configuration matching the incoming Facebook Page ID
      let config = null;
      if (isMongoConnected) {
        config = await Config.findOne({ facebookPageId: entryPageId });
      } else {
        // Local fallback lookup
        let configs = {};
        if (fs.existsSync(CONFIG_PATH)) {
          configs = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        }
        const foundUserId = Object.keys(configs).find(uid => configs[uid].facebookPageId === entryPageId);
        if (foundUserId) {
          config = configs[foundUserId];
        }
      }

      if (!config) {
        console.log(`[ROUTE SKIP] No user configuration found for Facebook Page ID: ${entryPageId}. Skipping webhook.`);
        continue;
      }

      const activeUserId = config.userId;

      for (const change of entry.changes) {
        if (change.field === 'comments') {
          const comment = change.value;
          if (!comment || !comment.id) continue;

          const commentId = comment.id;
          const commentText = comment.text || '';
          const commenterUsername = comment.from ? comment.from.username : 'Noma\'lum';
          const commenterId = comment.from ? comment.from.id : 'Noma\'lum';
          const mediaId = comment.media ? comment.media.id : 'Noma\'lum';
          const parentId = comment.parent_id;

          // Skip replies to other comments
          if (parentId) {
            console.log(`Skipped comment reply: ${commentId}`);
            continue;
          }

          // 0. Post / Video Scope Check (Specific Post or All Posts)
          if (config.postScope === 'specific' && config.targetMediaId) {
            if (mediaId && mediaId !== 'Noma\'lum' && mediaId !== config.targetMediaId) {
              console.log(`[USER ${activeUserId}] Comment on media ${mediaId} does not match target media ${config.targetMediaId}. Skipping.`);
              continue;
            }
          }

          console.log(`[USER ${activeUserId}] Processing comment from @${commenterUsername} on media ${mediaId}: "${commentText}"`);

          // 1. Keyword check
          let matchesFilter = false;
          if (config.triggerType === 'all') {
            matchesFilter = true;
          } else if (config.triggerType === 'keywords') {
            const lowerComment = commentText.toLowerCase();
            matchesFilter = (config.keywords || []).some(keyword => {
              if (!keyword) return false;
              return lowerComment.includes(keyword.trim().toLowerCase());
            });
          }

          if (!matchesFilter) {
            console.log(`[USER ${activeUserId}] Comment did not match keywords. Skipping.`);
            continue;
          }

          // Setup log information
          const logEntry = {
            commenterUsername,
            commenterId,
            commentText,
            commentId,
            mediaId,
            replyStatus: 'pending',
            dmStatus: 'pending',
            error: null
          };

          const pageAccessToken = config.pageAccessToken;
          if (!pageAccessToken) {
            console.error(`[USER ${activeUserId}] Page Access Token is missing.`);
            logEntry.replyStatus = 'failed';
            logEntry.dmStatus = 'failed';
            logEntry.error = 'Page Access Token kiritilmagan. Panelda sozlang.';
            await writeLogEntry(activeUserId, logEntry);
            continue;
          }

          // 2. Publish comment reply with @mention and {username} support
          let replySuccess = false;
          try {
            const replies = config.commentReplies && config.commentReplies.length > 0 
              ? config.commentReplies 
              : [config.commentReplyText || 'Javobingizni lizingizga (DM) yubordik! 📩'];
            
            const selectedReply = replies[Math.floor(Math.random() * replies.length)];

            let formattedReply = selectedReply;
            if (formattedReply.includes('{username}')) {
              formattedReply = formattedReply.replace(/\{username\}/gi, `@${commenterUsername}`);
            } else if (config.mentionUser !== false && commenterUsername && commenterUsername !== "Noma'lum") {
              formattedReply = `@${commenterUsername} ${formattedReply}`;
            }

            if (formattedReply && formattedReply.trim()) {
              await postCommentReply(commentId, formattedReply, pageAccessToken);
              logEntry.replyStatus = 'success';
              logEntry.replyText = formattedReply;
              replySuccess = true;
              console.log(`[USER ${activeUserId}] Replied to ${commentId} with: "${formattedReply}"`);
            } else {
              logEntry.replyStatus = 'skipped (matn bo\'sh)';
            }
          } catch (err) {
            console.error(`[USER ${activeUserId}] Error replying to comment:`, err.response?.data || err.message);
            logEntry.replyStatus = 'failed';
            const apiErr = err.response?.data?.error?.message || err.message;
            logEntry.error = `Comment reply error: ${apiErr}`;
          }

          // 3. Send DM (Direct Message) with {username} placeholder replacement
          try {
            const recipient = { comment_id: commentId };
            const formattedDmText = (config.dmText || '').replace(/\{username\}/gi, commenterUsername || 'do\'stimiz');

            if (config.dmType === 'text') {
              await sendMetaMessage(recipient, { text: config.dmText }, pageAccessToken);
              logEntry.dmStatus = 'success';
              console.log(`[USER ${activeUserId}] Sent DM (text) to commenter of ${commentId}`);

            } else if (config.dmType === 'image') {
              await sendMetaMessage(recipient, {
                attachment: {
                  type: 'image',
                  payload: { url: config.dmMediaUrl, is_reusable: true }
                }
              }, pageAccessToken);
              logEntry.dmStatus = 'success';
              console.log(`[USER ${activeUserId}] Sent DM (image) to commenter of ${commentId}`);

            } else if (config.dmType === 'video') {
              await sendMetaMessage(recipient, {
                attachment: {
                  type: 'video',
                  payload: { url: config.dmMediaUrl, is_reusable: true }
                }
              }, pageAccessToken);
              logEntry.dmStatus = 'success';
              console.log(`[USER ${activeUserId}] Sent DM (video) to commenter of ${commentId}`);

            } else if (config.dmType === 'text_image') {
              await sendMetaMessage(recipient, {
                attachment: {
                  type: 'image',
                  payload: { url: config.dmMediaUrl, is_reusable: true }
                }
              }, pageAccessToken);
              
              await new Promise(resolve => setTimeout(resolve, 500));
              
              await sendMetaMessage(recipient, { text: config.dmText }, pageAccessToken);
              logEntry.dmStatus = 'success';
              console.log(`[USER ${activeUserId}] Sent DM (image + text) to commenter of ${commentId}`);

            } else if (config.dmType === 'text_video') {
              await sendMetaMessage(recipient, {
                attachment: {
                  type: 'video',
                  payload: { url: config.dmMediaUrl, is_reusable: true }
                }
              }, pageAccessToken);

              await new Promise(resolve => setTimeout(resolve, 500));

              await sendMetaMessage(recipient, { text: config.dmText }, pageAccessToken);
              logEntry.dmStatus = 'success';
              console.log(`[USER ${activeUserId}] Sent DM (video + text) to commenter of ${commentId}`);
            }

          } catch (err) {
            console.error(`[USER ${activeUserId}] Error sending DM:`, err.response?.data || err.message);
            logEntry.dmStatus = 'failed';
            const apiErr = err.response?.data?.error?.message || err.message;
            logEntry.error = logEntry.error 
              ? `${logEntry.error} | DM error: ${apiErr}`
              : `DM error: ${apiErr}`;
          }

          // Write results to log
          await writeLogEntry(activeUserId, logEntry);
        }
      }
    }
    
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Instagram SaaS Webhook and API server is running on port ${PORT}`);
  console.log(`Authentication APIs mounted at /api/auth`);
  console.log(`Protected User Dashboard APIs mounted at /api/*`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
});
