const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        username: { type: String, unique: true },
        email: { type: String, required: true, unique: true },
        phoneNumber: { type: String, unique: true },
        password: { type: String, required: true },
        // Additional fields expected by controllers
        role: { type: String, enum: ['user', 'owner', 'admin'], default: 'user' },
        suspended: { type: Boolean, default: false },
        banned: { type: Boolean, default: false },
        kycVerified: { type: Boolean, default: false },
        suspendedUntil: { type: Date, default: null },
        notifications: { type: Array, default: [] },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("User", userSchema);