const AuditLog = require('../models/AuditLog');

/**
 * Extracts the real client IP address, handling proxies and load balancers (e.g. Render, Cloudflare)
 * @param {import('express').Request} req
 * @returns {string}
 */
const getClientIp = (req) => {
  if (!req) return '127.0.0.1';
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
};

/**
 * Creates an immutable audit log entry
 * @param {Object} options
 * @param {import('express').Request} [options.req] Express request object
 * @param {string} [options.userId] User ID (or extracted from req.user)
 * @param {string} options.action Audit action enum (UPLOAD, DOWNLOAD, VIEW_ATTEMPT_DENIED, PERMISSION_CHANGE, DELETE, LOGIN)
 * @param {string} [options.documentId] Associated document ID
 * @param {Object} [options.metadata] Arbitrary audit metadata
 * @returns {Promise<AuditLog>}
 */
const recordAuditLog = async ({ req, userId, action, documentId, metadata = {} }) => {
  try {
    const user = userId || (req && req.user ? req.user._id : null);
    const ip = req ? getClientIp(req) : '127.0.0.1';
    const userAgent = req && req.headers ? req.headers['user-agent'] || 'unknown' : 'system';

    const logEntry = new AuditLog({
      user,
      action,
      document: documentId || null,
      ip,
      userAgent,
      metadata,
      timestamp: new Date(),
    });

    return await logEntry.save();
  } catch (error) {
    console.error(`[CRITICAL AUDIT FAILURE] Failed to write audit log for action ${action}:`, error.message);
    // Return null or rethrow based on security requirement. In append-only logging, failures are surfaced
    return null;
  }
};

module.exports = {
  recordAuditLog,
  getClientIp,
};
