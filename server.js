const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// Mongoose Models
const Config = require('./models/Config');
const Log = require('./models/Log');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

// --- CONFIGURATION MANAGEMENT ---

const DEFAULT_CONFIG = {
  triggerType: 'all',
  keywords: [],
  commentReplyText: 'Javobingizni lizingizga (DM) yubordik! 📩',
  commentReplies: ['Javobingizni lizingizga (DM) yubordik! 📩'],
  dmType: 'text',
  dmText: 'Salom! Bizga kommentariya qoldirganingiz uchun rahmat. Siz so\'ragan ma\'lumotlar shu yerda.',
  dmMediaUrl: '',
  pageAccessToken: '',
  verifyToken: process.env.INITIAL_VERIFY_TOKEN || 'instagram_bot_secret_token_2026'
};

// Helper: Get Config (Asynchronous)
async function getConfiguration() {
  if (isMongoConnected) {
    try {
      let config = await Config.findOne();
      if (!config) {
        config = new Config(DEFAULT_CONFIG);
        await config.save();
      }
      return config.toObject();
    } catch (error) {
      console.error('Error reading config from MongoDB, using local fallback:', error.message);
    }
  }

  // Local file fallback
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading local config file:', error.message);
  }
  return DEFAULT_CONFIG;
}

// Helper: Save Config (Asynchronous)
async function saveConfiguration(newConfig) {
  if (isMongoConnected) {
    try {
      let config = await Config.findOne();
      if (!config) {
        config = new Config(newConfig);
      } else {
        Object.assign(config, newConfig);
      }
      await config.save();
      return true;
    } catch (error) {
      console.error('Error saving config to MongoDB, saving locally:', error.message);
    }
  }

  // Local file saving fallback
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing local config file:', error.message);
    return false;
  }
}

// Helper: Write Log (Asynchronous)
async function writeLogEntry(logEntry) {
  const timestamp = new Date().toISOString();
  
  if (isMongoConnected) {
    try {
      const newLog = new Log({
        timestamp,
        ...logEntry
      });
      await newLog.save();
      return;
    } catch (error) {
      console.error('Error writing log to MongoDB, saving locally:', error.message);
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
      timestamp,
      ...logEntry
    };
    logs.unshift(newLog);
    if (logs.length > 200) {
      logs = logs.slice(0, 200); // Cap at 200 logs locally
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

// --- API ROUTES FOR DASHBOARD ---

// GET config
app.get('/api/config', async (req, res) => {
  const config = await getConfiguration();
  res.json(config);
});

// POST config
app.post('/api/config', async (req, res) => {
  const currentConfig = await getConfiguration();
  const newConfig = { ...currentConfig, ...req.body };
  
  const success = await saveConfiguration(newConfig);
  if (success) {
    res.json({ success: true, config: newConfig });
  } else {
    res.status(500).json({ success: false, message: 'Sozlamalarni saqlashda xatolik yuz berdi' });
  }
});

// GET logs
app.get('/api/logs', async (req, res) => {
  try {
    if (isMongoConnected) {
      // Fetch latest 100 logs from MongoDB
      const logs = await Log.find().sort({ timestamp: -1 }).limit(100);
      return res.json(logs);
    }
    
    if (fs.existsSync(LOGS_PATH)) {
      const data = fs.readFileSync(LOGS_PATH, 'utf8');
      return res.json(JSON.parse(data));
    }
    res.json([]);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET stats
app.get('/api/stats', async (req, res) => {
  try {
    if (isMongoConnected) {
      const totalComments = await Log.countDocuments();
      const successReplies = await Log.countDocuments({ replyStatus: 'success' });
      const successDMs = await Log.countDocuments({ dmStatus: 'success' });
      const failedCount = await Log.countDocuments({
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
    
    const totalComments = logs.length;
    const successReplies = logs.filter(l => l.replyStatus === 'success').length;
    const successDMs = logs.filter(l => l.dmStatus === 'success').length;
    const failedCount = logs.filter(l => l.replyStatus === 'failed' || l.dmStatus === 'failed').length;
    
    res.json({ totalComments, successReplies, successDMs, failedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Clear logs
app.post('/api/logs/clear', async (req, res) => {
  try {
    if (isMongoConnected) {
      await Log.deleteMany({});
      return res.json({ success: true });
    }
    
    fs.writeFileSync(LOGS_PATH, JSON.stringify([], null, 2), 'utf8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- WEBHOOK ROUTES ---

// GET: Webhook Verification
app.get('/webhook', async (req, res) => {
  const config = await getConfiguration();
  const verifyToken = config.verifyToken;

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook successfully verified!');
      res.status(200).send(challenge);
    } else {
      console.log('Webhook verification failed. Token mismatch.');
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// POST: Receive events from Instagram
app.post('/webhook', async (req, res) => {
  const body = req.body;
  const config = await getConfiguration();

  // Check if this is an event from Instagram subscription
  if (body.object === 'instagram') {
    for (const entry of body.entry) {
      if (!entry.changes) continue;
      
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

          // Skip if this is a reply to another comment
          if (parentId) {
            console.log(`Skipped comment reply: ${commentId}`);
            continue;
          }

          console.log(`Received new comment from @${commenterUsername}: "${commentText}"`);

          // 1. Keyword check
          let matchesFilter = false;
          if (config.triggerType === 'all') {
            matchesFilter = true;
          } else if (config.triggerType === 'keywords') {
            const lowerComment = commentText.toLowerCase();
            matchesFilter = config.keywords.some(keyword => {
              if (!keyword) return false;
              return lowerComment.includes(keyword.trim().toLowerCase());
            });
          }

          if (!matchesFilter) {
            console.log(`Comment "${commentText}" did not match keywords. Skipping response.`);
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
            console.error('Meta Access Token is missing.');
            logEntry.replyStatus = 'failed';
            logEntry.dmStatus = 'failed';
            logEntry.error = 'Meta Access Token kiritilmagan. Panel orqali sozlang.';
            await writeLogEntry(logEntry);
            continue;
          }

          // 2. Publish comment reply (Support Random Comment Replies)
          let replySuccess = false;
          try {
            // Select random reply from array or use default text
            const replies = config.commentReplies && config.commentReplies.length > 0 
              ? config.commentReplies 
              : [config.commentReplyText || 'Javobingizni lizingizga (DM) yubordik! 📩'];
            
            const selectedReply = replies[Math.floor(Math.random() * replies.length)];

            if (selectedReply && selectedReply.trim()) {
              await postCommentReply(commentId, selectedReply, pageAccessToken);
              logEntry.replyStatus = 'success';
              replySuccess = true;
              console.log(`Successfully replied to comment ${commentId} with: "${selectedReply}"`);
            } else {
              logEntry.replyStatus = 'skipped (matn bo\'sh)';
            }
          } catch (err) {
            console.error('Error replying to comment:', err.response?.data || err.message);
            logEntry.replyStatus = 'failed';
            const apiErr = err.response?.data?.error?.message || err.message;
            logEntry.error = `Comment reply error: ${apiErr}`;
          }

          // 3. Send DM (Direct Message)
          try {
            const recipient = { comment_id: commentId };

            if (config.dmType === 'text') {
              await sendMetaMessage(recipient, { text: config.dmText }, pageAccessToken);
              logEntry.dmStatus = 'success';
              console.log(`Sent DM (text) to commenter of ${commentId}`);

            } else if (config.dmType === 'image') {
              await sendMetaMessage(recipient, {
                attachment: {
                  type: 'image',
                  payload: { url: config.dmMediaUrl, is_reusable: true }
                }
              }, pageAccessToken);
              logEntry.dmStatus = 'success';
              console.log(`Sent DM (image) to commenter of ${commentId}`);

            } else if (config.dmType === 'video') {
              await sendMetaMessage(recipient, {
                attachment: {
                  type: 'video',
                  payload: { url: config.dmMediaUrl, is_reusable: true }
                }
              }, pageAccessToken);
              logEntry.dmStatus = 'success';
              console.log(`Sent DM (video) to commenter of ${commentId}`);

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
              console.log(`Sent DM (image + text) to commenter of ${commentId}`);

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
              console.log(`Sent DM (video + text) to commenter of ${commentId}`);
            }

          } catch (err) {
            console.error('Error sending DM:', err.response?.data || err.message);
            logEntry.dmStatus = 'failed';
            const apiErr = err.response?.data?.error?.message || err.message;
            logEntry.error = logEntry.error 
              ? `${logEntry.error} | DM error: ${apiErr}`
              : `DM error: ${apiErr}`;
          }

          // Write results to log (MongoDB or JSON)
          await writeLogEntry(logEntry);
        }
      }
    }
    
    // Return a 200 OK response to let Meta know we received the event
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Instagram auto-reply bot server is running on port ${PORT}`);
  console.log(`Dashboard available at: http://localhost:${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
});
