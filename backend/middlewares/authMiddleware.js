const jwt = require("jsonwebtoken");
const User = require("../models/User");

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

      // Ban handling: immediately block banned accounts
      if (req.user.banned) {
        return res.status(403).json({ message: 'Account banned', banned: true });
      }

      // Suspension handling: if suspendedUntil is set and in the future, block access
      if (req.user.suspendedUntil && new Date(req.user.suspendedUntil) > new Date()) {
        return res.status(403).json({ message: 'Account suspended until ' + new Date(req.user.suspendedUntil).toISOString(), suspended: true, suspendedUntil: req.user.suspendedUntil });
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