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
        "visit_requested",
        "visit_confirmed",
        "visit_rescheduled",
        "visit_rejected",
        "visit_completed",
        "both_agree_to_proceed",
        "agreement_created",
        "agreement_sent",
        "changes_requested",
        "version_created",
        "agreement_accepted",
        "agreement_executed",
        "agreement_locked",
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
