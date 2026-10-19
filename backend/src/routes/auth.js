const express = require('express');
const { body, validationResult } = require('express-validator');
const { register, login, logoutAll, getMe } = require('../controllers/authController');
const verifyToken = require('../middleware/verifyToken');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Middleware to handle express-validator check results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (Viewer or Owner, never Admin)
 * @access  Public
 */
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name too long'),
    body('email').trim().isEmail().withMessage('A valid email address is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('role').optional().isIn(['owner', 'viewer']).withMessage('Role can only be owner or viewer'),
  ],
  validate,
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get JWT
 * @access  Public (Rate limited)
 */
router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Revoke all active sessions (increments tokenVersion)
 * @access  Private
 */
router.post('/logout-all', verifyToken, logoutAll);

/**
 * @route   GET /api/auth/me
 * @desc    Fetch current authenticated user profile
 * @access  Private
 */
router.get('/me', verifyToken, getMe);

module.exports = router;
