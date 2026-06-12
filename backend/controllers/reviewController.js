const Review = require("../models/Review");
const Room = require("../models/Room");

// Add a review to a room
const addReview = async (req, res) => {
    try {
        const { comment, rating } = req.body;

        if (!comment || !rating) {
            return res.status(400).json({ message: "Comment and rating are required" });
        }

        const room = await Room.findById(req.params.roomId);
        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }

        const review = await Review.create({
            user: req.user._id,
            room: room._id,
            comment,
            rating,
        });

        room.reviews.push(review._id);

        // Recalculate average rating
        const allReviews = await Review.find({ room: room._id });
        const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
        room.rating = parseFloat((totalRating / allReviews.length).toFixed(1));

        await room.save();

        res.status(201).json(review);
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ message: "Invalid room ID format" });
        }
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all reviews for a room
const getReviewsByRoom = async (req, res) => {
    try {
        const reviews = await Review.find({ room: req.params.roomId })
            .populate("user", "username email");

        res.status(200).json(reviews);
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ message: "Invalid room ID format" });
        }
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete a review
const deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        // Only allow the user who created the review to delete it
        if (review.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to delete this review" });
        }

        await Review.findByIdAndDelete(req.params.id);

        // Remove review ref from room and recalculate rating
        const room = await Room.findById(review.room);
        if (room) {
            room.reviews.pull(review._id);

            const remaining = await Review.find({ room: room._id });
            room.rating = remaining.length
                ? parseFloat((remaining.reduce((sum, r) => sum + r.rating, 0) / remaining.length).toFixed(1))
                : 0;

            await room.save();
        }

        res.status(200).json({ message: "Review deleted successfully" });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ message: "Invalid review ID format" });
        }
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    addReview,
    getReviewsByRoom,
    deleteReview,
};
