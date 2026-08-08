const mongoose = require('mongoose');

const acceptanceSchema = new mongoose.Schema(
  {
    agreement: { type: mongoose.Schema.Types.ObjectId, ref: 'Agreement', required: true, index: true },
    version: { type: mongoose.Schema.Types.ObjectId, ref: 'AgreementVersion', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    acceptedAt: { type: Date, default: Date.now },
    authenticationMethod: { type: String, enum: ['account_auth', 'electronic_acceptance'], default: 'account_auth' },
    role: { type: String, enum: ['tenant', 'landlord'], required: true },
  },
  { timestamps: true }
);

// Prevent duplicate acceptance records for same user/version
acceptanceSchema.index({ agreement: 1, version: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Acceptance', acceptanceSchema);
