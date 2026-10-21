const express = require('express');
const {
  uploadDocument,
  getDocuments,
  getDocumentById,
  downloadDocument,
  shareDocument,
  deleteDocument,
  updateDocument,
} = require('../controllers/documentController');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');
const authorizeDocumentAccess = require('../middleware/authorizeDocumentAccess');
const upload = require('../middleware/upload');

const router = express.Router();

/**
 * @route   POST /api/documents
 * @desc    Upload a new confidential document
 * @access  Private ('owner', 'admin')
 */
router.post(
  '/',
  verifyToken,
  authorizeRole('owner', 'admin'),
  upload.single('file'),
  uploadDocument
);

/**
 * @route   GET /api/documents
 * @desc    List all documents accessible to current user
 * @access  Private ('admin', 'owner', 'viewer')
 */
router.get('/', verifyToken, getDocuments);

/**
 * @route   GET /api/documents/:id
 * @desc    Get document metadata
 * @access  Private (Owner, Admin, or shared Viewer)
 */
router.get(
  '/:id',
  verifyToken,
  authorizeDocumentAccess('read'),
  getDocumentById
);

/**
 * @route   PUT /api/documents/:id
 * @desc    Edit document metadata or upload a revised file version
 * @access  Private (Owner, Admin, or shared Viewer with 'edit' clearance)
 */
router.put(
  '/:id',
  verifyToken,
  authorizeDocumentAccess('edit'),
  upload.single('file'),
  updateDocument
);

/**
 * @route   GET /api/documents/:id/download
 * @desc    Stream document file securely after integrity verification
 * @access  Private (Owner, Admin, or shared Viewer)
 */
router.get(
  '/:id/download',
  verifyToken,
  authorizeDocumentAccess('read'),
  downloadDocument
);

/**
 * @route   PUT /api/documents/:id/share
 * @desc    Manage sharing permissions (add, update, or revoke access)
 * @access  Private (Owner of document or Admin)
 */
router.put(
  '/:id/share',
  verifyToken,
  authorizeRole('owner', 'admin'),
  authorizeDocumentAccess('edit'),
  shareDocument
);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Soft-delete a document
 * @access  Private (Owner of document or Admin)
 */
router.delete(
  '/:id',
  verifyToken,
  authorizeRole('owner', 'admin'),
  authorizeDocumentAccess('edit'),
  deleteDocument
);

module.exports = router;
