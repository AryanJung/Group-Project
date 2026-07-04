const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { getMyChats, getMyRentals } = require("../controllers/rentalController");

// GET /rentals/my-chats  — all chat sessions (owner or renter)
router.get("/my-chats", protect, getMyChats);

// GET /rentals/my-rentals — rooms the current user is renting
router.get("/my-rentals", protect, getMyRentals);

module.exports = router;
