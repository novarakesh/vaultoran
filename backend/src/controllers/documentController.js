const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Document = require('../models/Document');
const User = require('../models/User');
const config = require('../config/env');
const { computeFileHash, verifyFileIntegrity } = require('../utils/hash');
const { recordAuditLog } = require('../utils/audit');

/**
 * Upload a confidential document
 * Restricted to 'owner' and 'admin' roles
 */
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document file uploaded.' });
    }

    const { title, category } = req.body;
    if (!title || title.trim().length === 0) {
      // Clean up uploaded file if validation fails
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'Document title is required.' });
    }

    // Compute cryptographic SHA-256 hash of the stored file
    const fileHash = await computeFileHash(req.file.path);

    const doc = await Document.create({
      title: title.trim(),
      category: category ? category.trim() : 'Confidential',
      owner: req.user._id,
      filePath: req.file.path,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      fileHash,
      sharedWith: [],
      isDeleted: false,
    });

    // Record UPLOAD audit log
    await recordAuditLog({
      req,
      userId: req.user._id,
      action: 'UPLOAD',
      documentId: doc._id,
      metadata: {
        title: doc.title,
        originalName: doc.originalName,
        size: doc.size,
        mimeType: doc.mimeType,
        fileHash: doc.fileHash,
      },
    });

    const populatedDoc = await Document.findById(doc._id).populate('owner', 'name email role');

    return res.status(201).json({
      message: 'Document uploaded securely.',
      document: populatedDoc,
    });
  } catch (error) {
    // Clean up file if database insertion failed
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // ignore
      }
    }
    next(error);
  }
};

/**
 * List documents accessible to the requesting user
 * Applies role scoping and search/filter criteria
 */
const getDocuments = async (req, res, next) => {
  try {
    const { q, category, owner, startDate, endDate, includeDeleted } = req.query;
    const filter = {};

    // 1. Role-based visibility scoping
    if (req.user.role === 'admin') {
      if (includeDeleted !== 'true') {
        filter.isDeleted = false;
      }
    } else if (req.user.role === 'owner') {
      filter.isDeleted = false;
      filter.$or = [
        { owner: req.user._id },
        { 'sharedWith.user': req.user._id },
      ];
    } else {
      // Viewer role
      filter.isDeleted = false;
      filter['sharedWith.user'] = req.user._id;
    }

    // 2. Query filters
    if (q && q.trim().length > 0) {
      // Escape special regex characters for safe regex search
      const safeQuery = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = { $regex: safeQuery, $options: 'i' };
    }

    if (category && category.trim().length > 0) {
      filter.category = category.trim();
    }

    if (owner && mongoose.Types.ObjectId.isValid(owner)) {
      filter.owner = owner;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const docs = await Document.find(filter)
      .populate('owner', 'name email role')
      .populate('sharedWith.user', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: docs.length,
      documents: docs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve document metadata by ID
 * Pre-authorized by authorizeDocumentAccess
 */
const getDocumentById = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.document._id)
      .populate('owner', 'name email role')
      .populate('sharedWith.user', 'name email role');

    return res.status(200).json({ document: doc });
  } catch (error) {
    next(error);
  }
};

/**
 * Securely stream document file to authorized users
 * Pre-authorized by authorizeDocumentAccess('read')
 * Verifies SHA-256 hash before streaming to prevent tampered file access
 */
const downloadDocument = async (req, res, next) => {
  try {
    const doc = req.document;

    // Verify storage path traversal protection
    const resolvedPath = path.resolve(doc.filePath);
    if (!resolvedPath.startsWith(path.resolve(config.storageDir))) {
      return res.status(403).json({
        error: 'Security Violation: Path traversal detected.',
      });
    }

    // Verify file exists on disk
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        error: 'Document file not found on storage vault.',
      });
    }

    // File integrity verification: verify fileHash against stored SHA-256
    const isIntact = await verifyFileIntegrity(resolvedPath, doc.fileHash);
    if (!isIntact) {
      console.error(`[INTEGRITY FAILURE] File ${doc._id} failed SHA-256 hash verification!`);
      return res.status(500).json({
        error: 'Document integrity check failed. The file on disk does not match the cryptographic integrity hash.',
      });
    }

    // Record DOWNLOAD audit log
    await recordAuditLog({
      req,
      userId: req.user._id,
      action: 'DOWNLOAD',
      documentId: doc._id,
      metadata: {
        fileHash: doc.fileHash,
        originalName: doc.originalName,
      },
    });

    // Hardened headers: Prevent MIME sniffing, enforce safe download
    const safeFilename = encodeURIComponent(doc.originalName).replace(/['()]/g, escape);
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");

    const fileStream = fs.createReadStream(resolvedPath);
    fileStream.on('error', (streamErr) => {
      console.error('[Stream Error]:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream document.' });
      }
    });

    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Manage document sharing permissions
 * Restricted to document owner or admin
 */
const shareDocument = async (req, res, next) => {
  try {
    const doc = req.document;

    // Only owner or admin can modify shares
    const isOwner = doc.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: 'Access Denied: Only the document owner or an administrator can modify sharing permissions.',
      });
    }

    const { shares, userId, permission } = req.body;

    if (Array.isArray(shares)) {
      // Bulk update shares
      const validatedShares = [];
      for (const item of shares) {
        if (!item.userId || !mongoose.Types.ObjectId.isValid(item.userId)) {
          return res.status(400).json({ error: `Invalid user ID format in share list: ${item.userId}` });
        }
        const userExists = await User.findById(item.userId);
        if (!userExists) {
          return res.status(404).json({ error: `User with ID ${item.userId} not found.` });
        }
        validatedShares.push({
          user: item.userId,
          permission: item.permission === 'edit' ? 'edit' : 'read',
          sharedAt: new Date(),
        });
      }
      doc.sharedWith = validatedShares;
    } else if (userId) {
      // Single share add/update or removal
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Invalid user ID format.' });
      }

      if (permission === 'none' || permission === null) {
        // Remove share
        doc.sharedWith = doc.sharedWith.filter((s) => s.user.toString() !== userId.toString());
      } else {
        const userExists = await User.findById(userId);
        if (!userExists) {
          return res.status(404).json({ error: 'User to share with not found.' });
        }

        const validPerm = permission === 'edit' ? 'edit' : 'read';
        const existingIndex = doc.sharedWith.findIndex((s) => s.user.toString() === userId.toString());
        if (existingIndex >= 0) {
          doc.sharedWith[existingIndex].permission = validPerm;
        } else {
          doc.sharedWith.push({
            user: userId,
            permission: validPerm,
            sharedAt: new Date(),
          });
        }
      }
    } else {
      return res.status(400).json({ error: 'Please provide either a "shares" array or a "userId" to share with.' });
    }

    await doc.save();

    // Record PERMISSION_CHANGE audit log
    await recordAuditLog({
      req,
      userId: req.user._id,
      action: 'PERMISSION_CHANGE',
      documentId: doc._id,
      metadata: {
        sharedWithCount: doc.sharedWith.length,
        sharedWith: doc.sharedWith.map((s) => ({ user: s.user, permission: s.permission })),
      },
    });

    const updatedDoc = await Document.findById(doc._id)
      .populate('owner', 'name email role')
      .populate('sharedWith.user', 'name email role');

    return res.status(200).json({
      message: 'Document sharing permissions updated successfully.',
      document: updatedDoc,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft-delete a document
 * Restricted to document owner or admin
 */
const deleteDocument = async (req, res, next) => {
  try {
    const doc = req.document;

    const isOwner = doc.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: 'Access Denied: Only the document owner or an administrator can delete this document.',
      });
    }

    doc.isDeleted = true;
    await doc.save();

    // Record DELETE audit log
    await recordAuditLog({
      req,
      userId: req.user._id,
      action: 'DELETE',
      documentId: doc._id,
      metadata: {
        title: doc.title,
        isDeleted: true,
      },
    });

    return res.status(200).json({
      message: 'Document soft-deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  getDocumentById,
  downloadDocument,
  shareDocument,
  deleteDocument,
};
