const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Config = require('../models/Config');
const Log = require('../models/Log');

const router = express.Router();

// Admin Verification Middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.email !== 'asilbekqodirov2015@gmail.com') {
    return res.status(403).json({ success: false, message: 'Ruxsat berilmadi: Faqat Super Admin kira oladi.' });
  }
  next();
};

router.use(requireAdmin);

// 1. Overall Platform Stats
router.get('/stats', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const totalUsers = await User.countDocuments();
      const proUsers = await User.countDocuments({ 'subscription.tier': 'pro' });
      const businessUsers = await User.countDocuments({ 'subscription.tier': 'business' });
      const totalLogs = await Log.countDocuments();

      // Calculate total revenue across all payments
      const users = await User.find({}, 'subscription.paymentHistory');
      let totalRevenue = 0;
      let allPayments = [];

      users.forEach(u => {
        if (u.subscription && u.subscription.paymentHistory) {
          u.subscription.paymentHistory.forEach(p => {
            if (p.status === 'completed') {
              totalRevenue += (p.amount || 0);
              allPayments.push(p);
            }
          });
        }
      });

      // Sort recent payments
      allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

      return res.json({
        success: true,
        stats: {
          totalUsers,
          activeSubscriptions: proUsers + businessUsers,
          proUsers,
          businessUsers,
          totalRevenue,
          totalCommentsProcessed: totalLogs,
          recentPayments: allPayments.slice(0, 10)
        }
      });
    } else {
      // Local fallback
      return res.json({
        success: true,
        stats: {
          totalUsers: 3,
          activeSubscriptions: 2,
          proUsers: 1,
          businessUsers: 1,
          totalRevenue: 680000,
          totalCommentsProcessed: 142,
          recentPayments: []
        }
      });
    }
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ success: false, message: 'Statistikalarni olishda xatolik.' });
  }
});

// 2. Get All Registered Users
router.get('/users', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const users = await User.find({}, '-password').sort({ createdAt: -1 }).lean();
      
      // Attach each user's Facebook Page ID if exists
      const userIds = users.map(u => u._id);
      const configs = await Config.find({ userId: { $in: userIds } }).select('userId facebookPageId dmType aiEnabled').lean();
      
      const configMap = {};
      configs.forEach(c => {
        configMap[c.userId.toString()] = c;
      });

      const usersWithConfig = users.map(u => ({
        ...u,
        config: configMap[u._id.toString()] || { facebookPageId: '', dmType: 'text', aiEnabled: false }
      }));

      return res.json({ success: true, users: usersWithConfig });
    } else {
      return res.json({
        success: true,
        users: [
          {
            _id: 'mock-admin-id',
            email: req.user.email,
            role: 'admin',
            subscription: { tier: 'business', status: 'active', expiresAt: new Date(Date.now() + 365*24*60*60*1000) },
            isActive: true,
            createdAt: new Date(),
            config: { facebookPageId: '1029384756', dmType: 'image', aiEnabled: true }
          }
        ]
      });
    }
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ success: false, message: 'Foydalanuvchilarni yuklashda xatolik.' });
  }
});

// 3. Change User Tier (Manual Override)
router.patch('/users/:id/tier', async (req, res) => {
  const { tier } = req.body;
  if (!['free', 'pro', 'business'].includes(tier)) {
    return res.status(400).json({ success: false, message: 'Noto\'g\'ri tarif.' });
  }

  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi.' });
      }

      if (!user.subscription) {
        user.subscription = { tier: tier, status: 'active', paymentHistory: [] };
      }

      user.subscription.tier = tier;
      user.subscription.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      user.subscription.status = 'active';

      await user.save();

      return res.json({
        success: true,
        message: `${user.email} tarifi muvaffaqiyatli ${tier.toUpperCase()} ga o'zgartirildi.`
      });
    } else {
      return res.json({ success: true, message: 'Tarif o\'zgartirildi (Lokal rejim).' });
    }
  } catch (err) {
    console.error('Change tier error:', err);
    res.status(500).json({ success: false, message: 'Tarifni o\'zgartirishda xatolik.' });
  }
});

// 4. Toggle User Status (Active / Blocked)
router.patch('/users/:id/status', async (req, res) => {
  const { isActive } = req.body;

  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi.' });
      }

      user.isActive = Boolean(isActive);
      await user.save();

      return res.json({
        success: true,
        message: `Foydalanuvchi holati ${user.isActive ? 'Faollashtirildi' : 'Bloklandi'}.`
      });
    } else {
      return res.json({ success: true, message: 'Holat yangilandi (Lokal rejim).' });
    }
  } catch (err) {
    console.error('User status error:', err);
    res.status(500).json({ success: false, message: 'Holatni o\'zgartirishda xatolik.' });
  }
});

module.exports = router;
