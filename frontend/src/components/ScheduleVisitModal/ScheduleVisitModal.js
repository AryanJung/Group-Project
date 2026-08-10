import React, { useState, useEffect } from 'react';
import './ScheduleVisitModal.css';

const ScheduleVisitModal = ({ open, onClose, property, applicationId, onSubmit }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setDate('');
      setTime('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!date || !time) {
      setError('Please select both date and time');
      return;
    }

    const proposedAt = new Date(date + 'T' + time);
    if (isNaN(proposedAt.getTime())) {
      setError('Invalid date/time');
      return;
    }
    if (proposedAt < new Date()) {
      setError('Cannot choose a past date/time');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ applicationId, proposedAt: proposedAt.toISOString() });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to request visit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay schedule-visit-overlay" onClick={onClose}>
      <div className="modal-content schedule-visit-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="schedule-visit-body">
          <h2>Schedule Property Visit</h2>
          <p className="muted">Property: <strong>{property?.title}</strong></p>
          <form onSubmit={handleSubmit} className="schedule-visit-form">
            <label>
              <span>Select Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </label>
            <label>
              <span>Select Time</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
            {error && <div className="modal-error">{error}</div>}
            <div className="modal-actions">
              <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Sending…' : 'Send Visit Request'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ScheduleVisitModal;
