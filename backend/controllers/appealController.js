const Appeal = require('../models/Appeal');

const createAppeal = async (req, res) => {
  try {
    // require a user attached by optionalAuth; if not present, reject
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const userId = req.user._id;
    const { message } = req.body || {};
    const appeal = await Appeal.create({ user: userId, message: message || 'No message provided' });
    // In a real app you might notify super-admins here
    res.status(201).json({ message: 'Appeal submitted', appeal });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createAppeal };
