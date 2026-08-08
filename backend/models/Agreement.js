const mongoose = require('mongoose');

const agreementSchema = new mongoose.Schema(
  {
    agreementId: { type: String, required: true, unique: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    landlord: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: [
        'draft',
        'sent',
        'changes_requested',
        'final_pending',
        'executed',
        'locked',
        'terminated',
      ],
      default: 'draft',
    },
    effectiveDate: { type: Date },
    expiryDate: { type: Date },
    currentVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Agreement', agreementSchema);
