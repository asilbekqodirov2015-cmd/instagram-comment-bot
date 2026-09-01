const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Config = require('../models/Config');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'instagram_saas_jwt_secret_key_2026';

// Middleware to check database connection state
router.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1 && req.path !== '/me-mock') {
    return res.status(503).json({
      success: false,
      message: "Bulutli ma'lumotlar bazasi (MongoDB) ulanmagan. Iltimos, Render.com panelidagi Environment Variables bo'limiga MONGODB_URI kaliti orqali ulanish havolasini kiritib qo'ying!"
    });
  }
  next();
});

// 1. Get Current User Profile (Me)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi.' });
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role || 'user',
        subscription: user.subscription || { tier: 'free', status: 'active', paymentHistory: [] },
        usage: user.usage || { commentsCount: 0, dmCount: 0 },
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Foydalanuvchi ma\'lumotlarini olishda xatolik.' });
  }
});

// 2. Register Route
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email va parolni kiritish majburiy.' });
  }

  try {
    // Check if email already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Bu email orqali allaqachon ro\'yxatdan o\'tilgan.' });
    }

    // Determine initial role: owner email or first user gets admin
    const userCount = await User.countDocuments();
    const initialRole = (email.toLowerCase() === 'asilbekqodirov2015@gmail.com' || userCount === 0) ? 'admin' : 'user';

    // Create User
    const user = new User({ 
      email, 
      password,
      role: initialRole,
      subscription: {
        tier: 'free',
        status: 'active',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentHistory: []
      }
    });
    await user.save();

    // Create default config for this user
    const defaultConfig = new Config({
      userId: user._id,
      triggerType: 'all',
      keywords: [],
      commentReplyText: 'Javobingizni lizingizga (DM) yubordik! 📩',
      commentReplies: ['Javobingizni lizingizga (DM) yubordik! 📩'],
      dmType: 'text',
      dmText: 'Salom! Bizga kommentariya qoldirganingiz uchun rahmat. Siz so\'ragan ma\'lumotlar shu yerda.',
      dmMediaUrl: '',
      pageAccessToken: '',
      facebookPageId: '',
      aiEnabled: false
    });
    await defaultConfig.save();

    // Generate JWT Token with role & email
    const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Muvaffaqiyatli ro\'yxatdan o\'tildi!',
      token,
      email: user.email,
      role: user.role,
      subscription: user.subscription
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email va parolni kiritish majburiy.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Email yoki parol noto\'g\'ri.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: 'Hisobingiz administrator tomonidan bloklangan.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Email yoki parol noto\'g\'ri.' });
    }

    // Auto promote master developer/owner email to admin if not set
    if (user.email === 'asilbekqodirov2015@gmail.com' && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    // Generate JWT Token with role & email
    const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Xush kelibsiz!',
      token,
      email: user.email,
      role: user.role,
      subscription: user.subscription
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Forgot Password Route
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email manzilini kiritish majburiy.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Ushbu email bilan ro\'yxatdan o\'tgan foydalanuvchi topilmadi.' });
    }

    // Create reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 Hour limit
    await user.save();

    res.json({
      success: true,
      message: 'Parolni tiklash kaliti yaratildi.',
      resetToken
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Reset Password Route
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, message: 'Yangi parolni kiritish majburiy.' });
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Parolni tiklash kaliti yaroqsiz yoki muddati tugagan.' });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({
      success: true,
      message: 'Parolingiz muvaffaqiyatli o\'zgartirildi! Yangi parol bilan kirishingiz mumkin.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
