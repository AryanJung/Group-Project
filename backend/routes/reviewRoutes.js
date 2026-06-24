const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/authMiddleware");

const {
  addReview,
  getReviewsByRoom,
  getPendingReviews,
  moderateReview,
  deleteReview,
} = require("../controllers/reviewController");

router.post("/:roomId/reviews", protect, addReview);

router.get("/:roomId/reviews", getReviewsByRoom);

router.get(
  "/reviews/pending",
  protect,
  getPendingReviews
);

router.put(
  "/reviews/:reviewId/moderation",
  protect,
  moderateReview
);

router.delete(
  "/reviews/:id",
  protect,
  deleteReview
);

module.exports = router;