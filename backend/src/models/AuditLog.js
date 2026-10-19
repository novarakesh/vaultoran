const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: {
      type: String,
      enum: {
        values: [
          'UPLOAD',
          'DOWNLOAD',
          'VIEW_ATTEMPT_DENIED',
          'PERMISSION_CHANGE',
          'DELETE',
          'LOGIN',
        ],
        message: '{VALUE} is not a valid audit action',
      },
      required: [true, 'Audit action is required'],
      index: true,
    },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
      index: true,
    },
    ip: {
      type: String,
      required: [true, 'Client IP address is required'],
    },
    userAgent: {
      type: String,
      default: 'unknown',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Enforce strict immutability: Append-only collection
const rejectAuditModification = function (next) {
  const err = new Error('Security Violation: Audit logs are strictly immutable and cannot be modified or deleted.');
  err.name = 'ImmutableAuditLogError';
  return next(err);
};

// Document-level save hook: prevent updates on existing documents
auditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    const err = new Error('Security Violation: Existing audit logs are strictly immutable and cannot be modified.');
    err.name = 'ImmutableAuditLogError';
    return next(err);
  }
  next();
});

// Document-level and Query-level deletion hooks
auditLogSchema.pre('deleteOne', { document: true, query: true }, rejectAuditModification);
auditLogSchema.pre('deleteMany', { query: true }, rejectAuditModification);

// Query-level update and modification hooks
auditLogSchema.pre('updateOne', rejectAuditModification);
auditLogSchema.pre('updateMany', rejectAuditModification);
auditLogSchema.pre('findOneAndUpdate', rejectAuditModification);
auditLogSchema.pre('findOneAndDelete', rejectAuditModification);
auditLogSchema.pre('replaceOne', rejectAuditModification);
auditLogSchema.pre('findOneAndReplace', rejectAuditModification);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
