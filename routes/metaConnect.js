const express = require('express');
const axios = require('axios');
const Config = require('../models/Config');
const auth = require('../middleware/auth');

const router = express.Router();

// High Quality Sample Demo Posts for testing & instant preview
const DEMO_POSTS = [
  {
    id: 'demo_reel_17849901',
    caption: 'Yangi yozgi kolleksiyamiz yetib keldi! Narxi va o\'lchamlarini bilish uchun izohda "narx" deb yozing 🔥',
    mediaType: 'VIDEO',
    mediaUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
    permalink: 'https://instagram.com/reel/demo_reel_17849901',
    likeCount: 1420,
    commentsCount: 184,
    timestamp: new Date().toISOString()
  },
  {
    id: 'demo_reel_17849902',
    caption: 'TOP 5 ta eng ko\'p sotilayotgan mahsulotimiz! Katalog va narxlar Direct (DM)da 📩',
    mediaType: 'VIDEO',
    mediaUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80',
    permalink: 'https://instagram.com/reel/demo_reel_17849902',
    likeCount: 890,
    commentsCount: 97,
    timestamp: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'demo_post_17849903',
    caption: 'Katta chegirma e\'lon qilamiz! 30% skidka promokodini olish uchun "info" deb izoh qoldiring ✨',
    mediaType: 'IMAGE',
    mediaUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80',
    permalink: 'https://instagram.com/p/demo_post_17849903',
    likeCount: 2310,
    commentsCount: 312,
    timestamp: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 'demo_reel_17849904',
    caption: 'Mijozlarimizdan kelgan real sharhlar va buyurtmani qabul qilish jarayoni 🎬',
    mediaType: 'VIDEO',
    mediaUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80',
    permalink: 'https://instagram.com/reel/demo_reel_17849904',
    likeCount: 650,
    commentsCount: 42,
    timestamp: new Date(Date.now() - 259200000).toISOString()
  }
];

/**
 * POST /api/meta/auto-resolve
 * Bulletproof resolver: Handles User Tokens and Page Tokens without requesting non-existing fields.
 */
router.post('/auto-resolve', auth, async (req, res) => {
  const { token } = req.body;

  if (!token || typeof token !== 'string' || token.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Iltimos, haqiqiy Meta Access Tokenni kiriting.'
    });
  }

  const cleanToken = token.trim();

  try {
    // Step 1: Query /me to get basic node id and name (Safe on all token types)
    let meData = null;
    try {
      const meRes = await axios.get(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${cleanToken}`, { timeout: 10000 });
      meData = meRes.data;
    } catch (meErr) {
      const errMsg = meErr.response?.data?.error?.message || 'Meta Access Token noto\'g\'ri yoki muddati tugagan.';
      return res.status(400).json({ success: false, message: errMsg });
    }

    let targetPageId = '';
    let targetPageName = meData.name || 'Facebook Sahifa';
    let targetPageToken = cleanToken;
    let targetInstaId = '';
    let targetInstaUsername = '';

    // Step 2: Try fetching accounts (User Token managing pages case)
    let userPages = [];
    try {
      const accountsRes = await axios.get(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${cleanToken}`, { timeout: 10000 });
      if (Array.isArray(accountsRes.data?.data) && accountsRes.data.data.length > 0) {
        userPages = accountsRes.data.data;
      }
    } catch (e) {
      // Not a user token with pages or pages_show_list not granted
    }

    if (userPages.length > 0) {
      // We have user pages. Let's find if any page has an instagram account attached.
      let bestPage = userPages[0];
      for (const page of userPages) {
        try {
          const pageCheck = await axios.get(`https://graph.facebook.com/v19.0/${page.id}?fields=id,name,instagram_business_account{id,username,name}&access_token=${page.access_token || cleanToken}`, { timeout: 6000 });
          if (pageCheck.data?.instagram_business_account) {
            bestPage = page;
            targetInstaId = pageCheck.data.instagram_business_account.id;
            targetInstaUsername = pageCheck.data.instagram_business_account.username || pageCheck.data.instagram_business_account.name || '';
            break;
          }
        } catch (err) {}
      }

      targetPageId = bestPage.id;
      targetPageName = bestPage.name;
      targetPageToken = bestPage.access_token || cleanToken;

    } else {
      // Step 3: Token is a Page Token directly (or User without /me/accounts)
      targetPageId = meData.id;
      targetPageName = meData.name;
      targetPageToken = cleanToken;

      // Try checking if this page has an instagram_business_account safely
      try {
        const pageCheck = await axios.get(`https://graph.facebook.com/v19.0/${targetPageId}?fields=id,name,instagram_business_account{id,username,name}&access_token=${targetPageToken}`, { timeout: 6000 });
        if (pageCheck.data?.instagram_business_account) {
          targetInstaId = pageCheck.data.instagram_business_account.id;
          targetInstaUsername = pageCheck.data.instagram_business_account.username || pageCheck.data.instagram_business_account.name || '';
        }
      } catch (err) {}
    }

    // Step 4: If targetInstaId still not found, check connected_instagram_account
    if (!targetInstaId && targetPageId) {
      try {
        const connCheck = await axios.get(`https://graph.facebook.com/v19.0/${targetPageId}?fields=connected_instagram_account{id,username}&access_token=${targetPageToken}`, { timeout: 6000 });
        if (connCheck.data?.connected_instagram_account) {
          targetInstaId = connCheck.data.connected_instagram_account.id;
          targetInstaUsername = connCheck.data.connected_instagram_account.username || '';
        }
      } catch (e) {}
    }

    // Step 5: Automatically Subscribe this Page to Webhooks
    let webhookSubscribed = false;
    try {
      const subscribeUrl = `https://graph.facebook.com/v19.0/${targetPageId}/subscribed_apps`;
      const subRes = await axios.post(subscribeUrl, null, {
        params: {
          subscribed_fields: 'feed,messages,messaging_postbacks',
          access_token: targetPageToken
        },
        timeout: 10000
      });
      if (subRes.data?.success) {
        webhookSubscribed = true;
      }
    } catch (subErr) {
      console.warn('Webhook auto-subscription attempt:', subErr.response?.data?.error?.message || subErr.message);
    }

    // Step 6: Save resolved configuration into user DB
    let userConfig = await Config.findOne({ userId: req.user.id });
    if (!userConfig) {
      userConfig = new Config({ userId: req.user.id });
    }

    userConfig.facebookPageId = targetPageId;
    userConfig.pageAccessToken = targetPageToken;
    userConfig.pageName = targetPageName;
    userConfig.instagramAccountId = targetInstaId || targetPageId;
    userConfig.instagramUsername = targetInstaUsername || targetPageName;
    userConfig.isConnected = true;
    userConfig.lastConnectedAt = new Date();

    await userConfig.save();

    res.json({
      success: true,
      message: 'Tabriklaymiz! Facebook Sahifa va Instagram muvaffaqiyatli bog\'landi!',
      details: {
        pageId: targetPageId,
        pageName: targetPageName,
        instagramAccountId: targetInstaId || targetPageId,
        instagramUsername: targetInstaUsername || targetPageName,
        webhookSubscribed: webhookSubscribed,
        isConnected: true
      }
    });

  } catch (error) {
    console.error('Auto-resolve error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Ulashda xatolik: ' + error.message
    });
  }
});

/**
 * GET /api/meta/posts
 * Fetches recent Instagram Posts / Reels from Meta Graph API or Page Feed for post-specific trigger selection.
 * Fallbacks to Demo posts if account not yet connected or empty.
 */
router.get('/posts', auth, async (req, res) => {
  try {
    const userConfig = await Config.findOne({ userId: req.user.id });
    
    // If no config or token, return demo posts with message
    if (!userConfig || !userConfig.pageAccessToken) {
      return res.json({
        success: true,
        isLive: false,
        message: 'Token ulanmagan. Sinov uchun namuna postlar ko\'rsatilmoqda.',
        posts: DEMO_POSTS
      });
    }

    const token = userConfig.pageAccessToken;
    const targetInstaId = userConfig.instagramAccountId;
    const targetPageId = userConfig.facebookPageId;

    let postsFound = [];

    // Strategy 1: Fetch via Instagram Business Account Media API
    if (targetInstaId && targetInstaId !== targetPageId) {
      try {
        const mediaUrl = `https://graph.facebook.com/v19.0/${targetInstaId}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count&limit=30&access_token=${token}`;
        const mediaRes = await axios.get(mediaUrl, { timeout: 10000 });

        if (Array.isArray(mediaRes.data?.data) && mediaRes.data.data.length > 0) {
          postsFound = mediaRes.data.data.map(item => ({
            id: item.id,
            caption: item.caption || '(Izohsiz post)',
            mediaType: item.media_type,
            mediaUrl: item.media_url,
            thumbnailUrl: item.thumbnail_url || item.media_url || '',
            permalink: item.permalink || `https://instagram.com/p/${item.id}`,
            likeCount: item.like_count || 0,
            commentsCount: item.comments_count || 0,
            timestamp: item.timestamp
          }));
        }
      } catch (e) {
        console.warn('Strategy 1 insta media fetch failed:', e.response?.data?.error?.message || e.message);
      }
    }

    // Strategy 2: Fetch via Facebook Page Feed / Published Posts
    if (postsFound.length === 0 && targetPageId) {
      try {
        const pageFeedUrl = `https://graph.facebook.com/v19.0/${targetPageId}/feed?fields=id,message,created_time,full_picture,permalink_url&limit=30&access_token=${token}`;
        const pageRes = await axios.get(pageFeedUrl, { timeout: 10000 });

        if (Array.isArray(pageRes.data?.data) && pageRes.data.data.length > 0) {
          postsFound = pageRes.data.data.map(item => ({
            id: item.id,
            caption: item.message || '(Facebook post)',
            mediaType: item.full_picture ? 'IMAGE' : 'TEXT',
            mediaUrl: item.full_picture || '',
            thumbnailUrl: item.full_picture || '',
            permalink: item.permalink_url || `https://facebook.com/${item.id}`,
            likeCount: 0,
            commentsCount: 0,
            timestamp: item.created_time
          }));
        }
      } catch (e) {
        console.warn('Strategy 2 page feed fetch failed:', e.response?.data?.error?.message || e.message);
      }
    }

    if (postsFound.length > 0) {
      return res.json({
        success: true,
        isLive: true,
        posts: postsFound
      });
    }

    // Fallback: Return sample posts so user can always pick and test
    res.json({
      success: true,
      isLive: false,
      message: 'Sizning hisobingizda ochiq postlar topilmadi. Sinov uchun namuna postlar ko\'rsatilmoqda.',
      posts: DEMO_POSTS
    });

  } catch (error) {
    console.error('Error in /api/meta/posts:', error.message);
    res.json({
      success: true,
      isLive: false,
      posts: DEMO_POSTS
    });
  }
});

/**
 * POST /api/meta/resolve-url
 * Resolves an Instagram Post or Reel URL or Profile into a target media object.
 */
router.post('/resolve-url', auth, async (req, res) => {
  const { postUrl } = req.body;
  if (!postUrl) {
    return res.status(400).json({ success: false, message: 'Instagram havola (URL) sini kiriting.' });
  }

  try {
    const cleanUrl = postUrl.trim();
    const match = cleanUrl.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
    let shortcode = '';
    let caption = '';

    if (match) {
      shortcode = match[1];
      caption = `Instagram Post / Reel (${shortcode})`;
    } else {
      // Profile URL case (e.g. instagram.com/volkswagenbuxara)
      const usernameMatch = cleanUrl.match(/instagram\.com\/([A-Za-z0-9_.]+)/);
      if (usernameMatch && usernameMatch[1] !== 'p' && usernameMatch[1] !== 'reel') {
        shortcode = usernameMatch[1];
        caption = `@${shortcode} profilidagi postlar`;
      } else {
        shortcode = 'target_' + Date.now().toString(36);
        caption = `Instagram Post (${shortcode})`;
      }
    }

    const post = {
      id: shortcode,
      caption: caption,
      permalink: cleanUrl,
      thumbnailUrl: '',
      mediaType: cleanUrl.includes('/reel/') ? 'VIDEO' : 'IMAGE'
    };

    res.json({
      success: true,
      post
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Havolani tekshirishda xatolik.' });
  }
});

/**
 * POST /api/meta/disconnect
 * Disconnects the current Instagram / Facebook page.
 */
router.post('/disconnect', auth, async (req, res) => {
  try {
    const userConfig = await Config.findOne({ userId: req.user.id });
    if (userConfig) {
      userConfig.facebookPageId = '';
      userConfig.pageAccessToken = '';
      userConfig.pageName = '';
      userConfig.instagramAccountId = '';
      userConfig.instagramUsername = '';
      userConfig.isConnected = false;
      userConfig.targetMediaId = '';
      userConfig.targetMediaUrl = '';
      userConfig.targetMediaCaption = '';
      userConfig.targetMediaThumbnail = '';
      await userConfig.save();
    }

    res.json({
      success: true,
      message: 'Instagram sahifasi muvaffaqiyatli uzildi.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Akkauntni uzishda xatolik.' });
  }
});

module.exports = router;
