const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");

const {
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
} = require("../controllers/applicationController");

// Applicant routes
router.get("/mine", protect, getMyApplications);
router.delete("/:id", protect, withdrawApplication);

// Owner routes
router.get("/owner", protect, getOwnerApplications);
router.patch("/:id/accept", protect, acceptApplication);
router.patch("/:id/reject", protect, rejectApplication);
router.get("/:id/applicant", protect, getApplicantProfile);

// Owner <-> applicant discussion thread (either party) — opens/creates the
// GroupChat used by the existing Chat UI, ahead of acceptance.
router.post("/:id/chat", protect, getOrCreateApplicationChat);

module.exports = router;
