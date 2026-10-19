const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/trustvault',
  jwtSecret: process.env.JWT_SECRET || 'trustvault_dev_fallback_secret_not_for_prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  storageDir: path.resolve(process.env.STORAGE_DIR || path.join(__dirname, '../../storage')),
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 15,
  corsOrigin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : ['http://localhost:5173', 'http://localhost:3000'],
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@trustvault.io',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'AdminVault#2026!',
    ownerEmail: process.env.SEED_OWNER_EMAIL || 'owner@trustvault.io',
    ownerPassword: process.env.SEED_OWNER_PASSWORD || 'OwnerVault#2026!',
    viewer1Email: process.env.SEED_VIEWER1_EMAIL || 'viewer1@trustvault.io',
    viewer1Password: process.env.SEED_VIEWER1_PASSWORD || 'Viewer1Vault#2026!',
    viewer2Email: process.env.SEED_VIEWER2_EMAIL || 'viewer2@trustvault.io',
    viewer2Password: process.env.SEED_VIEWER2_PASSWORD || 'Viewer2Vault#2026!',
  },
};

// Fail-fast assertion in production
if (config.nodeEnv === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('FATAL: JWT_SECRET must be configured with at least 32 characters in production.');
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('FATAL: MONGODB_URI must be configured in production.');
  }
}

module.exports = config;
