const mongoose = require('mongoose');
const User = require('../models/User');
const Document = require('../models/Document');
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
 * List viewers specifically for document sharing picker
 * Restricted to 'owner' and 'admin' roles
 */
const getViewers = async (req, res, next) => {
  try {
    const viewers = await User.find(
      { _id: { $ne: req.user._id } },
      '_id name email role tokenVersion createdAt'
    ).sort({ name: 1 });
    return res.status(200).json({
      count: viewers.length,
      viewers,
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

/**
 * Delete a user account (Admin Governance)
 * Strictly restricted to deleting 'viewer' or 'owner' roles
 * Prevents deleting admin accounts or self-deletion
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user ID format.' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Prevent admin from deleting themselves
    if (req.user._id.toString() === targetUser._id.toString()) {
      return res.status(400).json({ error: 'Administrators cannot delete their own account.' });
    }

    // Strictly enforce that only viewers and owners can be deleted by admin
    if (targetUser.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete an administrator account. Only viewers and owners can be deleted.' });
    }

    if (!['viewer', 'owner'].includes(targetUser.role)) {
      return res.status(400).json({ error: 'Invalid user role. Only viewers and owners can be deleted.' });
    }

    // Clean up document shares: remove user from any document they were granted access to
    await Document.updateMany(
      { 'sharedWith.user': targetUser._id },
      { $pull: { sharedWith: { user: targetUser._id } } }
    );

    // If target user is an owner, soft-delete documents owned by this user
    if (targetUser.role === 'owner') {
      await Document.updateMany(
        { owner: targetUser._id },
        { $set: { isDeleted: true } }
      );
    }

    // Delete user from database
    await User.findByIdAndDelete(id);

    // Record immutable audit log
    await recordAuditLog({
      req,
      userId: req.user._id,
      action: 'DELETE',
      metadata: {
        targetUserId: targetUser._id.toString(),
        targetEmail: targetUser.email,
        targetName: targetUser.name,
        targetRole: targetUser.role,
        governanceAction: 'USER_DELETION',
      },
    });

    return res.status(200).json({
      message: `User ${targetUser.email} (${targetUser.role}) has been deleted successfully.`,
      deletedUserId: targetUser._id,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getViewers,
  revokeUserSessions,
  updateUserRole,
  deleteUser,
};
