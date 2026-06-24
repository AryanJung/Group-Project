const Review = require("../models/Review");
const Room = require("../models/Room");

const MODERATION_SERVICE_PORT =
  process.env.MODERATION_SERVICE_PORT || "8001";

const MODERATION_SERVICE_URL =
  process.env.MODERATION_SERVICE_URL ||
  `http://127.0.0.1:${MODERATION_SERVICE_PORT}/predict`;

const MODERATION_TIMEOUT_MS =
  Number(process.env.MODERATION_TIMEOUT_MS) || 20000;

const CONFIDENCE_THRESHOLD =
  Number(process.env.MODERATION_CONFIDENCE_THRESHOLD) || 0.75;

const PENDING_STATUSES = ["pending_verification", "pending"];

const normalizeModerationResult = (payload, fallbackText) => {
  const aiAnalysis = payload?.ai_analysis || {};

  return {
    censoredText:
      typeof payload?.censored_text === "string" &&
      payload.censored_text.trim().length > 0
        ? payload.censored_text
        : fallbackText,

    wordsBlurred: Boolean(payload?.words_blurred),

    aiAnalysis: {
      isToxicContext: Boolean(aiAnalysis.is_toxic_context),
      confidence: Number(aiAnalysis.confidence) || 0,
    },
  };
};

const determineReviewStatus = (moderationResult) => {
  const { wordsBlurred, aiAnalysis } = moderationResult;
  const { isToxicContext, confidence } = aiAnalysis;

  // Case B: hardcoded slurs are censored and auto-approved
  if (wordsBlurred) {
    return "approved";
  }

  // Case C: uncertain AI decision or detected non-hardcoded profanity
  if (isToxicContext || confidence < CONFIDENCE_THRESHOLD) {
    return "pending_verification";
  }

  // Case A: clean review with confident AI approval
  return "approved";
};

const getModeratedText = async (text) => {
  const controller = new AbortController();

  const timeoutId = setTimeout(
    () => controller.abort(),
    MODERATION_TIMEOUT_MS
  );

  try {
    const response = await fetch(MODERATION_SERVICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Moderation service returned ${response.status}`
      );
    }

    const payload = await response.json();

    return normalizeModerationResult(payload, text);
  } catch (error) {
    console.error("Moderation Service Error:", error);

    // Service unavailable: treat as uncertain and queue for verification
    return {
      censoredText: text,
      wordsBlurred: false,
      aiAnalysis: {
        isToxicContext: false,
        confidence: 0,
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

const recalculateRoomRating = async (roomId) => {
  const approvedReviews = await Review.find({
    room: roomId,
    status: "approved",
  });

  const totalRating = approvedReviews.reduce(
    (sum, review) => sum + review.rating,
    0
  );

  return approvedReviews.length > 0
    ? parseFloat((totalRating / approvedReviews.length).toFixed(1))
    : 0;
};

// CREATE REVIEW
const addReview = async (req, res) => {
  try {
    const { comment, rating } = req.body;

    if (!comment || !rating) {
      return res.status(400).json({
        message: "Comment and rating are required",
      });
    }

    const numericRating = Number(rating);
    if (
      Number.isNaN(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        message: "Rating must be a number between 1 and 5",
      });
    }

    const room = await Room.findById(req.params.roomId);

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    const moderationResult = await getModeratedText(comment);
    const reviewStatus = determineReviewStatus(moderationResult);

    const review = await Review.create({
      user: req.user._id,
      room: room._id,
      rating: numericRating,
      originalReview: comment,
      censoredReview: moderationResult.censoredText,
      wordsBlurred: moderationResult.wordsBlurred,
      aiAnalysis: moderationResult.aiAnalysis,
      status: reviewStatus,
    });

    room.reviews.push(review._id);
    room.rating = await recalculateRoomRating(room._id);
    await room.save();

    const populatedReview = await Review.findById(review._id).populate(
      "user",
      "name email"
    );

    return res.status(201).json(populatedReview);
  } catch (error) {
    console.error(error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid room ID format",
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// GET APPROVED REVIEWS FOR ROOM
const getReviewsByRoom = async (req, res) => {
  try {
    const reviews = await Review.find({
      room: req.params.roomId,
      status: "approved",
    })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json(reviews);
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// GET PENDING REVIEWS
const getPendingReviews = async (req, res) => {
  try {
    const pendingReviews = await Review.find({
      status: { $in: PENDING_STATUSES },
    })
      .populate("user", "name email")
      .populate("room", "title")
      .sort({ createdAt: -1 });

    return res.status(200).json(pendingReviews);
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// APPROVE / REJECT REVIEW
const moderateReview = async (req, res) => {
  try {
    const { action, updatedCensoredText } = req.body;

    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    if (action === "reject") {
      const room = await Room.findById(review.room);

      if (room) {
        room.reviews.pull(review._id);
        await room.save();
      }

      await Review.findByIdAndDelete(review._id);

      return res.status(200).json({
        message: "Review rejected and deleted",
      });
    }

    if (action === "approve") {
      review.status = "approved";

      if (updatedCensoredText) {
        review.censoredReview = updatedCensoredText;
        review.wordsBlurred = true;
      }

      await review.save();

      const room = await Room.findById(review.room);

      if (room) {
        room.rating = await recalculateRoomRating(room._id);
        await room.save();
      }

      return res.status(200).json({
        message: "Review approved successfully",
        review,
      });
    }

    return res.status(400).json({
      message: "Invalid action. Use 'approve' or 'reject'",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// DELETE REVIEW
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized to delete this review",
      });
    }

    await Review.findByIdAndDelete(req.params.id);

    const room = await Room.findById(review.room);

    if (room) {
      room.reviews.pull(review._id);
      room.rating = await recalculateRoomRating(room._id);
      await room.save();
    }

    return res.status(200).json({
      message: "Review deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  addReview,
  getReviewsByRoom,
  getPendingReviews,
  moderateReview,
  deleteReview,
};
