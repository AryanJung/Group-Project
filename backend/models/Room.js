const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true },
        images: [{ type: String }],
        videos: [{ type: String }],
        features: [{ type: String }],
        price: { type: Number, required: true, min: 0 },
        location: { type: String, required: true },
        reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
        rating: { type: Number, default: 0, min: 0, max: 5 },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Room", roomSchema);
