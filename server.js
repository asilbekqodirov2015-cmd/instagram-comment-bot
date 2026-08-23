const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const CONFIG_PATH = path.join(__dirname, 'config.json');
const LOGS_PATH = path.join(__dirname, 'logs.json');

// Helper: Read Config
function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading config file, using defaults:', error.message);
  }
  return {
    triggerType: 'all',
    keywords: [],
    commentReplyText: 'Javobingizni lizingizga (DM) yubordik! 📩',
    dmType: 'text',
    dmText: 'Salom! Bizga kommentariya qoldirganingiz uchun rahmat. Siz so\'ragan ma\'lumotlar shu yerda.',
    dmMediaUrl: '',
    pageAccessToken: '',
    verifyToken: process.env.INITIAL_VERIFY_TOKEN || 'instagram_bot_secret_token_2026'
  };
}

// Helper: Write Config
function writeConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing config file:', error.message);
    return false;
  }
}

// Helper: Add Log
function addLog(logEntry) {
  try {
    let logs = [];
    if (fs.existsSync(LOGS_PATH)) {
      const data = fs.readFileSync(LOGS_PATH, 'utf8');
      logs = JSON.parse(data);
    }
    const newLog = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      ...logEntry
    };
    logs.unshift(newLog); // Add to beginning of array
    // Cap logs at 100 entries to prevent file bloating
    if (logs.length > 100) {
      logs = logs.slice(0, 100);
    }
    fs.writeFileSync(LOGS_PATH, JSON.stringify(logs, null, 2), 'utf8');
  } catch (error) {
    console.error('Error adding log:', error.message);
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
app.get('/api/config', (req, res) => {
  const config = readConfig();
  res.json(config);
});

// POST config
app.post('/api/config', (req, res) => {
  const currentConfig = readConfig();
  const newConfig = { ...currentConfig, ...req.body };
  
  if (writeConfig(newConfig)) {
    res.json({ success: true, config: newConfig });
  } else {
    res.status(500).json({ success: false, message: 'Faylga yozishda xatolik yuz berdi' });
  }
});

// GET logs
app.get('/api/logs', (req, res) => {
  try {
    if (fs.existsSync(LOGS_PATH)) {
      const data = fs.readFileSync(LOGS_PATH, 'utf8');
      return res.json(JSON.parse(data));
    }
    res.json([]);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Clear logs
app.post('/api/logs/clear', (req, res) => {
  try {
    fs.writeFileSync(LOGS_PATH, JSON.stringify([], null, 2), 'utf8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- WEBHOOK ROUTES ---

// GET: Webhook Verification
app.get('/webhook', (req, res) => {
  const config = readConfig();
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
  const config = readConfig();

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
          const parentId = comment.parent_id; // Check if this is a reply to another comment

          // Skip if this is a reply to a comment (to prevent endless reply loops)
          if (parentId) {
            console.log(`Skipped comment reply: ${commentId}`);
            continue;
          }

          // Check if we already processed this comment or if it's the bot's own page username
          // Webhooks can send page's own replies sometimes depending on subscription
          // (Usually Meta filters this, but safety check is good)

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
            console.error('Meta Access Token is missing. Configure it in the Dashboard.');
            logEntry.replyStatus = 'failed';
            logEntry.dmStatus = 'failed';
            logEntry.error = 'Meta Access Token kiritilmagan. Panel orqali sozlang.';
            addLog(logEntry);
            continue;
          }

          // 2. Publish comment reply
          let replySuccess = false;
          try {
            if (config.commentReplyText && config.commentReplyText.trim()) {
              await postCommentReply(commentId, config.commentReplyText, pageAccessToken);
              logEntry.replyStatus = 'success';
              replySuccess = true;
              console.log(`Successfully replied to comment ${commentId}`);
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
              // Send Text only
              await sendMetaMessage(recipient, { text: config.dmText }, pageAccessToken);
              logEntry.dmStatus = 'success';
              console.log(`Sent DM (text) to commenter of ${commentId}`);

            } else if (config.dmType === 'image') {
              // Send Image only
              await sendMetaMessage(recipient, {
                attachment: {
                  type: 'image',
                  payload: { url: config.dmMediaUrl, is_reusable: true }
                }
              }, pageAccessToken);
              logEntry.dmStatus = 'success';
              console.log(`Sent DM (image) to commenter of ${commentId}`);

            } else if (config.dmType === 'video') {
              // Send Video only
              await sendMetaMessage(recipient, {
                attachment: {
                  type: 'video',
                  payload: { url: config.dmMediaUrl, is_reusable: true }
                }
              }, pageAccessToken);
              logEntry.dmStatus = 'success';
              console.log(`Sent DM (video) to commenter of ${commentId}`);

            } else if (config.dmType === 'text_image') {
              // Send Image first, then Text
              await sendMetaMessage(recipient, {
                attachment: {
                  type: 'image',
                  payload: { url: config.dmMediaUrl, is_reusable: true }
                }
              }, pageAccessToken);
              
              // Wait 500ms
              await new Promise(resolve => setTimeout(resolve, 500));
              
              await sendMetaMessage(recipient, { text: config.dmText }, pageAccessToken);
              logEntry.dmStatus = 'success';
              console.log(`Sent DM (image + text) to commenter of ${commentId}`);

            } else if (config.dmType === 'text_video') {
              // Send Video first, then Text
              await sendMetaMessage(recipient, {
                attachment: {
                  type: 'video',
                  payload: { url: config.dmMediaUrl, is_reusable: true }
                }
              }, pageAccessToken);

              // Wait 500ms
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

          // Write results to log
          addLog(logEntry);
        }
      }
    }
    
    // Return a 200 OK response to let Meta know we received the event
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // 404 if not an instagram event
    res.sendStatus(404);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Instagram auto-reply bot server is running on port ${PORT}`);
  console.log(`Dashboard available at: http://localhost:${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
});
