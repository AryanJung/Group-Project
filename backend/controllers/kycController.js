const Kyc = require('../models/Kyc');
const User = require('../models/User');

const submitKyc = async (req, res) => {
  try {
    const { user, role, data } = req.body;
    const documentUrl = req.file?.path || req.body.documentUrl;

    if (!user) return res.status(400).json({ message: 'Missing user id' });
    if (!documentUrl) return res.status(400).json({ message: 'Please upload a valid identity document.' });

    const found = await User.findById(user);
    if (!found) return res.status(404).json({ message: 'User not found' });

    const kyc = await Kyc.create({
      user,
      role: role || 'user',
      data: data || {},
      documentUrl,
      documentName: req.file?.originalname || req.body.documentName || 'kyc-document',
    });

    return res.status(201).json(kyc);
  } catch (error) {
    if (error.message?.includes('Unsupported file type')) {
      return res.status(400).json({ message: error.message });
    }
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
