const mongoose = require("mongoose");

const rentApplicationSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "selected",
        "visit_requested",
        "visit_scheduled",
        "visit_completed",
        "both_agree_to_proceed",
        "agreement_draft",
        "accepted",
        "rejected",
      ],
      default: "pending",
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// One application per user per room
rentApplicationSchema.index({ room: 1, applicant: 1 }, { unique: true });

module.exports = mongoose.model("RentApplication", rentApplicationSchema);
