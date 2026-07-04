const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");

const {
  createRoom,
  getAllRooms,
  getMyRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
} = require("../controllers/roomController");

const { cancelRent, getRentalStatus } = require("../controllers/rentalController");

const { applyForRoom, getApplicationsByRoom, getApprovedRenters } = require("../controllers/applicationController");

// Legacy room-based group chat — MUST be registered (was imported but not mounted before)
const { getMessages, sendGroupMessage } = require("../controllers/groupChatController_legacy");


// ── Room CRUD ────────────────────────────────────────────────────────────────
router.get("/", getAllRooms);
router.get("/mine", protect, getMyRooms);
router.get("/:id", getRoomById);
router.post("/", protect, createRoom);
router.put("/:id", protect, updateRoom);
router.delete("/:id", protect, deleteRoom);

// ── Application routes (scoped to room) ─────────────────────────────────────
router.post("/:id/apply", protect, applyForRoom);
router.get("/:id/applications", protect, getApplicationsByRoom);
router.get("/:id/approved-renters", protect, getApprovedRenters);

// ── Rental status + cancel ───────────────────────────────────────────────────
router.get("/:id/rent/status", protect, getRentalStatus);
router.delete("/:id/rent", protect, cancelRent);

// ── Legacy room-scoped group chat (fallback for Chat.js) ─────────────────────
router.get("/:id/group-chat/messages", protect, getMessages);
router.post("/:id/group-chat/messages", protect, sendGroupMessage);

module.exports = router;