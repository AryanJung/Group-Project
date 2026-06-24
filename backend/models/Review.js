const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    originalReview: {
      type: String,
      required: true,
      trim: true,
    },

    censoredReview: {
      type: String,
      required: true,
      trim: true,
    },

    wordsBlurred: {
      type: Boolean,
      default: false,
    },

    aiAnalysis: {
      isToxicContext: {
        type: Boolean,
        default: false,
      },

      confidence: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
      },
    },

    status: {
      type: String,
      enum: ["approved", "pending_verification", "pending", "rejected"],
      default: "approved",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Review", reviewSchema);