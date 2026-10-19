const mongoose = require('mongoose');
const Document = require('../models/Document');
const { recordAuditLog } = require('../utils/audit');

/**
 * Middleware to authorize access to a specific document.
 * Enforces admin, owner, or explicit shared permissions on every document request.
 * Logs VIEW_ATTEMPT_DENIED upon unauthorized access.
 *
 * @param {'read' | 'edit'} [requiredPermission='read'] Permission required
 */
const authorizeDocumentAccess = (requiredPermission = 'read') => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid document ID format.' });
      }

      // Find the document
      const document = await Document.findById(id);

      if (!document) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      // Soft-deleted documents are treated as not found for non-admins
      if (document.isDeleted && req.user.role !== 'admin') {
        return res.status(404).json({ error: 'Document not found.' });
      }

      const userIdStr = req.user._id.toString();
      const isOwner = document.owner.toString() === userIdStr;
      const isAdmin = req.user.role === 'admin';

      // Check if user is explicitly in sharedWith
      const shareEntry = document.sharedWith.find(
        (entry) => entry.user.toString() === userIdStr
      );

      let isAuthorized = false;

      if (isAdmin || isOwner) {
        isAuthorized = true;
      } else if (shareEntry) {
        if (requiredPermission === 'read') {
          // Both 'read' and 'edit' permissions grant read access
          isAuthorized = true;
        } else if (requiredPermission === 'edit') {
          // Only explicit 'edit' permission grants edit/modify access
          isAuthorized = shareEntry.permission === 'edit';
        }
      }

      if (!isAuthorized) {
        // Record immutable VIEW_ATTEMPT_DENIED audit log
        await recordAuditLog({
          req,
          userId: req.user._id,
          action: 'VIEW_ATTEMPT_DENIED',
          documentId: document._id,
          metadata: {
            reason: 'Insufficient document permissions',
            requiredPermission,
            userRole: req.user.role,
            isOwner,
            hasShareEntry: !!shareEntry,
            grantedPermission: shareEntry ? shareEntry.permission : null,
          },
        });

        return res.status(403).json({
          error: 'Access Denied: You do not have permission to access this document.',
        });
      }

      // Attach authorized document to request for controllers
      req.document = document;
      next();
    } catch (error) {
      console.error('[Document Authorization Error]:', error);
      return res.status(500).json({
        error: 'Failed to verify document access authorization.',
      });
    }
  };
};

module.exports = authorizeDocumentAccess;
