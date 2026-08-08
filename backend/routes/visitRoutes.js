const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  requestVisit,
  confirmVisit,
  completeVisit,
  rejectVisit,
  getVisitsByApplication,
} = require('../controllers/visitController');

// Tenant requests a visit for a specific application
router.post('/applications/:id/request', protect, requestVisit);
// Landlord confirms a visit
router.patch('/confirm/:id', protect, confirmVisit);
// Landlord rejects a visit
router.patch('/reject/:id', protect, rejectVisit);
// Participant marks visit completed and records decision
router.patch('/:id/complete', protect, completeVisit);
// Get visits by application
router.get('/applications/:id', protect, getVisitsByApplication);

module.exports = router;
