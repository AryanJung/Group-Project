const express = require('express');
const Router = express.Router();

const {registerUser, loginUser} = require('../controllers/authController');

Router.post('/login', loginUser);
Router.post('/register', registerUser);

module.exports = Router;