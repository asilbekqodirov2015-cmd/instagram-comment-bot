const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');

const router = express.Router();

// 1. Get current subscription and invoices
router.get('/current', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user.id).select('subscription usage email role');
      if (!user) {
        return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi.' });
      }
      return res.json({
        success: true,
        subscription: user.subscription || { tier: 'free', status: 'active', paymentHistory: [] },
        usage: user.usage || { commentsCount: 0, dmCount: 0 },
        role: user.role || 'user'
      });
    } else {
      // Local Fallback
      return res.json({
        success: true,
        subscription: {
          tier: req.user.subscription?.tier || 'free',
          status: 'active',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          paymentHistory: []
        },
        usage: { commentsCount: 14, dmCount: 14 },
        role: req.user.role || 'user'
      });
    }
  } catch (err) {
    console.error('Error fetching billing data:', err);
    res.status(500).json({ success: false, message: 'Billing ma\'lumotlarini olishda xatolik.' });
  }
});

// 2. Process Checkout Payment (Payme, Click, Uzum, Card)
router.post('/checkout', async (req, res) => {
  const { plan, provider = 'card', cardLast4 = '4455', months = 1 } = req.body;

  if (!['pro', 'business'].includes(plan)) {
    return res.status(400).json({ success: false, message: 'Noto\'g\'ri tarif tanlandi.' });
  }

  const prices = {
    pro: 190000 * months, // 190,000 so'm / oy
    business: 490000 * months // 490,000 so'm / oy
  };

  const amount = prices[plan] || 190000;
  const invoiceId = `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  const expiresAt = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);

  const paymentRecord = {
    id: invoiceId,
    amount: amount,
    currency: 'UZS',
    plan: plan,
    provider: provider,
    date: new Date(),
    status: 'completed',
    cardLast4: cardLast4.slice(-4) || '8888'
  };

  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi.' });
      }

      if (!user.subscription) {
        user.subscription = { tier: plan, status: 'active', paymentHistory: [] };
      }

      user.subscription.tier = plan;
      user.subscription.status = 'active';
      user.subscription.expiresAt = expiresAt;
      user.subscription.paymentHistory.unshift(paymentRecord);

      await user.save();

      return res.json({
        success: true,
        message: `Tabriklaymiz! Hisobingiz muvaffaqiyatli ${plan.toUpperCase()} tarifiga oshirildi.`,
        invoice: paymentRecord,
        subscription: user.subscription
      });
    } else {
      // Local fallback mode
      return res.json({
        success: true,
        message: `Tabriklaymiz! Hisobingiz muvaffaqiyatli ${plan.toUpperCase()} tarifiga oshirildi. (Lokal rejim)`,
        invoice: paymentRecord,
        subscription: {
          tier: plan,
          status: 'active',
          expiresAt: expiresAt,
          paymentHistory: [paymentRecord]
        }
      });
    }
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ success: false, message: 'To\'lovni qayta ishlashda xatolik.' });
  }
});

module.exports = router;
