const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");

const {
    addReview,
    getReviewsByRoom,
    deleteReview,
} = require("../controllers/reviewController");

router.post("/:roomId/reviews", protect, addReview);
router.get("/:roomId/reviews", getReviewsByRoom);
router.delete("/reviews/:id", protect, deleteReview);

module.exports = router;
