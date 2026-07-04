const Room = require("../models/Room");
const Rental = require("../models/Rental");

// ─── Helper ──────────────────────────────────────────────────────────────────

const syncRoomStatus = async (room) => {
  const count = await Rental.countDocuments({ room: room._id });
  room.isRented = count >= room.maxRenters;
  await room.save();
};

// ─── Cancel rental ────────────────────────────────────────────────────────────

/**
 * DELETE /rooms/:id/rent
 * Authenticated. Renter cancels their active rental for this room.
 * Recalculates isRented based on remaining rental count vs maxRenters.
 */
const cancelRent = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const rental = await Rental.findOne({ room: room._id, renter: req.user._id });
    if (!rental) {
      return res.status(404).json({ message: "No active rental found for this property" });
    }

    await Rental.findByIdAndDelete(rental._id);
    await syncRoomStatus(room);

    return res.status(200).json({ message: "Rental cancelled successfully" });
  } catch (error) {
    console.error("cancelRent error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Rental status ────────────────────────────────────────────────────────────

/**
 * GET /rooms/:id/rent/status
 * Authenticated. Returns the full rental/application status for the current user.
 */
const getRentalStatus = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const isOwner =
      room.createdBy && room.createdBy.toString() === req.user._id.toString();

    const rental = await Rental.findOne({ room: room._id, renter: req.user._id });

    // Also check for pending/rejected application
    const RentApplication = require("../models/RentApplication");
    const application = await RentApplication.findOne({
      room: room._id,
      applicant: req.user._id,
    }).select("status _id");

    return res.status(200).json({
      isOwner,
      isRenter: Boolean(rental),
      isRented: room.isRented,
      maxRenters: room.maxRenters,
      rental: rental || null,
      application: application || null,   // { _id, status } or null
    });
  } catch (error) {
    console.error("getRentalStatus error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── My chats (rental-based sessions) ────────────────────────────────────────

/**
 * GET /rentals/my-chats
 * Returns all rental sessions for the current user (legacy room-based chats).
 */
const getMyChats = async (req, res) => {
  try {
    const userId = req.user._id;
    const rentals = await Rental.find({ $or: [{ renter: userId }, { owner: userId }] })
      .populate("room", "title location image")
      .populate("renter", "name email")
      .populate("owner", "name email")
      .sort({ createdAt: -1 });

    const sessions = rentals.map((rental) => {
      const isOwner = rental.owner?._id?.toString() === userId.toString();
      const otherParty = isOwner ? rental.renter : rental.owner;
      return {
        rentalId: rental._id,
        roomId: rental.room?._id,
        roomTitle: rental.room?.title || "Unknown Property",
        roomLocation: rental.room?.location || "",
        roomImage: rental.room?.image || "🏠",
        otherPartyName: otherParty?.name || "Unknown User",
        myRole: isOwner ? "Owner" : "Renter",
        createdAt: rental.createdAt,
      };
    });

    return res.status(200).json(sessions);
  } catch (error) {
    console.error("getMyChats error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── My rentals ───────────────────────────────────────────────────────────────

/**
 * GET /rentals/my-rentals
 * Returns all rooms the current user is actively renting.
 */
const getMyRentals = async (req, res) => {
  try {
    const rentals = await Rental.find({ renter: req.user._id })
      .populate({
        path: "room",
        populate: { path: "createdBy", select: "name email" },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json(rentals);
  } catch (error) {
    console.error("getMyRentals error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { cancelRent, getRentalStatus, getMyChats, getMyRentals };
