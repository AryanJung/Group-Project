const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { uploadChatAttachment } = require("../config/cloudinary");

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

const handleChatAttachment = (req, res, next) => {
  uploadChatAttachment.single("attachment")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
};

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
router.post("/:id/messages", protect, handleChatAttachment, sendChatMessage);

module.exports = router;
