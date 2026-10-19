const express = require('express');
const { getUsers, revokeUserSessions } = require('../controllers/userController');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Fetch minimal user directory for share assignment
 * @access  Private ('owner', 'admin')
 */
router.get('/', verifyToken, authorizeRole('owner', 'admin'), getUsers);

/**
 * @route   PATCH /api/users/:id/revoke
 * @desc    Emergency killswitch: Revoke all active sessions for a target user
 * @access  Private ('admin' only)
 */
router.patch('/:id/revoke', verifyToken, authorizeRole('admin'), revokeUserSessions);

module.exports = router;
