const Room = require("../models/Room");
const Rental = require("../models/Rental");
const GroupMessage = require("../models/GroupMessage");
const GroupChat = require("../models/GroupChat");
const RentApplication = require("../models/RentApplication");

const parsePrice = (price) => {
  if (typeof price === "number") return price;
  const parsed = parseFloat(String(price).replace(/[^0-9.]/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
};

// Create a new room
const createRoom = async (req, res) => {
  try {
    const {
      title,
      description,
      images,
      videos,
      features,
      price,
      location,
      coordinates,
      bedrooms,
      bathrooms,
      area,
      image,
      maxRenters,
    } = req.body;

    let uploadedImages = [];
    if (req.files && req.files.length > 0) {
      uploadedImages = req.files.map(file => file.path);
    }

    const room = await Room.create({
      title,
      description:
        description ||
        `${bedrooms || 1} bed, ${bathrooms || 1} bath property in ${location}`,
     images: uploadedImages, 
      videos,
      features:
        features ||
        [
          bedrooms ? `${bedrooms} bedrooms` : null,
          bathrooms ? `${bathrooms} bathrooms` : null,
          area ? `${area} sqft` : null,
        ].filter(Boolean),
      price: parsePrice(price),
      location,
      coordinates: coordinates || undefined,
      bedrooms,
      bathrooms,
      area,
      image: uploadedImages.length > 0 ? uploadedImages[0] : "🏠",
      createdBy: req.user._id,
      maxRenters: maxRenters ? Math.max(1, parseInt(maxRenters, 10)) : 1,
    });

    res.status(201).json(room);
 } catch (error) {
    console.error("🔴 BACKEND UPLOAD ERROR DETAILS:");
    console.error(error); // This prints the entire error object/stack trace without wrapping it as an object string
    // ─────────────────────────────────────────────────────────────────
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all rooms (public — for browse page)
const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find().populate("createdBy", "name email role");
    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get rooms created by the authenticated user (owner's listings)
const getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ createdBy: req.user._id })
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });
    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a single room by ID
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate("createdBy", "name email role")
      .populate({
        path: "reviews",
        match: { status: "approved" },
        populate: { path: "user", select: "name email" },
      });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.status(200).json(room);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid room ID format" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a room
const updateRoom = async (req, res) => {
  try {
    const {
      title,
      description,
      images,
      videos,
      features,
      price,
      location,
      coordinates,
      bedrooms,
      bathrooms,
      area,
      image,
      maxRenters,
    } = req.body;

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.createdBy && room.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this room" });
    }
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.path);
      // Option A: Replace images completely with new uploads:
      room.images = newImages;
      room.image = newImages[0]; // update main thumbnail
    }

    room.title = title || room.title;
    room.description = description || room.description;
    room.images = images || room.images;
    room.videos = videos || room.videos;
    room.features = features || room.features;
    room.price = price !== undefined ? parsePrice(price) : room.price;
    room.location = location || room.location;
    if (coordinates) room.coordinates = coordinates;
    room.bedrooms = bedrooms !== undefined ? bedrooms : room.bedrooms;
    room.bathrooms = bathrooms !== undefined ? bathrooms : room.bathrooms;
    room.area = area || room.area;
    room.image = image || room.image;
    if (maxRenters) room.maxRenters = Math.max(1, parseInt(maxRenters, 10));

    const updatedRoom = await room.save();
    res.status(200).json(updatedRoom);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid room ID format" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a room — cascades to Rental and GroupMessage records
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.createdBy && room.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this room" });
    }

    // Cascade delete all related records
    await RentApplication.deleteMany({ room: room._id });
    await Rental.deleteMany({ room: room._id });
    await GroupMessage.deleteMany({ room: room._id });
    await GroupChat.deleteMany({ room: room._id });
    await Room.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Room deleted successfully" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid room ID format" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createRoom,
  getAllRooms,
  getMyRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
};
