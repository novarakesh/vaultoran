const mongoose = require('mongoose');
const User = require('../models/User');
const { recordAuditLog } = require('../utils/audit');

/**
 * List users for document sharing picker and admin governance
 * Restricted to 'owner' and 'admin' roles
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}, '_id name email role tokenVersion createdAt').sort({ name: 1 });
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

/**
 * Update user role (Admin Governance)
 * Strictly restricted to 'admin' role
 * Allows assigning who is admin, owner, or viewer
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user ID format.' });
    }

    if (!['admin', 'owner', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, owner, or viewer.' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const oldRole = targetUser.role;
    targetUser.role = role;
    // Increment tokenVersion so role permissions take effect immediately
    targetUser.tokenVersion += 1;
    await targetUser.save();

    // Record immutable audit log of the governance action
    await recordAuditLog({
      req,
      userId: req.user._id,
      action: 'PERMISSION_CHANGE',
      metadata: {
        targetUserId: targetUser._id,
        targetEmail: targetUser.email,
        oldRole,
        newRole: role,
        governanceAction: 'ROLE_UPDATE',
      },
    });

    return res.status(200).json({
      message: `User ${targetUser.email} role updated from ${oldRole} to ${role}.`,
      user: targetUser.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  revokeUserSessions,
  updateUserRole,
};
