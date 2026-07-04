const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Links back to the application that created this rental
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentApplication",
    },
  },
  { timestamps: true }
);

// One active rental per user per room
rentalSchema.index({ room: 1, renter: 1 }, { unique: true });

module.exports = mongoose.model("Rental", rentalSchema);
