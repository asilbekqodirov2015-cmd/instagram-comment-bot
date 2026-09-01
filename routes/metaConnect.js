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
 * Automatically resolves Page ID, Instagram Business ID, Username and auto-subscribes to Webhooks using 1 Access Token.
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
    // 1. Inspect Token and retrieve accounts / page / instagram info from Meta Graph API
    const metaMeUrl = `https://graph.facebook.com/v19.0/me?fields=id,name,accounts{id,name,access_token,instagram_business_account{id,username,name}},instagram_business_account{id,username,name}&access_token=${cleanToken}`;
    
    let metaRes;
    try {
      metaRes = await axios.get(metaMeUrl, { timeout: 15000 });
    } catch (apiErr) {
      const errData = apiErr.response?.data?.error;
      const errMsg = errData?.message || 'Meta API bilan ulanishda xatolik yuz berdi. Token muddati tugagan yoki ruxsatlar yetarli emas.';
      return res.status(400).json({ success: false, message: errMsg });
    }

    const data = metaRes.data;
    let targetPageId = '';
    let targetPageName = '';
    let targetPageToken = cleanToken;
    let targetInstaId = '';
    let targetInstaUsername = '';

    // Check if token returned pages list (User Token case)
    if (data.accounts && data.accounts.data && data.accounts.data.length > 0) {
      const pageWithInsta = data.accounts.data.find(p => p.instagram_business_account) || data.accounts.data[0];
      targetPageId = pageWithInsta.id;
      targetPageName = pageWithInsta.name;
      targetPageToken = pageWithInsta.access_token || cleanToken;
      
      if (pageWithInsta.instagram_business_account) {
        targetInstaId = pageWithInsta.instagram_business_account.id;
        targetInstaUsername = pageWithInsta.instagram_business_account.username || pageWithInsta.instagram_business_account.name || '';
      }
    } else {
      // Token is a Page Access Token directly
      targetPageId = data.id;
      targetPageName = data.name || 'Facebook Sahifa';
      targetPageToken = cleanToken;

      if (data.instagram_business_account) {
        targetInstaId = data.instagram_business_account.id;
        targetInstaUsername = data.instagram_business_account.username || data.instagram_business_account.name || '';
      }
    }

    if (!targetPageId) {
      return res.status(400).json({
        success: false,
        message: 'Kiritilgan token orqali hech qanday Facebook Sahifa topilmadi. Token ruxsatnomalarini tekshiring.'
      });
    }

    // If Instagram account ID wasn't in the first call, try fetching it directly for this page
    if (!targetInstaId) {
      try {
        const pageDetailsUrl = `https://graph.facebook.com/v19.0/${targetPageId}?fields=instagram_business_account{id,username,name}&access_token=${targetPageToken}`;
        const pageDetails = await axios.get(pageDetailsUrl, { timeout: 10000 });
        if (pageDetails.data?.instagram_business_account) {
          targetInstaId = pageDetails.data.instagram_business_account.id;
          targetInstaUsername = pageDetails.data.instagram_business_account.username || pageDetails.data.instagram_business_account.name || '';
        }
      } catch (e) {
        console.warn('Could not auto-fetch instagram_business_account:', e.message);
      }
    }

    // 2. Automatically Subscribe this Page to Webhooks via Meta Graph API
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

    // 3. Save resolved configuration into user DB
    let userConfig = await Config.findOne({ userId: req.user.id });
    if (!userConfig) {
      userConfig = new Config({ userId: req.user.id });
    }

    userConfig.facebookPageId = targetPageId;
    userConfig.pageAccessToken = targetPageToken;
    userConfig.pageName = targetPageName;
    userConfig.instagramAccountId = targetInstaId;
    userConfig.instagramUsername = targetInstaUsername;
    userConfig.isConnected = true;
    userConfig.lastConnectedAt = new Date();

    await userConfig.save();

    res.json({
      success: true,
      message: 'Tabriklaymiz! Instagram va Facebook sahifangiz muvaffaqiyatli bog\'landi!',
      details: {
        pageId: targetPageId,
        pageName: targetPageName,
        instagramAccountId: targetInstaId,
        instagramUsername: targetInstaUsername || targetPageName,
        webhookSubscribed: webhookSubscribed,
        isConnected: true
      }
    });

  } catch (error) {
    console.error('Auto-resolve error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Avtomatik ulashda xatolik yuz berdi: ' + error.message
    });
  }
});

/**
 * GET /api/meta/posts
 * Fetches recent Instagram Posts / Reels from Meta Graph API for post-specific trigger selection.
 * Fallbacks to Demo posts if account not yet connected.
 */
router.get('/posts', auth, async (req, res) => {
  try {
    const userConfig = await Config.findOne({ userId: req.user.id });
    
    // Check if token exists
    if (!userConfig || !userConfig.pageAccessToken) {
      return res.json({
        success: true,
        isLive: false,
        message: 'Token ulanmagan. Hozircha quyidagi namuna postlardan tanlashingiz mumkin.',
        posts: DEMO_POSTS
      });
    }

    const token = userConfig.pageAccessToken;
    let targetInstaId = userConfig.instagramAccountId;

    // If instagramAccountId wasn't saved, try fetching it from Page ID
    if (!targetInstaId && userConfig.facebookPageId) {
      try {
        const pageRes = await axios.get(`https://graph.facebook.com/v19.0/${userConfig.facebookPageId}?fields=instagram_business_account&access_token=${token}`, { timeout: 8000 });
        targetInstaId = pageRes.data?.instagram_business_account?.id;
      } catch (e) {}
    }

    if (!targetInstaId) {
      return res.json({
        success: true,
        isLive: false,
        message: 'Instagram Biznes akkaunti bog\'lanmagan. Sinov uchun namuna postlar yuklandi.',
        posts: DEMO_POSTS
      });
    }

    // Query Instagram Graph API for live recent media (Photos, Videos, Reels)
    try {
      const mediaUrl = `https://graph.facebook.com/v19.0/${targetInstaId}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count&limit=30&access_token=${token}`;
      const mediaRes = await axios.get(mediaUrl, { timeout: 12000 });

      const livePosts = (mediaRes.data?.data || []).map(item => ({
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

      if (livePosts.length > 0) {
        return res.json({
          success: true,
          isLive: true,
          posts: livePosts
        });
      }
    } catch (metaApiErr) {
      console.warn('Meta API media fetch failed, returning demo posts:', metaApiErr.response?.data?.error?.message || metaApiErr.message);
    }

    // If no live posts or query failed, return demo posts with informative status
    res.json({
      success: true,
      isLive: false,
      message: 'Jonli postlar topilmadi. Sinov uchun namuna postlar yuklandi.',
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
 * Resolves an Instagram Post or Reel URL into a target media object.
 */
router.post('/resolve-url', auth, async (req, res) => {
  const { postUrl } = req.body;
  if (!postUrl) {
    return res.status(400).json({ success: false, message: 'Instagram havola (URL) sini kiriting.' });
  }

  try {
    // Extract shortcode or ID from URL
    // e.g. https://www.instagram.com/reel/C8Abc123/?igsh=... or https://instagram.com/p/C9Xyz456/
    const match = postUrl.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
    const shortcode = match ? match[1] : ('post_' + Date.now().toString(36));

    const post = {
      id: shortcode,
      caption: `Instagram Post (${shortcode})`,
      permalink: postUrl.trim(),
      thumbnailUrl: '',
      mediaType: postUrl.includes('/reel/') ? 'VIDEO' : 'IMAGE'
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
