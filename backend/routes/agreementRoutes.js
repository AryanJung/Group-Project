const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  createAgreement,
  createVersion,
  sendVersion,
  signVersionAsLandlord,
  requestChanges,
  acceptVersion,
  executeAgreement,
  getAgreement,
  getMyAgreements,
  getAgreementsByApplication,
  declineVersion,
} = require('../controllers/agreementController');

// Landlord creates agreement draft
router.post('/', protect, createAgreement);
// Landlord creates a new version for an agreement
router.post('/:id/versions', protect, createVersion);
// Landlord sends a specific version to tenant
router.post('/:id/versions/send', protect, sendVersion);
// Landlord signs a draft version before sending it to the tenant
router.post('/:id/versions/sign', protect, signVersionAsLandlord);
// Tenant requests changes
router.post('/:id/versions/request-changes', protect, requestChanges);
// Tenant accepts a version
router.post('/:id/versions/accept', protect, acceptVersion);
// Tenant declines an agreement
router.post('/:id/versions/decline', protect, declineVersion);
// Landlord executes the agreement (locks it)
router.post('/:id/execute', protect, executeAgreement);
// Get agreements for current user
router.get('/mine', protect, getMyAgreements);
// Get agreements by application
router.get('/applications/:id', protect, getAgreementsByApplication);
// Get agreement with versions and acceptances
router.get('/:id', protect, getAgreement);

module.exports = router;
