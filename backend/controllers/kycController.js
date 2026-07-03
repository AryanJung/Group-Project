const Kyc = require('../models/Kyc');
const User = require('../models/User');

const submitKyc = async (req, res) => {
  try {
    const { user, role, data } = req.body;
    if (!user) return res.status(400).json({ message: 'Missing user id' });

    // Optional: ensure user exists
    const found = await User.findById(user);
    if (!found) return res.status(404).json({ message: 'User not found' });

    const kyc = await Kyc.create({ user, role: role || 'user', data: data || {} });
    return res.status(201).json(kyc);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getUserKyc = async (req, res) => {
  try {
    const userId = req.params.id;
    const kycs = await Kyc.find({ user: userId }).sort({ createdAt: -1 });
    res.json(kycs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { submitKyc, getUserKyc };
