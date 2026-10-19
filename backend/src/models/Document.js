const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    category: {
      type: String,
      required: [true, 'Document category is required'],
      trim: true,
      default: 'Confidential',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Document owner is required'],
      index: true,
    },
    filePath: {
      type: String,
      required: [true, 'Secure storage file path is required'],
    },
    originalName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    size: {
      type: Number,
      required: [true, 'File size in bytes is required'],
    },
    fileHash: {
      type: String,
      required: [true, 'SHA-256 file integrity hash is required'],
      index: true,
    },
    fileData: {
      type: Buffer,
      select: false, // Excluded from general queries, loaded specifically on download
    },
    sharedWith: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        permission: {
          type: String,
          enum: ['read', 'edit'],
          default: 'read',
        },
        sharedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Helpful compound indexes
documentSchema.index({ owner: 1, isDeleted: 1 });
documentSchema.index({ 'sharedWith.user': 1, isDeleted: 1 });
documentSchema.index({ title: 'text', category: 'text' });

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
