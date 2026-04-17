const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // e.g., "DELETE_USER"
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetName: String,
  targetEmail: String,
  details: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);