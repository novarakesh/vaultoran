const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config/env');

// Ensure secure storage directory exists
if (!fs.existsSync(config.storageDir)) {
  fs.mkdirSync(config.storageDir, { recursive: true, mode: 0o700 });
}

// Whitelisted MIME types and extensions for high-security environments
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt',
  '.csv',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
]);

// Secure disk storage using crypto-random filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.storageDir);
  },
  filename: (req, file, cb) => {
    // Generate 64-character cryptographic random hex filename
    const randomHex = crypto.randomBytes(32).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.bin';
    cb(null, `${randomHex}${safeExt}`);
  },
});

// File filter: strict validation of MIME type and extension
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
    const error = new Error('Invalid file type. Only PDF, Office documents, CSV, TXT, and Images are allowed.');
    error.statusCode = 400;
    return cb(error, false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
  },
});

module.exports = upload;
