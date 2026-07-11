const express = require('express');
const Router = express.Router();
const { submitKyc, getUserKyc } = require('../controllers/kycController');
const { protect } = require('../middlewares/authMiddleware');
const { uploadKycDocument } = require('../config/cloudinary');

const handleKycUpload = (req, res, next) => {
  uploadKycDocument.single('document')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Invalid document upload.' });
    }
    return next();
  });
};

Router.post('/submit', protect, handleKycUpload, submitKyc);
Router.get('/user/:id', protect, getUserKyc);

module.exports = Router;
