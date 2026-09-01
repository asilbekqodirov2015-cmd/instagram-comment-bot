const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PaymentRecordSchema = new mongoose.Schema({
  id: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'UZS' },
  plan: { type: String, enum: ['free', 'pro', 'business'], required: true },
  provider: { type: String, enum: ['payme', 'click', 'uzum', 'card'], default: 'card' },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['completed', 'pending', 'failed'], default: 'completed' },
  cardLast4: { type: String, default: '8888' }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  subscription: {
    tier: {
      type: String,
      enum: ['free', 'pro', 'business'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'canceled'],
      default: 'active'
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days free trial default
    },
    paymentHistory: [PaymentRecordSchema]
  },
  usage: {
    commentsCount: { type: Number, default: 0 },
    dmCount: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Pre-save hook to hash password and assign initial admin if owner email
UserSchema.pre('save', async function(next) {
  // Auto grant admin to owner email
  if (this.email === 'asilbekqodirov2015@gmail.com') {
    this.role = 'admin';
  }

  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to check password validity
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
