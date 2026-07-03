const express = require('express');
const Router = express.Router();
const { submitKyc, getUserKyc } = require('../controllers/kycController');

Router.post('/submit', submitKyc);
Router.get('/user/:id', getUserKyc);

module.exports = Router;
