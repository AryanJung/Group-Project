const Agreement = require('../models/Agreement');
const AgreementVersion = require('../models/AgreementVersion');
const Acceptance = require('../models/Acceptance');
const AuditLog = require('../models/AuditLog');
const RentApplication = require('../models/RentApplication');
const Room = require('../models/Room');
const Notification = require('../models/Notification');
const Rental = require('../models/Rental');

// Simple agreement ID generator: RENT-YYYY-XXXXXX (random numeric tail)
const generateAgreementId = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `RENT-${year}-${random}`;
};

// Create a new agreement (landlord creates draft)
const createAgreement = async (req, res) => {
  try {
    const { applicationId, effectiveDate, expiryDate, content, summary } = req.body;

    const application = await RentApplication.findById(applicationId).populate('room applicant owner');
    if (!application) return res.status(404).json({ message: 'Application not found' });

    // Normalize owner id whether populated or not
    const ownerId = application.owner && application.owner._id ? application.owner._id.toString() : application.owner.toString();
    if (ownerId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the listing owner can create agreements for this application' });
    }

    if (
      application.status !== 'both_agree_to_proceed' &&
      application.status !== 'visit_completed' &&
      application.status !== 'selected'
    ) {
      return res.status(400).json({ message: `Cannot create agreement in application state ${application.status}` });
    }

    const agreementId = await generateAgreementId();

    const agreement = await Agreement.create({
      agreementId,
      room: application.room._id,
      landlord: application.owner,
      tenant: application.applicant,
      status: 'draft',
      effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      currentVersion: 0,
    });

    // create initial version
    const version = await AgreementVersion.create({
      agreement: agreement._id,
      versionNumber: 1,
      content: content || 'Draft agreement content',
      createdBy: req.user._id,
      changeSummary: summary || 'Initial draft',
      status: 'draft',
    });

    agreement.currentVersion = 1;
    agreement.status = 'draft';
    await agreement.save();

    await AuditLog.create({ actor: req.user._id, action: 'agreement_created', resourceType: 'Agreement', resourceId: agreement._id });

    // Notify tenant that an agreement draft exists (landlord created draft)
    await Notification.create({
      recipient: agreement.tenant,
      type: 'agreement_created',
      room: agreement.room,
      application: application._id,
      fromUser: req.user._id,
      message: `A rental agreement draft (${agreement.agreementId}) has been created for "${application.room.title}"`,
    });

    const populated = await Agreement.findById(agreement._id).populate('room landlord tenant');
    return res.status(201).json({ agreement: populated, version });
  } catch (error) {
    console.error('createAgreement error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create a new version (landlord)
const createVersion = async (req, res) => {
  try {
    const agreement = await Agreement.findById(req.params.id);
    if (!agreement) return res.status(404).json({ message: 'Agreement not found' });

    if (agreement.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only landlord can create new versions' });
    }

    if (agreement.status === 'executed' || agreement.status === 'locked') {
      return res.status(400).json({ message: 'Cannot create a new version of an executed/locked agreement' });
    }

    const { content, changeSummary } = req.body;
    const nextVersionNumber = agreement.currentVersion + 1;

    const version = await AgreementVersion.create({
      agreement: agreement._id,
      versionNumber: nextVersionNumber,
      content,
      createdBy: req.user._id,
      changeSummary,
      previousVersion: undefined,
      status: 'draft',
    });

    agreement.currentVersion = nextVersionNumber;
    agreement.status = 'draft';
    await agreement.save();

    await AuditLog.create({ actor: req.user._id, action: 'version_created', resourceType: 'Agreement', resourceId: agreement._id, metadata: { version: nextVersionNumber } });

    // Notify tenant that a new version is available
    await Notification.create({ recipient: agreement.tenant, type: 'version_created', application: undefined, room: agreement.room, fromUser: req.user._id, message: `A new version (${nextVersionNumber}) of agreement ${agreement.agreementId} is available.` });

    return res.status(201).json(version);
  } catch (error) {
    console.error('createVersion error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send a version to tenant (mark version.sent and agreement.sent)
const sendVersion = async (req, res) => {
  try {
    const agreement = await Agreement.findById(req.params.id);
    if (!agreement) return res.status(404).json({ message: 'Agreement not found' });

    if (agreement.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only landlord can send versions' });
    }

    const version = await AgreementVersion.findOne({ agreement: agreement._id, versionNumber: req.body.versionNumber });
    if (!version) return res.status(404).json({ message: 'Version not found' });

    if (version.status === 'executed' || version.status === 'locked') {
      return res.status(400).json({ message: 'Cannot send executed/locked version' });
    }

    version.status = 'sent';
    await version.save();

    agreement.status = 'sent';
    await agreement.save();

    await AuditLog.create({ actor: req.user._id, action: 'version_sent', resourceType: 'Agreement', resourceId: agreement._id, metadata: { version: version.versionNumber } });

    await Notification.create({ recipient: agreement.tenant, type: 'agreement_sent', application: undefined, room: agreement.room, fromUser: req.user._id, message: `Agreement ${agreement.agreementId} (v${version.versionNumber}) has been sent to you for review.` });

    return res.status(200).json({ agreement, version });
  } catch (error) {
    console.error('sendVersion error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Tenant requests changes on a version
const requestChanges = async (req, res) => {
  try {
    const agreement = await Agreement.findById(req.params.id);
    if (!agreement) return res.status(404).json({ message: 'Agreement not found' });

    if (agreement.tenant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only tenant can request changes' });
    }

    const { versionNumber, requestedChanges } = req.body;
    const version = await AgreementVersion.findOne({ agreement: agreement._id, versionNumber });
    if (!version) return res.status(404).json({ message: 'Version not found' });

    // Mark agreement as changes requested
    agreement.status = 'changes_requested';
    await agreement.save();

    await AuditLog.create({ actor: req.user._id, action: 'changes_requested', resourceType: 'Agreement', resourceId: agreement._id, metadata: { version: versionNumber, requestedChanges } });

    // Notify landlord
    await Notification.create({ recipient: agreement.landlord, type: 'changes_requested', application: undefined, room: agreement.room, fromUser: req.user._id, message: `Tenant requested changes on agreement ${agreement.agreementId} (v${versionNumber})` });

    return res.status(200).json({ message: 'Change request recorded' });
  } catch (error) {
    console.error('requestChanges error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Tenant accepts a version
const acceptVersion = async (req, res) => {
  try {
    const agreement = await Agreement.findById(req.params.id);
    if (!agreement) return res.status(404).json({ message: 'Agreement not found' });

    const version = await AgreementVersion.findOne({ agreement: agreement._id, versionNumber: req.body.versionNumber });
    if (!version) return res.status(404).json({ message: 'Version not found' });

    if (agreement.tenant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only tenant can accept a version' });
    }

    // Only allow accepting a version that has been sent to the tenant
    if (version.status !== 'sent') {
      return res.status(400).json({ message: 'Only a sent version can be accepted' });
    }

    // Record acceptance
    await Acceptance.findOneAndUpdate(
      { agreement: agreement._id, version: version._id, user: req.user._id },
      { agreement: agreement._id, version: version._id, user: req.user._id, authenticationMethod: 'electronic_acceptance', role: 'tenant', acceptedAt: new Date() },
      { upsert: true, new: true }
    );

    version.status = 'accepted';
    await version.save();

    agreement.status = 'final_pending';
    await agreement.save();

    await AuditLog.create({ actor: req.user._id, action: 'version_accepted_by_tenant', resourceType: 'Agreement', resourceId: agreement._id, metadata: { version: version.versionNumber } });

    // Notify landlord
    await Notification.create({ recipient: agreement.landlord, type: 'agreement_accepted', room: agreement.room, application: undefined, fromUser: req.user._id, message: `Tenant accepted agreement ${agreement.agreementId} (v${version.versionNumber})` });

    // Create Rental record so tenant immediately sees the property in My Rentals
    try {
      const existing = await Rental.findOne({ room: agreement.room, renter: agreement.tenant });
      if (!existing) {
        // try to attach an application if present
        const app = await RentApplication.findOne({ room: agreement.room, applicant: agreement.tenant, owner: agreement.landlord });
        await Rental.create({ room: agreement.room, renter: agreement.tenant, owner: agreement.landlord, application: app?._id });

        // update room.isRented based on active rentals
        const count = await Rental.countDocuments({ room: agreement.room });
        const roomDoc = await Room.findById(agreement.room);
        if (roomDoc) {
          roomDoc.isRented = count >= (roomDoc.maxRenters || 1);
          await roomDoc.save();
        }
      }
    } catch (rErr) {
      console.error('Failed to create Rental after acceptance:', rErr);
    }

    return res.status(200).json({ message: 'Version accepted' });
  } catch (error) {
    console.error('acceptVersion error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Landlord executes final agreement (after tenant accepted)
const executeAgreement = async (req, res) => {
  try {
    const agreement = await Agreement.findById(req.params.id);
    if (!agreement) return res.status(404).json({ message: 'Agreement not found' });

    if (agreement.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only landlord can execute the agreement' });
    }

    const versionNumber = req.body.versionNumber || agreement.currentVersion;
    const version = await AgreementVersion.findOne({ agreement: agreement._id, versionNumber });
    if (!version) return res.status(404).json({ message: 'Version not found' });

    // Check that tenant has accepted this version
    const tenantAcceptance = await Acceptance.findOne({ agreement: agreement._id, version: version._id, role: 'tenant' });
    if (!tenantAcceptance) {
      return res.status(400).json({ message: 'Tenant has not accepted this version yet' });
    }

    // Record landlord acceptance
    await Acceptance.findOneAndUpdate(
      { agreement: agreement._id, version: version._id, user: req.user._id },
      { agreement: agreement._id, version: version._id, user: req.user._id, authenticationMethod: 'account_auth', role: 'landlord', acceptedAt: new Date() },
      { upsert: true, new: true }
    );

    // Mark as executed and lock
    version.status = 'executed';
    await version.save();

    agreement.status = 'executed';
    await agreement.save();

    // Lock executed agreement
    version.status = 'locked';
    await version.save();

    agreement.status = 'locked';
    await agreement.save();

    await AuditLog.create({ actor: req.user._id, action: 'agreement_executed', resourceType: 'Agreement', resourceId: agreement._id, metadata: { version: version.versionNumber } });

    // Notify tenant
    await Notification.create({ recipient: agreement.tenant, type: 'agreement_executed', room: agreement.room, application: undefined, fromUser: req.user._id, message: `Agreement ${agreement.agreementId} has been executed and locked.` });

    // Ensure a Rental record exists (safeguard) so My Rentals is populated
    try {
      const existing = await Rental.findOne({ room: agreement.room, renter: agreement.tenant });
      if (!existing) {
        const app = await RentApplication.findOne({ room: agreement.room, applicant: agreement.tenant, owner: agreement.landlord });
        await Rental.create({ room: agreement.room, renter: agreement.tenant, owner: agreement.landlord, application: app?._id });

        const count = await Rental.countDocuments({ room: agreement.room });
        const roomDoc = await Room.findById(agreement.room);
        if (roomDoc) {
          roomDoc.isRented = count >= (roomDoc.maxRenters || 1);
          await roomDoc.save();
        }
      }
    } catch (rErr) {
      console.error('Failed to create Rental after execute:', rErr);
    }

    return res.status(200).json({ agreement, version });
  } catch (error) {
    console.error('executeAgreement error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get agreement and versions
const getAgreement = async (req, res) => {
  try {
    const agreement = await Agreement.findById(req.params.id).populate('room landlord tenant');
    if (!agreement) return res.status(404).json({ message: 'Agreement not found' });

    const uid = req.user._id.toString();
    const landlordId = agreement.landlord && agreement.landlord._id ? agreement.landlord._id.toString() : agreement.landlord.toString();
    const tenantId = agreement.tenant && agreement.tenant._id ? agreement.tenant._id.toString() : agreement.tenant.toString();
    if (landlordId !== uid && tenantId !== uid) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const versions = await AgreementVersion.find({ agreement: agreement._id }).sort({ versionNumber: 1 });
    const acceptances = await Acceptance.find({ agreement: agreement._id });

    return res.status(200).json({ agreement, versions, acceptances });
  } catch (error) {
    console.error('getAgreement error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get agreements for the current user (landlord or tenant)
const getMyAgreements = async (req, res) => {
  try {
    const uid = req.user._id;
    const agreements = await Agreement.find({ $or: [{ landlord: uid }, { tenant: uid }] }).populate('room landlord tenant').sort({ createdAt: -1 });
    return res.status(200).json(agreements);
  } catch (error) {
    console.error('getMyAgreements error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get agreements related to a RentApplication (by room + tenant + landlord)
const getAgreementsByApplication = async (req, res) => {
  try {
    const application = await RentApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });

    const uid = req.user._id.toString();
    // only allow owner or applicant to view agreements for this application
    if (application.owner.toString() !== uid && application.applicant.toString() !== uid) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const agreements = await Agreement.find({ room: application.room, tenant: application.applicant, landlord: application.owner }).populate('room landlord tenant').sort({ createdAt: -1 });
    return res.status(200).json(agreements);
  } catch (error) {
    console.error('getAgreementsByApplication error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Tenant declines a sent version / agreement
const declineVersion = async (req, res) => {
  try {
    const agreement = await Agreement.findById(req.params.id);
    if (!agreement) return res.status(404).json({ message: 'Agreement not found' });

    if (agreement.tenant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only tenant can decline the agreement' });
    }

    // mark as declined
    agreement.status = 'declined';
    await agreement.save();

    await AuditLog.create({ actor: req.user._id, action: 'agreement_declined', resourceType: 'Agreement', resourceId: agreement._id });

    await Notification.create({ recipient: agreement.landlord, type: 'agreement_declined', room: agreement.room, application: undefined, fromUser: req.user._id, message: `Tenant declined agreement ${agreement.agreementId}.` });

    return res.status(200).json({ message: 'Agreement declined' });
  } catch (error) {
    console.error('declineVersion error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createAgreement,
  createVersion,
  sendVersion,
  requestChanges,
  acceptVersion,
  executeAgreement,
  getAgreement,
  getMyAgreements,
  getAgreementsByApplication,
  declineVersion,
};
