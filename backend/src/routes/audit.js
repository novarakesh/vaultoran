const express = require('express');
const { getAuditLogs } = require('../controllers/auditController');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

const router = express.Router();

/**
 * @route   GET /api/audit
 * @desc    Retrieve immutable, append-only security audit trail
 * @access  Private ('admin' only)
 */
router.get('/', verifyToken, authorizeRole('admin'), getAuditLogs);

module.exports = router;
