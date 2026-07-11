const Appeal = require('../models/Appeal');

const createAppeal = async (req, res) => {
  try {
    // require a user attached by optionalAuth; if not present, reject
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.user._id;
    const { message } = req.body || {};

    if (req.user.banned) {
      return res.status(403).json({ message: 'Permanent bans cannot be appealed.' });
    }

    if (!req.user.suspended) {
      return res.status(400).json({ message: 'No suspended account to appeal.' });
    }

    const appealType = 'unsuspend';
    const existingAppeal = await Appeal.findOne({ user: userId, type: appealType });
    if (existingAppeal) {
      return res.status(409).json({
        message: 'An appeal is already pending for your account. Please wait for review.',
        appeal: existingAppeal,
      });
    }

    const appeal = await Appeal.create({
      user: userId,
      type: appealType,
      message: message || 'No message provided',
    });
    // In a real app you might notify super-admins here
    res.status(201).json({ message: 'Appeal submitted', appeal });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMyAppeals = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const appeals = await Appeal.find({ user: req.user._id, type: 'unsuspend' }).sort({ createdAt: -1 });
    res.json(appeals);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createAppeal, getMyAppeals };
