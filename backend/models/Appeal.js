const mongoose = require('mongoose');

const appealSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['unsuspend'],
      required: true,
    },
    message: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appeal', appealSchema);
