const Room = require("../models/Room");

const parsePrice = (price) => {
  if (typeof price === "number") {
    return price;
  }

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
      bedrooms,
      bathrooms,
      area,
      image,
    } = req.body;

    const room = await Room.create({
      title,
      description:
        description ||
        `${bedrooms || 1} bed, ${bathrooms || 1} bath property in ${location}`,
      images: images || (image ? [image] : []),
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
      bedrooms,
      bathrooms,
      area,
      image: image || "🏠",
      createdBy: req.user._id,
    });

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all rooms
const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find().populate("createdBy", "name email");
    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a single room by ID
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate("createdBy", "name email")
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
      bedrooms,
      bathrooms,
      area,
      image,
    } = req.body;

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.createdBy && room.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this room" });
    }

    room.title = title || room.title;
    room.description = description || room.description;
    room.images = images || room.images;
    room.videos = videos || room.videos;
    room.features = features || room.features;
    room.price = price !== undefined ? parsePrice(price) : room.price;
    room.location = location || room.location;
    room.bedrooms = bedrooms !== undefined ? bedrooms : room.bedrooms;
    room.bathrooms = bathrooms !== undefined ? bathrooms : room.bathrooms;
    room.area = area || room.area;
    room.image = image || room.image;

    const updatedRoom = await room.save();
    res.status(200).json(updatedRoom);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid room ID format" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a room
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.createdBy && room.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this room" });
    }

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
  getRoomById,
  updateRoom,
  deleteRoom,
};
