const mongoose = require("mongoose");

const groupMessageSchema = new mongoose.Schema(
  {
    // New: links to a GroupChat document (multi-member owner-created chats)
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupChat",
      index: true,
    },
    // Legacy: direct room-based chat (kept for backward compatibility)
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

// Validate that at least one of chat or room is set
groupMessageSchema.pre("save", function (next) {
  if (!this.chat && !this.room) {
    return next(new Error("GroupMessage must belong to either a chat or a room"));
  }
  next();
});

module.exports = mongoose.model("GroupMessage", groupMessageSchema);
