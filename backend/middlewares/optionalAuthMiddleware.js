const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Attach user if Authorization header present. Do NOT block banned/suspended users.
const attachUserIfPresent = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
      }
    }
  } catch (err) {
    // ignore token errors – treat as anonymous
    console.error('optionalAuthMiddleware token error:', err.message);
  }
  return next();
};

module.exports = attachUserIfPresent;
