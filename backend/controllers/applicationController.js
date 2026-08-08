const Room = require("../models/Room");
const Rental = require("../models/Rental");
const RentApplication = require("../models/RentApplication");
const Notification = require("../models/Notification");
const GroupChat = require("../models/GroupChat");
const Kyc = require("../models/Kyc");

// ─── Helper ─────────────────────────────────────────────────────────────────

/**
 * Recompute and persist isRented on a room based on how many active Rentals
 * it currently has vs its maxRenters capacity.
 */
const syncRoomStatus = async (room) => {
  const count = await Rental.countDocuments({ room: room._id });
  room.isRented = count >= room.maxRenters;
  await room.save();
};

// ─── Apply ───────────────────────────────────────────────────────────────────

/**
 * POST /rooms/:id/apply
 * Authenticated. Applicant submits a rental application.
 * Body: { message?: string }
 */
const applyForRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (!req.user.kycVerified) {
      return res.status(403).json({
        message: "Please complete KYC verification before applying to rent.",
        kycRequired: true,
      });
    }

    // Owner cannot apply to their own listing
    if (room.createdBy?.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot apply to your own listing" });
    }

    // Check if listing is at capacity
    const rentalCount = await Rental.countDocuments({ room: room._id });
    if (rentalCount >= room.maxRenters) {
      return res.status(409).json({ message: "This listing is already at full capacity" });
    }

    // Check for existing application
    const existing = await RentApplication.findOne({
      room: room._id,
      applicant: req.user._id,
    });
    if (existing) {
      return res.status(409).json({
        message: `You already have a ${existing.status} application for this listing`,
        application: existing,
      });
    }

    const application = await RentApplication.create({
      room: room._id,
      applicant: req.user._id,
      owner: room.createdBy,
      message: req.body.message?.trim() || undefined,
    });

    // Notify the owner
    await Notification.create({
      recipient: room.createdBy,
      type: "new_application",
      application: application._id,
      room: room._id,
      fromUser: req.user._id,
      message: `${req.user.name} applied to rent "${room.title}"`,
    });

    const populated = await application.populate([
      { path: "applicant", select: "name email" },
      { path: "room", select: "title location" },
    ]);

    return res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "You have already applied for this listing" });
    }
    console.error("applyForRoom error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Owner: view applications ────────────────────────────────────────────────

/**
 * GET /rooms/:id/applications
 * Authenticated. Owner only. Lists all applications for their listing.
 * Optional query: ?status=pending|accepted|rejected
 */
const getApplicationsByRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the owner can view applications" });
    }

    const filter = { room: room._id };
    if (req.query.status) filter.status = req.query.status;

    const applications = await RentApplication.find(filter)
      .populate("applicant", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json(applications);
  } catch (error) {
    console.error("getApplicationsByRoom error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Applicant: view own applications ───────────────────────────────────────

/**
 * GET /applications/mine
 * Authenticated. Returns all applications submitted by the current user.
 */
const getMyApplications = async (req, res) => {
  try {
    const applications = await RentApplication.find({ applicant: req.user._id })
      .populate("room", "title location image maxRenters isRented")
      .populate("owner", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json(applications);
  } catch (error) {
    console.error("getMyApplications error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Owner: accept application ───────────────────────────────────────────────

/**
 * PATCH /applications/:id/accept
 * Authenticated. Owner only. Accepts a pending application.
 * Creates a Rental record and notifies the applicant.
 */
const acceptApplication = async (req, res) => {
  try {
    const application = await RentApplication.findById(req.params.id)
      .populate("room")
      .populate("applicant", "name email");

    if (!application) return res.status(404).json({ message: "Application not found" });

    // Only the owner of the listing can accept
    if (application.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the listing owner can accept applications" });
    }

    if (application.status !== "pending") {
      return res.status(400).json({
        message: `Application is already ${application.status}`,
      });
    }

    const room = application.room;

    // Double-check capacity before accepting
    const rentalCount = await Rental.countDocuments({ room: room._id });
    if (rentalCount >= room.maxRenters) {
      return res.status(409).json({
        message: "Listing is already at full capacity. Cannot accept more renters.",
      });
    }

    // MARK AS SELECTED PROSPECT — DO NOT CREATE A RENTAL HERE
    // This follows the business rule: selection is not tenancy. The owner
    // selects a prospective tenant; tenancy will be created only after an
    // executed agreement.
    application.status = "selected";
    await application.save();

    // Notify the applicant that they have been selected as prospective tenant
    await Notification.create({
      recipient: application.applicant._id,
      type: "application_accepted",
      application: application._id,
      room: room._id,
      fromUser: req.user._id,
      message: `You have been selected as a prospective tenant for "${room.title}". Please schedule a visit to proceed.`,
    });

    return res.status(200).json({ application });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "This user is already renting this property" });
    }
    console.error("acceptApplication error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Owner: reject application ───────────────────────────────────────────────

/**
 * PATCH /applications/:id/reject
 * Authenticated. Owner only. Rejects a pending application.
 */
const rejectApplication = async (req, res) => {
  try {
    const application = await RentApplication.findById(req.params.id)
      .populate("room", "title")
      .populate("applicant", "name email");

    if (!application) return res.status(404).json({ message: "Application not found" });

    if (application.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the listing owner can reject applications" });
    }

    if (application.status === "rejected") {
      return res.status(400).json({ message: `Application is already ${application.status}` });
    }

    const rentalExists = await Rental.exists({ room: application.room._id, renter: application.applicant._id });
    if (rentalExists) {
      return res.status(400).json({ message: "Cannot reject an application after the rental has been finalized." });
    }

    application.status = "rejected";
    await application.save();

    // Notify the applicant
    await Notification.create({
      recipient: application.applicant._id,
      type: "application_rejected",
      application: application._id,
      room: application.room._id,
      fromUser: req.user._id,
      message: `Your application for "${application.room.title}" was not approved.`,
    });

    return res.status(200).json(application);
  } catch (error) {
    console.error("rejectApplication error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Applicant: withdraw application ────────────────────────────────────────

/**
 * DELETE /applications/:id
 * Authenticated. Applicant only. Withdraws a pending application.
 */
const withdrawApplication = async (req, res) => {
  try {
    const application = await RentApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ message: "Application not found" });

    if (application.applicant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only withdraw your own applications" });
    }

    if (application.status !== "pending") {
      return res.status(400).json({
        message: `Cannot withdraw a ${application.status} application`,
      });
    }

    await RentApplication.findByIdAndDelete(application._id);
    return res.status(200).json({ message: "Application withdrawn successfully" });
  } catch (error) {
    console.error("withdrawApplication error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * GET /rooms/:id/approved-renters
 * Authenticated. Owner only. Returns all users with accepted Rentals for this room.
 * Used by the owner to select members when creating/updating a group chat.
 */
const getApprovedRenters = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the owner can view approved renters" });
    }

    const rentals = await Rental.find({ room: room._id }).populate(
      "renter",
      "name email"
    );

    const renters = rentals.map((r) => r.renter);
    return res.status(200).json(renters);
  } catch (error) {
    console.error("getApprovedRenters error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * GET /applications/owner
 * Authenticated. Owner only. Returns ALL applications across all their listings.
 * Optional query: ?status=pending|accepted|rejected
 */
const getOwnerApplications = async (req, res) => {
  try {
    const filter = { owner: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const applications = await RentApplication.find(filter)
      .populate("applicant", "name email")
      .populate("room", "title location image")
      .sort({ createdAt: -1 });

    return res.status(200).json(applications);
  } catch (error) {
    console.error("getOwnerApplications error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Owner: view applicant profile ───────────────────────────────────────────

/**
 * GET /applications/:id/applicant
 * Authenticated. Owner only. Returns the applicant's profile plus their
 * latest KYC verification status, so the owner can vet them before deciding.
 */
const getApplicantProfile = async (req, res) => {
  try {
    const application = await RentApplication.findById(req.params.id).populate(
      "applicant",
      "name username email phoneNumber kycVerified createdAt"
    );
    if (!application) return res.status(404).json({ message: "Application not found" });

    if (application.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the listing owner can view this applicant's profile" });
    }

    const latestKyc = await Kyc.findOne({ user: application.applicant._id })
      .sort({ createdAt: -1 })
      .select("status role createdAt");

    return res.status(200).json({
      applicant: application.applicant,
      kyc: latestKyc || null,
    });
  } catch (error) {
    console.error("getApplicantProfile error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Owner <-> applicant messaging ────────────────────────────────────────────

/**
 * POST /applications/:id/chat
 * Authenticated. Owner or applicant only.
 * Finds or creates the private GroupChat between this application's owner and
 * applicant, so pre-decision discussion can happen in the same chat UI used
 * for accepted renters (GroupChat/Chat.js) instead of a separate system.
 * Bypasses the Rental-membership check in createGroupChat since the
 * applicant is not an accepted renter yet.
 */
const getOrCreateApplicationChat = async (req, res) => {
  try {
    const application = await RentApplication.findById(req.params.id)
      .populate("room", "title")
      .populate("applicant", "name");
    if (!application) return res.status(404).json({ message: "Application not found" });

    const uid = req.user._id.toString();
    if (application.owner.toString() !== uid && application.applicant._id.toString() !== uid) {
      return res.status(403).json({ message: "Access denied" });
    }

    let chat = await GroupChat.findOne({
      room: application.room._id,
      owner: application.owner,
      members: application.applicant._id,
    });

    if (!chat) {
      chat = await GroupChat.create({
        name: `${application.applicant.name} · ${application.room.title}`,
        room: application.room._id,
        owner: application.owner,
        members: [application.applicant._id],
      });
    }

    const populated = await chat.populate([
      { path: "room", select: "title location image" },
      { path: "owner", select: "name username email" },
      { path: "members", select: "name username email" },
    ]);

    return res.status(200).json(populated);
  } catch (error) {
    console.error("getOrCreateApplicationChat error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  applyForRoom,
  getApplicationsByRoom,
  getMyApplications,
  getOwnerApplications,
  acceptApplication,
  rejectApplication,
  withdrawApplication,
  getApprovedRenters,
  getApplicantProfile,
  getOrCreateApplicationChat,
};
