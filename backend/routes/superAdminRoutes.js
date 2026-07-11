const express = require('express');
const Router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const checkSuperAdminKey = require('../middlewares/superAdminMiddleware');

// Public access check - pass key as ?key=...
Router.get('/access', superAdminController.access);

// Protect all following routes with the super-admin key
Router.use(checkSuperAdminKey);

// KYC management
Router.get('/kyc', superAdminController.listPendingKyc);
Router.post('/kyc/:id/approve', superAdminController.approveKyc);
Router.post('/kyc/:id/reject', superAdminController.rejectKyc);

// User management
Router.get('/users', superAdminController.searchUsers);
Router.patch('/users/:id/suspend', superAdminController.suspendUser);
Router.patch('/users/:id/ban', superAdminController.banUser);

// Review moderation
Router.get('/reviews', superAdminController.listFlaggedReviews);
Router.post('/reviews/:id/delete', superAdminController.deleteReview);
Router.post('/reviews/:id/publish', superAdminController.editReview);

// Property approval workflow
Router.get('/properties', superAdminController.listPendingProperties);
Router.post('/properties/:id/approve', superAdminController.approveProperty);
Router.post('/properties/:id/reject', superAdminController.rejectProperty);

// Appeals moderation
Router.get('/appeals', superAdminController.listAppeals);
Router.post('/appeals/:id/resolve', superAdminController.resolveAppeal);

module.exports = Router;
