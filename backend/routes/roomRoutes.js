const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const attachUserIfPresent = require("../middlewares/optionalAuthMiddleware");
const { upload } = require("../config/cloudinary");

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
const { getMessages, sendGroupMessage } = require("../controllers/groupChatController_legacy");

// Custom wrapper to intercept and safely isolate Multer errors
const handleUploadMiddleware = (req, res, next) => {
  const uploadProcessor = upload.array('images', 5);
  
  uploadProcessor(req, res, (err) => {
    if (err) {
      console.error("🔴 MULTER INTERCEPT ERROR:", err.message);
      return res.status(400).json({ 
        message: `Image upload streaming failed: ${err.message}`, 
        error: err.message 
      });
    }
    next();
  });
};

// ── Room CRUD ────────────────────────────────────────────────────────────────
router.get("/", getAllRooms);
router.get("/mine", protect, getMyRooms);
router.get("/:id", attachUserIfPresent, getRoomById);

// Wrapped upload middlewares to seamlessly handle file parsing streams
router.post("/", protect, handleUploadMiddleware, createRoom);
router.put("/:id", protect, handleUploadMiddleware, updateRoom);

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