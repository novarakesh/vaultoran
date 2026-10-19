const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const isTest = config.nodeEnv === 'test';

// General API rate limiter: 200 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
});

// Sensitive Auth endpoint limiter: 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many failed login attempts. Account temporarily locked for 15 minutes.',
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};
