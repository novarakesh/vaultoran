const express = require('express');
const { getUsers, getViewers, revokeUserSessions, updateUserRole } = require('../controllers/userController');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Fetch user directory for share assignment and governance
 * @access  Private ('owner', 'admin')
 */
router.get('/', verifyToken, authorizeRole('owner', 'admin'), getUsers);

/**
 * @route   GET /api/users/viewers
 * @desc    Fetch eligible viewers for document clearance delegation
 * @access  Private ('owner', 'admin')
 */
router.get('/viewers', verifyToken, authorizeRole('owner', 'admin'), getViewers);

/**
 * @route   PATCH /api/users/:id/revoke
 * @desc    Emergency killswitch: Revoke all active sessions for a target user
 * @access  Private ('admin' only)
 */
router.patch('/:id/revoke', verifyToken, authorizeRole('admin'), revokeUserSessions);

/**
 * @route   PATCH /api/users/:id/role
 * @desc    Admin Governance: Grant or modify user roles ('admin', 'owner', 'viewer')
 * @access  Private ('admin' only)
 */
router.patch('/:id/role', verifyToken, authorizeRole('admin'), updateUserRole);

module.exports = router;
