const Notification = require('../models/Notification');
const User = require('../models/User');

const expireSuspensionIfNeeded = async (user) => {
  if (!user || !user.suspended || !user.suspendedUntil) return user;

  const now = new Date();
  const until = new Date(user.suspendedUntil);
  if (until > now) return user;

  const updatedUser = await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        suspended: false,
        suspendedUntil: null,
        suspensionStart: null,
        suspensionReason: null,
      },
    },
    { new: true, runValidators: false }
  );

  try {
    await Notification.create({
      recipient: user._id,
      type: 'account_unsuspended',
      message: 'Your suspension has expired. Your account has been restored.',
    });
  } catch (error) {
    console.error('Failed to create auto-unsuspend notification:', error.message);
  }

  return updatedUser || {
    ...user,
    suspended: false,
    suspendedUntil: null,
    suspensionStart: null,
    suspensionReason: null,
  };
};

module.exports = expireSuspensionIfNeeded;
