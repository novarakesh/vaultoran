const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');

/**
 * Get paginated, filterable audit trail
 * Strictly restricted to 'admin' role
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { action, userId, documentId, startDate, endDate } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (action) {
      filter.action = action.trim().toUpperCase();
    }

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.user = userId;
    }

    if (documentId && mongoose.Types.ObjectId.isValid(documentId)) {
      filter.document = documentId;
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate('user', 'name email role')
      .populate('document', 'title category originalName')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      count: logs.length,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
};
