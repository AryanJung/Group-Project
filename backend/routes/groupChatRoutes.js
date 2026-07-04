const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");

const {
  createGroupChat,
  getGroupChatByRoom,
  getMyGroupChats,
  getGroupChat,
  addMembers,
  removeMember,
  getChatMessages,
  sendChatMessage,
} = require("../controllers/groupChatController");

// ── Named routes BEFORE /:id to avoid conflicts ──────────────────────────────
router.get("/mine", protect, getMyGroupChats);
router.get("/by-room/:roomId", protect, getGroupChatByRoom);

// ── CRUD ─────────────────────────────────────────────────────────────────────
router.post("/", protect, createGroupChat);
router.get("/:id", protect, getGroupChat);

// ── Members ───────────────────────────────────────────────────────────────────
router.post("/:id/members", protect, addMembers);
router.delete("/:id/members/:userId", protect, removeMember);

// ── Messages ──────────────────────────────────────────────────────────────────
router.get("/:id/messages", protect, getChatMessages);
router.post("/:id/messages", protect, sendChatMessage);

module.exports = router;
