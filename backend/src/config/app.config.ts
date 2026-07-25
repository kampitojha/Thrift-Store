export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  appName: process.env.APP_NAME || 'Reloom',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',

  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisPrefix: process.env.REDIS_PREFIX || 'reloom:',

  meiliHost: process.env.MEILI_HOST || 'http://localhost:7700',
  meiliMasterKey: process.env.MEILI_MASTER_KEY || '',
  meiliIndexProducts: process.env.MEILI_INDEX_PRODUCTS || 'products',

  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me-min-32-chars!!',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  clerkSecretKey: process.env.CLERK_SECRET_KEY,
  clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET,

  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  platformCommissionBps: parseInt(process.env.PLATFORM_COMMISSION_BPS || '1000', 10),

  storageProvider: process.env.STORAGE_PROVIDER || 's3',
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-south-1',
    bucket: process.env.AWS_S3_BUCKET || 'reloom-media',
    cdnUrl: process.env.AWS_S3_CDN_URL,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM || 'Reloom <noreply@reloom.com>',

  ai: {
    provider: process.env.AI_PROVIDER || 'spacexai',
    apiKey: process.env.AI_API_KEY,
    baseUrl: process.env.AI_BASE_URL || 'https://api.spacexai.com/v1',
    model: process.env.AI_MODEL || 'grok-beta',
  },

  features: {
    aiListing: process.env.FEATURE_AI_LISTING !== 'false',
    cod: process.env.FEATURE_COD !== 'false',
    offers: process.env.FEATURE_OFFERS !== 'false',
    liveChat: process.env.FEATURE_LIVE_CHAT !== 'false',
  },
});
