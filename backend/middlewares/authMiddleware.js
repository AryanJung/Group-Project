const jwt = require("jsonwebtoken");
const User = require("../models/User");
const expireSuspensionIfNeeded = require("./suspensionUtils");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");

      // Get user from the token and attach to req.user (excluding password)
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      // If the user's suspension has expired, clear it automatically.
      req.user = await expireSuspensionIfNeeded(req.user);

      const allowRestrictedAccess = req.path.startsWith('/notifications');

      // Ban handling: immediately block banned accounts except for notification routes
      if (req.user.banned && !allowRestrictedAccess) {
        return res.status(403).json({ message: 'Account banned', banned: true });
      }

      // Suspension handling: if suspendedUntil is set and in the future, block access except for notification routes
      if (req.user.suspendedUntil && new Date(req.user.suspendedUntil) > new Date() && !allowRestrictedAccess) {
        return res.status(403).json({
          message: 'Account suspended until ' + new Date(req.user.suspendedUntil).toISOString(),
          suspended: true,
          suspendedUntil: req.user.suspendedUntil,
          suspensionReason: req.user.suspensionReason || null,
        });
      }

      next();
    } catch (error) {
      console.error("Auth middleware error:", error.message);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

module.exports = { protect };