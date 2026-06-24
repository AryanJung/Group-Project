const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        username: { type: String, unique: true },
        email: { type: String, required: true, unique: true },
        phoneNumber: { type: String, unique: true },
        password: { type: String, required: true }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("User", userSchema);