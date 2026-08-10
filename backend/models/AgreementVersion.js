const mongoose = require('mongoose');

const agreementVersionSchema = new mongoose.Schema(
  {
    agreement: { type: mongoose.Schema.Types.ObjectId, ref: 'Agreement', required: true, index: true },
    versionNumber: { type: Number, required: true },
    content: { type: String, required: true }, // rendered contract text (HTML/Markdown)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changeSummary: { type: String },
    previousVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'AgreementVersion' },
    status: { type: String, enum: ['draft', 'sent', 'accepted', 'declined', 'executed', 'locked'], default: 'draft' },
  },
  { timestamps: true }
);

// unique version number per agreement
agreementVersionSchema.index({ agreement: 1, versionNumber: 1 }, { unique: true });

module.exports = mongoose.model('AgreementVersion', agreementVersionSchema);
