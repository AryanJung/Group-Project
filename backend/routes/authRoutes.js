const express = require('express');
const Router = express.Router();

const { registerUser, loginUser, getCurrentUser } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

Router.post('/login', loginUser);
Router.post('/register', registerUser);
Router.get('/me', protect, getCurrentUser);

module.exports = Router;