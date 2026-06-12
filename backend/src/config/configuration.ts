export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  cookieSecret: process.env.COOKIE_SECRET,
  database: { url: process.env.DATABASE_URL },
  redis: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  msg91: {
    apiKey: process.env.MSG91_API_KEY,
    senderId: process.env.MSG91_SENDER_ID,
    templateId: process.env.MSG91_OTP_TEMPLATE_ID,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
  ors: { apiKey: process.env.ORS_API_KEY },
});
