const GroupChat = require("../models/GroupChat");
const GroupMessage = require("../models/GroupMessage");
const Rental = require("../models/Rental");
const Room = require("../models/Room");
const User = require("../models/User");

// ─── Helper ──────────────────────────────────────────────────────────────────

const hasChatAccess = (chat, userId) => {
  const uid = userId.toString();
  return (
    chat.owner.toString() === uid ||
    chat.members.some((m) => m.toString() === uid)
  );
};

// ─── Create group chat ────────────────────────────────────────────────────────

/**
 * POST /group-chats
 * Authenticated. Owner only.
 * Body: { name, roomId, memberIds?: string[] }
 */
const createGroupChat = async (req, res) => {
  try {
    const { name, roomId, memberIds = [] } = req.body;

    if (!name?.trim()) return res.status(400).json({ message: "Chat name is required" });
    if (!roomId) return res.status(400).json({ message: "roomId is required" });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the room owner can create a group chat" });
    }

    // Validate that memberIds are accepted renters for this room
    let validatedMembers = [];
    if (memberIds.length > 0) {
      const rentals = await Rental.find({ room: roomId, renter: { $in: memberIds } });
      validatedMembers = rentals.map((r) => r.renter);
    }

    const chat = await GroupChat.create({
      name: name.trim(),
      room: roomId,
      owner: req.user._id,
      members: validatedMembers,
    });

    const populated = await chat.populate([
      { path: "room", select: "title location image" },
      { path: "owner", select: "name username email" },
      { path: "members", select: "name username email" },
    ]);

    return res.status(201).json(populated);
  } catch (error) {
    console.error("createGroupChat error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Get/create group chat by Room ID ────────────────────────────────────────

/**
 * GET /group-chats/by-room/:roomId
 * Authenticated.
 * Owner  → returns the first GroupChat for this room (or 404 if none created yet)
 * Renter → returns the GroupChat they are a member of for this room (or 403)
 */
const getGroupChatByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const isOwner = room.createdBy?.toString() === userId.toString();

    if (isOwner) {
      const chat = await GroupChat.findOne({ room: roomId })
        .populate("room", "title location image")
        .populate("owner", "name username email")
        .populate("members", "name username email");
      if (!chat) return res.status(404).json({ message: "No group chat created for this room yet" });
      return res.status(200).json(chat);
    }

    // For renters — must have an accepted rental, then must be in the chat members list
    const rental = await Rental.findOne({ room: roomId, renter: userId });
    if (!rental) {
      return res.status(403).json({ message: "You must be an accepted renter to access the chat" });
    }

    const chat = await GroupChat.findOne({ room: roomId, members: userId })
      .populate("room", "title location image")
      .populate("owner", "name username email")
      .populate("members", "name username email");

    if (!chat) {
      return res.status(403).json({ message: "You have not been added to the group chat yet. Ask the owner to add you." });
    }

    return res.status(200).json(chat);
  } catch (error) {
    console.error("getGroupChatByRoom error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


/**
 * GET /group-chats/mine
 * Returns all chats the current user owns or is a member of.
 */
const getMyGroupChats = async (req, res) => {
  try {
    const userId = req.user._id;
    const chats = await GroupChat.find({ $or: [{ owner: userId }, { members: userId }] })
      .populate("room", "title location image")
      .populate("owner", "name username email")
      .populate("members", "name username email")
      .sort({ updatedAt: -1 });

    return res.status(200).json(chats);
  } catch (error) {
    console.error("getMyGroupChats error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Get single chat ──────────────────────────────────────────────────────────

/**
 * GET /group-chats/:id
 */
const getGroupChat = async (req, res) => {
  try {
    const chat = await GroupChat.findById(req.params.id)
      .populate("room", "title location image")
      .populate("owner", "name username email")
      .populate("members", "name username email");

    if (!chat) return res.status(404).json({ message: "Group chat not found" });
    if (!hasChatAccess(chat, req.user._id)) {
      return res.status(403).json({ message: "You are not a member of this chat" });
    }

    return res.status(200).json(chat);
  } catch (error) {
    console.error("getGroupChat error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Add members ──────────────────────────────────────────────────────────────

/**
 * POST /group-chats/:id/members
 * Body: { memberIds: string[] } or { addAll: true }
 */
const addMembers = async (req, res) => {
  try {
    const chat = await GroupChat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: "Group chat not found" });
    if (chat.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the chat owner can add members" });
    }

    let toAdd = [];
    if (req.body.addAll) {
      const rentals = await Rental.find({ room: chat.room });
      toAdd = rentals.map((r) => r.renter.toString());
    } else {
      const { memberIds = [] } = req.body;
      const users = await User.find({ _id: { $in: memberIds } }).select("_id");
      toAdd = users.map((member) => member._id.toString());
    }

    const existing = new Set(chat.members.map((m) => m.toString()));
    const ownerId = chat.owner.toString();
    chat.members.push(...toAdd.filter((id) => id !== ownerId && !existing.has(id)));
    await chat.save();

    const populated = await chat.populate([
      { path: "room", select: "title location image" },
      { path: "owner", select: "name username email" },
      { path: "members", select: "name username email" },
    ]);
    return res.status(200).json(populated);
  } catch (error) {
    console.error("addMembers error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Remove member ────────────────────────────────────────────────────────────

/**
 * DELETE /group-chats/:id/members/:userId
 */
const removeMember = async (req, res) => {
  try {
    const chat = await GroupChat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: "Group chat not found" });
    if (chat.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the chat owner can remove members" });
    }

    chat.members = chat.members.filter((m) => m.toString() !== req.params.userId);
    await chat.save();

    const populated = await chat.populate([
      { path: "owner", select: "name username email" },
      { path: "members", select: "name username email" },
    ]);
    return res.status(200).json(populated);
  } catch (error) {
    console.error("removeMember error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Messages ─────────────────────────────────────────────────────────────────

/**
 * GET /group-chats/:id/messages
 */
const getChatMessages = async (req, res) => {
  try {
    const chat = await GroupChat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: "Group chat not found" });
    if (!hasChatAccess(chat, req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await GroupMessage.find({ chat: chat._id })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate("sender", "name username email");

    return res.status(200).json(messages);
  } catch (error) {
    console.error("getChatMessages error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * POST /group-chats/:id/messages
 * Body: { text: string }
 */
const sendChatMessage = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "text is required" });

    const chat = await GroupChat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: "Group chat not found" });
    if (!hasChatAccess(chat, req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const message = await GroupMessage.create({
      chat: chat._id,
      sender: req.user._id,
      text: text.trim(),
    });

    await message.populate("sender", "name username email");
    return res.status(201).json(message);
  } catch (error) {
    console.error("sendChatMessage error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createGroupChat,
  getGroupChatByRoom,
  getMyGroupChats,
  getGroupChat,
  addMembers,
  removeMember,
  getChatMessages,
  sendChatMessage,
};
