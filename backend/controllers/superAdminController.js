const User = require('../models/User');
const Kyc = require('../models/Kyc');
const Review = require('../models/Review');

// Validate key for simple access endpoint
const access = (req, res) => {
  const key = req.query.key || req.headers['x-super-key'];
  if (!key || key !== process.env.SUPER_ADMIN_KEY) {
    return res.status(403).json({ access: false, message: 'Invalid key' });
  }
  return res.json({ access: true });
};

const listPendingKyc = async (req, res) => {
  try {
    const pending = await Kyc.find({ status: 'pending' }).populate('user', 'name email');
    res.json(pending);
  } catch (error) {
    console.error('approveKyc error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const approveKyc = async (req, res) => {
  try {
    const kycId = req.params.id;
    const kyc = await Kyc.findById(kycId);
    if (!kyc) return res.status(404).json({ message: 'KYC not found' });
    kyc.status = 'approved';
    await kyc.save();
    const user = await User.findById(kyc.user);
    if (user) {
      // mark user as verified and set role if KYC requested owner
      user.kycVerified = true;
      if (kyc.role === 'owner') user.role = 'owner';
      user.notifications = user.notifications || [];
      user.notifications.push({ message: 'Your KYC has been approved' });
      await user.save();
    }
    res.json({ message: 'KYC approved' });
  } catch (error) {
    console.error('approveKyc error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const rejectKyc = async (req, res) => {
  try {
    const kycId = req.params.id;
    const { message } = req.body || {};
    const kyc = await Kyc.findById(kycId);
    if (!kyc) return res.status(404).json({ message: 'KYC not found' });
    kyc.status = 'rejected';
    kyc.message = message || 'KYC rejected by admin';
    await kyc.save();
    const user = await User.findById(kyc.user);
    if (user) {
      user.notifications.push({ message: `Your KYC was rejected: ${kyc.message}` });
      await user.save();
    }
    res.json({ message: 'KYC rejected' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const searchUsers = async (req, res) => {
  try {
    const q = req.query.q || '';
    const regex = new RegExp(q, 'i');
    const users = await User.find({ $or: [{ name: regex }, { email: regex }] }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const suspendUser = async (req, res) => {
  try {
    const id = req.params.id;
    const { suspended } = req.body;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // If suspending, set suspended flag and suspendedUntil 15 minutes ahead
    if (suspended) {
      user.suspended = true;
      user.suspendedUntil = new Date(Date.now() + 15 * 60 * 1000);
    } else {
      user.suspended = false;
      user.suspendedUntil = null;
    }
    user.notifications = user.notifications || [];
    user.notifications.push({ message: `Your account has been ${user.suspended ? 'suspended' : 'unsuspended'}` });
    await user.save();
    res.json({ message: `User ${user.suspended ? 'suspended' : 'unsuspended'}` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const banUser = async (req, res) => {
  try {
    const id = req.params.id;
    const { banned } = req.body;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.banned = !!banned;
    user.notifications = user.notifications || [];
    user.notifications.push({ message: `Your account has been ${user.banned ? 'banned' : 'unbanned'}` });
    await user.save();
    res.json({ message: `User ${user.banned ? 'banned' : 'unbanned'}` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const listFlaggedReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      status: { $in: ['pending_verification', 'pending'] }
    })
      .populate('user', 'name email')
      .populate('room', 'title')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

const deleteReview = async (req, res) => {
  try {
    const id = req.params.id;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        message: 'Review not found'
      });
    }

    // Remove review from room's review array
    const room = await Room.findById(review.room);

    if (room) {
      room.reviews.pull(review._id);

      // Recalculate rating after deletion
      const approvedReviews = await Review.find({
        room: room._id,
        status: 'approved',
        _id: { $ne: review._id }
      });

      const totalRating = approvedReviews.reduce(
        (sum, r) => sum + r.rating,
        0
      );

      room.rating =
        approvedReviews.length > 0
          ? parseFloat(
              (totalRating / approvedReviews.length).toFixed(1)
            )
          : 0;

      await room.save();
    }

    // Delete review from Review collection
    await Review.findByIdAndDelete(id);

    // Notify user
    const user = await User.findById(review.user);

    if (user) {
      user.notifications = user.notifications || [];

      user.notifications.push({
        message: 'One of your reviews was removed by moderators'
      });

      await user.save();
    }

    return res.json({
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('deleteReview error:', error);

    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

const editReview = async (req, res) => {
  try {
    const id = req.params.id;
    const { content } = req.body || {};

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (content) {
      review.censoredReview = content;
      review.wordsBlurred = true;
    }

    review.status = "approved";
    await review.save();

    const user = await User.findById(review.user);
    if (user) {
      user.notifications.push({
        message: 'One of your reviews was edited and approved by moderators'
      });
      await user.save();
    }

    res.json({
      message: 'Review edited and published',
      review
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  access,
  listPendingKyc,
  approveKyc,
  rejectKyc,
  searchUsers,
  suspendUser,
  banUser,
  listFlaggedReviews,
  deleteReview,
  editReview
};
