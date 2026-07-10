const User = require('../models/User');
const Kyc = require('../models/Kyc');
const Review = require('../models/Review');
const Room = require('../models/Room');
const Appeal = require('../models/Appeal');
const Notification = require('../models/Notification');

const createKycNotification = async (recipientId, type, message) => {
  if (!recipientId) return;
  await Notification.create({
    recipient: recipientId,
    type,
    message,
  });
};

const createUserNotification = async (recipientId, type, message) => {
  if (!recipientId) return;
  await Notification.create({
    recipient: recipientId,
    type,
    message,
  });
};

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
    const pending = await Kyc.find({ status: 'pending' }).populate('user', 'name email banned');

    const visible = [];

    for (const kyc of pending) {
      const user = kyc.user;

      if (user?.banned) {
        await Kyc.findByIdAndUpdate(
          kyc._id,
          { $set: { status: 'rejected', message: 'Rejected automatically because the account is banned' } },
          { new: true, runValidators: false }
        );

        if (user) {
          await User.findByIdAndUpdate(
            user._id,
            {
              $set: {
                notifications: [...(user.notifications || []), {
                  message: 'Your KYC verification request was rejected automatically because your account is banned.',
                }],
              },
            },
            { new: true, runValidators: false }
          );
          await createKycNotification(
            user._id,
            'kyc_rejected',
            'Your KYC verification request was rejected automatically because your account is banned.'
          );
        }
        continue;
      }

      visible.push(kyc);
    }

    res.json(visible);
  } catch (error) {
    console.error('listPendingKyc error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const approveKyc = async (req, res) => {
  try {
    const kycId = req.params.id;
    const kyc = await Kyc.findById(kycId);
    if (!kyc) return res.status(404).json({ message: 'KYC not found' });

    const user = await User.findById(kyc.user);
    if (user?.banned) {
      await Kyc.findByIdAndUpdate(
        kyc._id,
        { $set: { status: 'rejected', message: 'Rejected automatically because the account is banned' } },
        { new: true, runValidators: false }
      );
      await User.findByIdAndUpdate(
        user._id,
        {
          $set: {
            notifications: [...(user.notifications || []), {
              message: 'Your KYC verification request was rejected automatically because your account is banned.',
            }],
          },
        },
        { new: true, runValidators: false }
      );
      await createKycNotification(user._id, 'kyc_rejected', 'Your KYC verification request was rejected automatically because your account is banned.');
      return res.status(400).json({ message: 'Cannot approve KYC for a banned user' });
    }

    await Kyc.findByIdAndUpdate(
      kyc._id,
      { $set: { status: 'approved', message: 'KYC approved by admin' } },
      { new: true, runValidators: false }
    );

    if (user) {
      const updatePayload = {
        kycVerified: true,
        notifications: [...(user.notifications || []), { message: 'You have been successfully verified.' }],
      };

      if (kyc.role === 'owner') {
        updatePayload.role = 'owner';
      }

      await User.findByIdAndUpdate(
        user._id,
        { $set: updatePayload },
        { new: true, runValidators: false }
      );

      await createKycNotification(user._id, 'kyc_approved', 'You have been successfully verified.');
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

    await Kyc.findByIdAndUpdate(
      kyc._id,
      { $set: { status: 'rejected', message: message || 'KYC rejected by admin' } },
      { new: true, runValidators: false }
    );

    const user = await User.findById(kyc.user);
    if (user) {
      await User.findByIdAndUpdate(
        user._id,
        {
          $set: {
            kycVerified: false,
            notifications: [...(user.notifications || []), { message: 'Your KYC verification request was rejected.' }],
          },
        },
        { new: true, runValidators: false }
      );

      await createKycNotification(user._id, 'kyc_rejected', 'Your KYC verification request was rejected.');
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
    const nextSuspendedState = !!suspended;
    const nextSuspendedUntil = nextSuspendedState ? new Date(Date.now() + 15 * 60 * 1000) : null;

    await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          suspended: nextSuspendedState,
          suspendedUntil: nextSuspendedUntil,
          notifications: [...(user.notifications || []), { message: `Your account has been ${nextSuspendedState ? 'suspended' : 'unsuspended'}` }],
        },
      },
      { new: true, runValidators: false }
    );
    await createUserNotification(
      user._id,
      nextSuspendedState ? 'account_suspended' : 'account_unsuspended',
      `Your account has been ${nextSuspendedState ? 'suspended' : 'unsuspended'}`
    );
    res.json({ message: `User ${nextSuspendedState ? 'suspended' : 'unsuspended'}` });
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

    const shouldBan = !!banned;
    await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          banned: shouldBan,
          notifications: [...(user.notifications || []), { message: `Your account has been ${shouldBan ? 'banned' : 'unbanned'}` }],
        },
      },
      { new: true, runValidators: false }
    );

    if (shouldBan) {
      await Kyc.updateMany(
        { user: user._id, status: 'pending' },
        { status: 'rejected', message: 'Rejected automatically because the account was banned.' }
      );
      await createUserNotification(user._id, 'kyc_rejected', 'Your KYC verification request was rejected automatically because your account was banned.');
    }

    res.json({ message: `User ${shouldBan ? 'banned' : 'unbanned'}` });
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

const listPendingProperties = async (req, res) => {
  try {
    const properties = await Room.find({ status: 'pending' })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(properties);
  } catch (error) {
    console.error('listPendingProperties error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const approveProperty = async (req, res) => {
  try {
    const id = req.params.id;
    const room = await Room.findById(id);
    if (!room) return res.status(404).json({ message: 'Property not found' });

    room.status = 'approved';
    await room.save();

    const owner = await User.findById(room.createdBy);
    if (owner) {
      await createUserNotification(
        owner._id,
        'property_approved',
        'Your property has been approved and is now publicly listed.'
      );
    }

    res.json({ message: 'Property approved' });
  } catch (error) {
    console.error('approveProperty error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const rejectProperty = async (req, res) => {
  try {
    const id = req.params.id;
    const { message } = req.body || {};
    const room = await Room.findById(id);
    if (!room) return res.status(404).json({ message: 'Property not found' });

    room.status = 'rejected';
    await room.save();

    const owner = await User.findById(room.createdBy);
    if (owner) {
      await createUserNotification(
        owner._id,
        'property_rejected',
        message || 'Your property submission was rejected. Please review your listing and submit again.'
      );
    }

    res.json({ message: 'Property rejected' });
  } catch (error) {
    console.error('rejectProperty error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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

    const room = await Room.findById(review.room);

    if (room) {
      room.reviews.pull(review._id);

      const approvedReviews = await Review.find({
        room: room._id,
        status: 'approved',
        _id: { $ne: review._id }
      });

      const totalRating = approvedReviews.reduce(
        (sum, r) => sum + r.rating,
        0
      );

      room.rating = approvedReviews.length > 0
        ? parseFloat((totalRating / approvedReviews.length).toFixed(1))
        : 0;

      await room.save();
    }

    await Review.findByIdAndDelete(id);

    const user = await User.findById(review.user);

    if (user) {
      await User.findByIdAndUpdate(
        user._id,
        {
          $set: {
            notifications: [...(user.notifications || []), {
              message: 'One of your reviews was removed by moderators'
            }],
          },
        },
        { new: true, runValidators: false }
      );
      await createUserNotification(user._id, 'review_deleted', 'One of your reviews was removed by moderators.');
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

    const updatedReview = await Review.findByIdAndUpdate(
      review._id,
      {
        $set: {
          status: 'approved',
          censoredReview: review.censoredReview,
          wordsBlurred: review.wordsBlurred,
        },
      },
      { new: true, runValidators: false }
    );

    const user = await User.findById(review.user);
    if (user) {
      await User.findByIdAndUpdate(
        user._id,
        {
          $set: {
            notifications: [...(user.notifications || []), {
              message: 'One of your reviews was approved by moderators'
            }],
          },
        },
        { new: true, runValidators: false }
      );
      await createUserNotification(user._id, 'review_approved', 'One of your reviews was approved by moderators.');
    }

    res.json({
      message: 'Review published',
      review: updatedReview
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

const listAppeals = async (req, res) => {
  try {
    const appeals = await Appeal.find({ status: { $ne: 'closed' } })
      .populate('user', 'name email banned')
      .sort({ createdAt: -1 });

    res.json(appeals);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const resolveAppeal = async (req, res) => {
  try {
    const id = req.params.id;
    const { action = 'continue' } = req.body || {};
    const appeal = await Appeal.findById(id).populate('user', 'name email banned');

    if (!appeal) {
      return res.status(404).json({ message: 'Appeal not found' });
    }

    const user = await User.findById(appeal.user?._id || appeal.user);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isUnban = action === 'unban';
    const nextBannedState = isUnban ? false : true;
    const nextMessage = isUnban
      ? 'Your appeal was reviewed and your account has been unbanned.'
      : 'Your appeal was reviewed and your account remains banned.';

    await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          banned: nextBannedState,
          notifications: [...(user.notifications || []), { message: nextMessage }],
        },
      },
      { new: true, runValidators: false }
    );

    await createUserNotification(
      user._id,
      isUnban ? 'account_unbanned' : 'account_banned',
      nextMessage
    );

    await Appeal.findByIdAndDelete(id);

    res.json({
      message: isUnban ? 'Appeal resolved and account unbanned' : 'Appeal resolved and account remains banned',
      removed: true,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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
  listPendingProperties,
  approveProperty,
  rejectProperty,
  deleteReview,
  editReview,
  listAppeals,
  resolveAppeal,
};
