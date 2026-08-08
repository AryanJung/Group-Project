const Visit = require('../models/Visit');
const RentApplication = require('../models/RentApplication');
const Room = require('../models/Room');
const Notification = require('../models/Notification');

// Tenant requests a visit for their application
const requestVisit = async (req, res) => {
  try {
    const application = await RentApplication.findById(req.params.id).populate('room');
    if (!application) return res.status(404).json({ message: 'Application not found' });

    if (application.applicant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the applicant can request a visit' });
    }

    if (application.status !== 'selected' && application.status !== 'pending') {
      return res.status(400).json({ message: `Cannot request a visit in state ${application.status}` });
    }

    const { proposedAt, notes } = req.body;
    const visit = await Visit.create({
      application: application._id,
      room: application.room._id,
      tenant: application.applicant,
      landlord: application.owner,
      proposedAt: proposedAt ? new Date(proposedAt) : undefined,
      notes,
      status: 'requested',
    });

    // update application status to reflect visit requested
    application.status = 'visit_requested';
    await application.save();

    // Notify landlord
    await Notification.create({
      recipient: application.owner,
      type: 'visit_requested',
      application: application._id,
      room: application.room._id,
      fromUser: req.user._id,
      message: `A visit has been requested for "${application.room.title}" by ${req.user.name}`,
    });

    return res.status(201).json(visit);
  } catch (error) {
    console.error('requestVisit error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Landlord confirms a visit
const confirmVisit = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id).populate('room application');
    if (!visit) return res.status(404).json({ message: 'Visit not found' });

    if (visit.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the landlord can confirm a visit' });
    }

    const { confirmedAt } = req.body;
    visit.confirmedAt = confirmedAt ? new Date(confirmedAt) : new Date();
    visit.status = 'landlord_confirmed';
    await visit.save();

    // Update application status
    const application = await RentApplication.findById(visit.application);
    if (application) {
      application.status = 'visit_scheduled';
      await application.save();
    }

    // Notify tenant
    await Notification.create({
      recipient: visit.tenant,
      type: 'visit_confirmed',
      application: visit.application,
      room: visit.room,
      fromUser: req.user._id,
      message: `Your visit for "${visit.room.title}" has been confirmed by the landlord.`,
    });

    return res.status(200).json(visit);
  } catch (error) {
    console.error('confirmVisit error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Landlord or tenant marks visit completed and records decision
const completeVisit = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id).populate('room application');
    if (!visit) return res.status(404).json({ message: 'Visit not found' });

    const uid = req.user._id.toString();
    const { roleDecision } = req.body; // 'proceed' or 'decline'
    if (!['proceed', 'decline'].includes(roleDecision)) {
      return res.status(400).json({ message: 'Invalid decision' });
    }

    if (visit.tenant.toString() === uid) {
      visit.tenantDecision = roleDecision;
    } else if (visit.landlord.toString() === uid) {
      visit.landlordDecision = roleDecision;
    } else {
      return res.status(403).json({ message: 'Only visit participants can record decisions' });
    }

    // If both have set decisions, and both are 'proceed' -> set application status
    if (visit.tenantDecision === 'proceed' && visit.landlordDecision === 'proceed') {
      visit.status = 'completed';
      const application = await RentApplication.findById(visit.application);
      if (application) {
        application.status = 'both_agree_to_proceed';
        await application.save();
      }

      // Notify landlord and tenant both agree
      await Notification.create({
        recipient: visit.landlord,
        type: 'both_agree_to_proceed',
        application: visit.application,
        room: visit.room,
        fromUser: req.user._id,
        message: `Both parties have agreed to proceed for "${visit.room.title}". Landlord may create an agreement.`,
      });
      await Notification.create({
        recipient: visit.tenant,
        type: 'both_agree_to_proceed',
        application: visit.application,
        room: visit.room,
        fromUser: req.user._id,
        message: `Both parties have agreed to proceed for "${visit.room.title}". Landlord may create an agreement.`,
      });
    }
    // If landlord manually marks the visit as proceeded, allow completion without date/time checks
    else if (visit.landlordDecision === 'proceed' && visit.status !== 'completed') {
      visit.status = 'completed';
      const application = await RentApplication.findById(visit.application);
      if (application) {
        application.status = 'visit_completed';
        await application.save();
      }

      await Notification.create({
        recipient: visit.tenant,
        type: 'visit_completed',
        application: visit.application,
        room: visit.room,
        fromUser: req.user._id,
        message: `The landlord has marked the visit for "${visit.room.title}" as completed. You may proceed with the next steps.`,
      });
    }

    await visit.save();
    return res.status(200).json(visit);
  } catch (error) {
    console.error('completeVisit error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Landlord rejects a visit request
const rejectVisit = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id).populate('room application');
    if (!visit) return res.status(404).json({ message: 'Visit not found' });

    if (visit.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the landlord can reject a visit' });
    }

    visit.status = 'rejected';
    await visit.save();

    const application = await RentApplication.findById(visit.application);
    if (application) {
      application.status = 'selected';
      await application.save();
    }

    await Notification.create({
      recipient: visit.tenant,
      type: 'visit_rejected',
      application: visit.application,
      room: visit.room,
      fromUser: req.user._id,
      message: `Your visit request for "${visit.room.title}" was rejected by the landlord.`,
    });

    return res.status(200).json(visit);
  } catch (error) {
    console.error('rejectVisit error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Landlord or tenant can fetch visits related to an application
const getVisitsByApplication = async (req, res) => {
  try {
    const application = await RentApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });

    const uid = req.user._id.toString();
    if (application.owner.toString() !== uid && application.applicant.toString() !== uid) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const visits = await Visit.find({ application: application._id }).sort({ createdAt: -1 });
    return res.status(200).json(visits);
  } catch (error) {
    console.error('getVisitsByApplication error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  requestVisit,
  confirmVisit,
  completeVisit,
  rejectVisit,
  getVisitsByApplication,
};
