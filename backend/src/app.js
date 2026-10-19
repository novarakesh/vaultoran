const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const config = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const userRoutes = require('./routes/users');
const auditRoutes = require('./routes/audit');

const app = express();

// Trust reverse proxies (Render, AWS ALB, Cloudflare, Heroku) for accurate IP retrieval
app.set('trust proxy', 1);

// 1. Security Headers via Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'same-site' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
      },
    },
  })
);

// 2. Strict CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server or tools without origin (e.g. Supertest, curl) if not in production
    if (!origin) {
      return callback(null, true);
    }
    const allowed = config.corsOrigin.some((allowedOrigin) => {
      return allowedOrigin === '*' || allowedOrigin === origin;
    });
    if (allowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS Error: Origin ${origin} not permitted.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition'],
};
app.use(cors(corsOptions));

// 3. Request Logging (disable or quiet in test mode)
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
}

// 4. Request Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Data Sanitization against NoSQL query injection
app.use(
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`[SECURITY ALERT] Sanitized potentially malicious key: ${key} in request from ${req.ip}`);
    },
  })
);

// 6. Global API Rate Limiting
app.use('/api', apiLimiter);

// 7. Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'TrustVault Core Security Backend',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// 8. Application Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit', auditRoutes);

// 9. 404 Handler for Unrecognized Routes
app.use((req, res) => {
  res.status(404).json({
    error: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
});

// 10. Centralized Security Error Handler
app.use(errorHandler);

module.exports = app;
