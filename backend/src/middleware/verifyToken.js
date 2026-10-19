const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');

/**
 * Validates JWT Bearer token and verifies instant session revocation via tokenVersion
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication failed: No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Authentication failed: Token has expired.',
        });
      }
      return res.status(401).json({
        error: 'Authentication failed: Invalid token.',
      });
    }

    // Verify user exists and check tokenVersion for instant revocation
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed: User account no longer exists.',
      });
    }

    // Strict session revocation enforcement
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        error: 'Authentication failed: Session has been revoked. Please re-authenticate.',
      });
    }

    // Attach verified user and token payload to request
    req.user = user;
    req.tokenPayload = decoded;
    next();
  } catch (error) {
    return res.status(500).json({
      error: 'Internal authentication error.',
    });
  }
};

module.exports = verifyToken;
