const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");

const {
    createRoom,
    getAllRooms,
    getRoomById,
    updateRoom,
    deleteRoom,
} = require("../controllers/roomController");

router.get("/", getAllRooms);
router.get("/:id", getRoomById);
router.post("/", protect, createRoom);
router.put("/:id", protect, updateRoom);
router.delete("/:id", protect, deleteRoom);

module.exports = router;