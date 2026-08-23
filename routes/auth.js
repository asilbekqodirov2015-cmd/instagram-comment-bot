const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Config = require('../models/Config');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'instagram_saas_jwt_secret_key_2026';

// Register Route
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

    // Create User
    const user = new User({ email, password });
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
      facebookPageId: ''
    });
    await defaultConfig.save();

    // Generate JWT Token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Muvaffaqiyatli ro\'yxatdan o\'tildi!',
      token,
      email: user.email
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login Route
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

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Email yoki parol noto\'g\'ri.' });
    }

    // Generate JWT Token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Xush kelibsiz!',
      token,
      email: user.email
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Forgot Password Route
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

    // Since this is a test/local environment, we return the token directly.
    // In production, you would send this token via email (e.g. using nodemailer).
    res.json({
      success: true,
      message: 'Parolni tiklash kaliti yaratildi.',
      resetToken // Returned directly for easy UI simulation
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reset Password Route
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

    // Reset password (User schema pre-save hook will hash it automatically)
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
