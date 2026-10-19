const mongoose = require('mongoose');
const User = require('../models/User');
const { recordAuditLog } = require('../utils/audit');

/**
 * List users for document sharing picker
 * Restricted to 'owner' and 'admin' roles
 * Returns minimal fields to prevent leaking sensitive attributes
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}, '_id name email role').sort({ name: 1 });
    return res.status(200).json({
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke all active sessions for a target user (Admin killswitch)
 * Increments target user's tokenVersion
 */
const revokeUserSessions = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user ID format.' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    targetUser.tokenVersion += 1;
    await targetUser.save();

    return res.status(200).json({
      message: `All sessions for user ${targetUser.email} have been revoked.`,
      userId: targetUser._id,
      tokenVersion: targetUser.tokenVersion,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  revokeUserSessions,
};
