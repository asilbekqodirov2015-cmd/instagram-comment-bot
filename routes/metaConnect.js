const express = require('express');
const axios = require('axios');
const Config = require('../models/Config');
const auth = require('../middleware/auth');

const router = express.Router();

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
      // Find a page with instagram_business_account or pick the first page
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
      // Even if subscription fails due to app permissions, we still save the credentials!
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
