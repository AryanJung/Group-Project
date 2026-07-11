const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "new_application",
        "application_accepted",
        "application_rejected",
        "kyc_approved",
        "kyc_rejected",
        "property_approved",
        "property_rejected",
        "account_banned",
        "account_unbanned",
        "account_suspended",
        "account_unsuspended",
        "review_deleted",
        "review_approved",
      ],
      required: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentApplication",
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
