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
  getApplicationMessages,
  sendApplicationMessage,
} = require("../controllers/applicationController");

// Applicant routes
router.get("/mine", protect, getMyApplications);
router.delete("/:id", protect, withdrawApplication);

// Owner routes
router.get("/owner", protect, getOwnerApplications);
router.patch("/:id/accept", protect, acceptApplication);
router.patch("/:id/reject", protect, rejectApplication);
router.get("/:id/applicant", protect, getApplicantProfile);

// Owner <-> applicant discussion thread (either party)
router.get("/:id/messages", protect, getApplicationMessages);
router.post("/:id/messages", protect, sendApplicationMessage);

module.exports = router;
