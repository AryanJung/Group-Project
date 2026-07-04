const express = require("express");
const router = express.Router();
const { chat } = require("../controllers/chatController");

// POST /chat — no auth required, chatbot is public-facing
router.post("/", chat);

module.exports = router;
