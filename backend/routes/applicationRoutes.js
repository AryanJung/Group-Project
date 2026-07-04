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
} = require("../controllers/applicationController");

// Applicant routes
router.get("/mine", protect, getMyApplications);
router.delete("/:id", protect, withdrawApplication);

// Owner routes
router.get("/owner", protect, getOwnerApplications);
router.patch("/:id/accept", protect, acceptApplication);
router.patch("/:id/reject", protect, rejectApplication);

module.exports = router;
