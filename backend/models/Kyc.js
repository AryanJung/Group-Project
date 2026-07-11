const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['user', 'owner'], default: 'user' },
    data: { type: mongoose.Schema.Types.Mixed },
    documentUrl: { type: String, required: true },
    documentName: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    message: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Kyc', kycSchema);
