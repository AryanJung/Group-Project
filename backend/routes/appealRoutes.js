const express = require('express');
const Router = express.Router();
const attachUserIfPresent = require('../middlewares/optionalAuthMiddleware');
const { createAppeal } = require('../controllers/appealController');

// Use attachUserIfPresent so banned users with a valid token can still submit appeals
Router.post('/appeals', attachUserIfPresent, createAppeal);

module.exports = Router;
