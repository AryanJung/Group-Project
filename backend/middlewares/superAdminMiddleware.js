const checkSuperAdminKey = (req, res, next) => {
  const key = req.query.key || req.headers['x-super-key'];
  if (!key) {
    return res.status(401).json({ message: 'Missing super-admin key' });
  }
  if (key !== process.env.SUPER_ADMIN_KEY) {
    return res.status(403).json({ message: 'Forbidden: invalid super-admin key' });
  }
  // optionally set a flag for handlers
  req.isSuperAdmin = true;
  next();
};

module.exports = checkSuperAdminKey;
