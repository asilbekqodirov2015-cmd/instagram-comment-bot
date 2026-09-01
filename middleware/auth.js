const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'instagram_saas_jwt_secret_key_2026';

module.exports = function (req, res, next) {
  // Get token from header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: 'Avtorizatsiyadan o\'tilmagan. Token topilmadi.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { 
      id: decoded.id,
      role: decoded.role || 'user',
      email: decoded.email || ''
    };

    // Auto promote master developer/owner email to admin
    if (decoded.email === 'asilbekqodirov2015@gmail.com') {
      req.user.role = 'admin';
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Yaroqsiz token yoki seans muddati tugagan.' });
  }
};
