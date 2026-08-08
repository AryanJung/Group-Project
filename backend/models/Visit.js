const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RentApplication',
      required: true,
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    landlord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Proposed date/time by tenant
    proposedAt: { type: Date },
    // Confirmed date/time by landlord
    confirmedAt: { type: Date },
    status: {
      type: String,
      enum: [
        'requested',
        'landlord_proposed',
        'landlord_confirmed',
        'rescheduled',
        'rejected',
        'completed',
      ],
      default: 'requested',
    },
    tenantDecision: {
      type: String,
      enum: ['none', 'proceed', 'decline'],
      default: 'none',
    },
    landlordDecision: {
      type: String,
      enum: ['none', 'proceed', 'decline'],
      default: 'none',
    },
    notes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Visit', visitSchema);
