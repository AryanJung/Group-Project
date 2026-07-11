const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        username: { type: String, unique: true },
        email: { type: String, required: true, unique: true },
        phoneNumber: { type: String, unique: true },
        password: { type: String, required: true },
        role: {
            type: String,
            enum: ["renter", "owner", "admin", "superadmin"],
            default: "renter",
        },
        // KYC / moderation fields (added by teammate)
        suspended: { type: Boolean, default: false },
        banned: { type: Boolean, default: false },
        kycVerified: { type: Boolean, default: false },
        suspendedUntil: { type: Date, default: null },
        suspensionStart: { type: Date, default: null },
        suspensionReason: { type: String, default: '' },
        notifications: { type: Array, default: [] },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("User", userSchema);