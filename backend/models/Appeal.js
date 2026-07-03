const mongoose = require('mongoose');

const appealSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String },
    status: { type: String, enum: ['open', 'reviewed', 'closed'], default: 'open' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appeal', appealSchema);
