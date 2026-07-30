const express = require('express');
const Router = express.Router();

const {
  registerUser,
  verifyRegisterOtp,
  resendRegisterOtp,
  loginUser,
  getCurrentUser,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

Router.post('/login', loginUser);
Router.post('/register', registerUser);
Router.post('/verify-register-otp', verifyRegisterOtp);
Router.post('/resend-register-otp', resendRegisterOtp);

// Retain legacy routes as fallbacks in case old frontend clients call them
Router.post('/verify-otp', verifyRegisterOtp);
Router.post('/resend-otp', resendRegisterOtp);

Router.get('/me', protect, getCurrentUser);

module.exports = Router;
