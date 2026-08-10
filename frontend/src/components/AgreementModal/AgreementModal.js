import React, { useState, useEffect } from 'react';
import './AgreementModal.css';

const AgreementModal = ({ open, onClose, application, property, onCreated }) => {
  const [rent, setRent] = useState(property?.rawPrice || '');
  const [deposit, setDeposit] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [terms, setTerms] = useState('');
  const [sendAfterCreate, setSendAfterCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setRent(property?.rawPrice || '');
      setDeposit('');
      setStartDate('');
      setEndDate('');
      setTerms('');
      setError('');
    }
  }, [open, property]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!startDate || !endDate) {
      setError('Please select tenancy start and end dates');
      return;
    }
    setSubmitting(true);
    try {
      const content = `Rent: NPR ${rent}\nDeposit: NPR ${deposit}\nStart: ${startDate}\nEnd: ${endDate}\n\nTerms:\n${terms}`;
      const payload = {
        applicationId: application._id,
        effectiveDate: startDate,
        expiryDate: endDate,
        content,
        summary: 'Initial draft',
      };
      // use agreementAPI from window to avoid circular import
      const result = await window.agreementAPI.create(payload);
      // optionally send immediately
      if (sendAfterCreate && result?.agreement) {
        try {
          await window.agreementAPI.sendVersion(result.agreement._id, 1);
        } catch (se) {
          console.error('Failed to auto-send version after create', se);
        }
      }
      if (onCreated) onCreated(result);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create agreement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay agreement-modal-overlay" onClick={onClose}>
      <div className="modal-content agreement-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="agreement-body">
          <h2>Create Rental Agreement</h2>
          <p className="muted">Property: <strong>{property?.title}</strong></p>
          <p className="muted">Tenant: <strong>{application?.applicant?.name}</strong></p>
          <form onSubmit={handleSubmit} className="agreement-form">
            <label>
              <span>Monthly Rent (NPR)</span>
              <input type="number" value={rent} onChange={(e) => setRent(e.target.value)} required />
            </label>
            <label>
              <span>Security Deposit (NPR)</span>
              <input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
            </label>
            <label>
              <span>Start Date</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </label>
            <label>
              <span>End Date</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </label>
            <label>
              <span>Additional Terms</span>
              <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows="6" />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={sendAfterCreate} onChange={(e) => setSendAfterCreate(e.target.checked)} />
              <span style={{ fontSize: '0.9rem', color: '#374151' }}>Send to tenant after creating</span>
            </label>
            {error && <div className="modal-error">{error}</div>}
            <div className="modal-actions">
              <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create Draft'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AgreementModal;
