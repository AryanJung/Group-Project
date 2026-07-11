const express = require('express');
const Router = express.Router();
const attachUserIfPresent = require('../middlewares/optionalAuthMiddleware');
const { createAppeal, getMyAppeals } = require('../controllers/appealController');

// Use attachUserIfPresent so suspended users with a valid token can submit appeals
Router.post('/appeals', attachUserIfPresent, createAppeal);
Router.get('/appeals/me', attachUserIfPresent, getMyAppeals);

module.exports = Router;
