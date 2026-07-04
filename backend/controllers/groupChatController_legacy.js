/**
 * Legacy room-based group chat controller.
 * Kept for backward compatibility — these endpoints use the old `room` field
 * on GroupMessage. New chats should use GroupChat + /group-chats/* endpoints.
 */
const Room = require("../models/Room");
const Rental = require("../models/Rental");
const GroupMessage = require("../models/GroupMessage");

const resolveAccess = async (roomId, userId) => {
  const room = await Room.findById(roomId);
  if (!room) return null;
  const isOwner = room.createdBy && room.createdBy.toString() === userId.toString();
  if (isOwner) return { isOwner: true, isRenter: false, room };
  const rental = await Rental.findOne({ room: roomId, renter: userId });
  if (rental) return { isOwner: false, isRenter: true, room };
  return null;
};

const getMessages = async (req, res) => {
  try {
    const access = await resolveAccess(req.params.id, req.user._id);
    if (!access) {
      return res.status(403).json({ message: "Access denied. Only the owner or a verified renter can view this chat." });
    }
    const messages = await GroupMessage.find({ room: req.params.id })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate("sender", "name email");
    return res.status(200).json(messages);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const sendGroupMessage = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "text is required" });
    const access = await resolveAccess(req.params.id, req.user._id);
    if (!access) {
      return res.status(403).json({ message: "Access denied." });
    }
    const message = await GroupMessage.create({
      room: req.params.id,
      sender: req.user._id,
      text: text.trim(),
    });
    await message.populate("sender", "name email");
    return res.status(201).json(message);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { getMessages, sendGroupMessage };
