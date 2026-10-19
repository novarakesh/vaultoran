const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');
const { recordAuditLog } = require('../utils/audit');

/**
 * Generate signed JWT with user ID, role, and tokenVersion
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      tokenVersion: user.tokenVersion,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
    }
  );
};

/**
 * Register a new user
 * Prevents self-assignment of 'admin' role
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide name, email, and password.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    // Role escalation prevention: Users can NEVER self-assign 'admin'
    if (role === 'admin') {
      return res.status(400).json({
        error: 'Security Violation: Self-assignment of admin role is strictly prohibited.',
      });
    }

    const assignedRole = role === 'owner' ? 'owner' : 'viewer';

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: assignedRole,
      tokenVersion: 0,
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticate user and issue JWT
 * Writes LOGIN audit log
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Record successful LOGIN audit log
    await recordAuditLog({
      req,
      userId: user._id,
      action: 'LOGIN',
      metadata: {
        email: user.email,
        role: user.role,
      },
    });

    const token = generateToken(user);

    return res.status(200).json({
      message: 'Authentication successful.',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke all active sessions for current user by incrementing tokenVersion
 */
const logoutAll = async (req, res, next) => {
  try {
    req.user.tokenVersion += 1;
    await req.user.save();

    return res.status(200).json({
      message: 'All active sessions have been successfully revoked. Please log in again.',
      tokenVersion: req.user.tokenVersion,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get profile of currently authenticated user
 */
const getMe = async (req, res) => {
  return res.status(200).json({
    user: req.user.toJSON(),
  });
};

module.exports = {
  register,
  login,
  logoutAll,
  getMe,
};
