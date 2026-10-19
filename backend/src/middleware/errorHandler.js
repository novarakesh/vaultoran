const config = require('../config/env');

/**
 * Global error handling middleware for secure, hardened response formatting
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || res.statusCode;
  if (!statusCode || statusCode < 400) {
    statusCode = 500;
  }

  let message = err.message || 'Internal Server Error';

  // Multer error handling
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = `File too large. Maximum allowed size is ${config.maxFileSizeMb}MB.`;
    } else {
      message = `File upload error: ${err.message}`;
    }
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate resource value: ${field} already exists.`;
  }

  // Immutable audit log security error
  if (err.name === 'ImmutableAuditLogError') {
    statusCode = 403;
    message = err.message;
  }

  // In production, mask generic 500 server error details
  const isProduction = config.nodeEnv === 'production';
  const response = {
    error: isProduction && statusCode === 500 ? 'An unexpected internal server error occurred.' : message,
  };

  if (!isProduction && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
