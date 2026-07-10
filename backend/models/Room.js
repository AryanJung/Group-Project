const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true },
    images:      [{ type: String }],
    videos:      [{ type: String }],
    features:    [{ type: String }],
    price:       { type: Number, required: true, min: 0 },
    location:    { type: String, required: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    bedrooms:  { type: Number, min: 0 },
    bathrooms: { type: Number, min: 0 },
    area:      { type: String },
    image:     { type: String, default: "🏠" },
    reviews:   [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
    rating:    { type: Number, default: 0, min: 0, max: 5 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Max number of renters this listing accepts (e.g. 2 for a 2-room flat)
    maxRenters: { type: Number, default: 1, min: 1 },

    // True when acceptedRenters count has reached maxRenters (listing at capacity)
    isRented: { type: Boolean, default: false },
    // Approval workflow for public visibility
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Room", roomSchema);