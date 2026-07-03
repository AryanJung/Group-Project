import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { kycAPI } from '../../services/api';
import './KycSubmit.css';

const KycSubmit = () => {
  const { user, isAuthenticated } = useAuth();
  // not using navigate here

  const [role, setRole] = useState('user');
  const [details, setDetails] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myKycs, setMyKycs] = useState([]);

  const { register } = useAuth();

  useEffect(() => {
    // default role based on user
    if (user?.role === 'owner' || user?.role === 'admin') setRole('owner');
    // load user's kyc entries
    const loadMy = async () => {
      if (user?._id) {
        try {
          const res = await kycAPI.getByUser(user._id);
          setMyKycs(res || []);
        } catch (err) {
          console.error('Failed to load user KYC', err);
        }
      }
    };
    loadMy();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please register or login first using the form below.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        user: user._id,
        role,
        data: { details, docUrl }
      };
      await kycAPI.submit(payload);
      // refresh user's KYC list
      const res = await kycAPI.getByUser(user._id);
      setMyKycs(res || []);
      alert('KYC submitted successfully. It will appear in pending list for review.');
      setDetails('');
      setDocUrl('');
    } catch (err) {
      alert('Failed to submit KYC: ' + (err?.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Inline register for users who reach this page unauthenticated
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const handleRegisterInline = async () => {
    if (!regName || !regEmail || !regPassword) {
      alert('Please fill name, email and password to register');
      return;
    }
    setRegLoading(true);
    try {
      const res = await register({ name: regName, email: regEmail, password: regPassword, role: 'renter' });
      if (res.success) {
        alert('Registered and logged in');
        // refresh user's KYC list (will be empty)
        const r = await kycAPI.getByUser(JSON.parse(localStorage.getItem('user'))._id);
        setMyKycs(r || []);
      } else {
        alert('Register failed: ' + (res.error || 'unknown'));
      }
    } catch (err) {
      alert('Register error: ' + (err?.message || err));
    } finally {
      setRegLoading(false);
    }
  };

  const hasApproved = myKycs.some(k => k.status === 'approved');

  if (user?.role === 'admin') {
    return (
      <div className="kyc-page">
        <h1>KYC Submission</h1>
        <div className="kyc-admin-notice">Administrators do not need to submit KYC.</div>
      </div>
    );
  }

  return (
    <div className="kyc-page">
      <h1>KYC Submission</h1>
      <p>Submit identity documents or supporting info for verification.</p>

      <div className="kyc-card-wrapper">
        {!isAuthenticated && (
          <div className="kyc-register">
            <h3>Create an account to submit KYC</h3>
            <div>
              <input placeholder="Full name" value={regName} onChange={(e) => setRegName(e.target.value)} />
              <input placeholder="Email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
              <input placeholder="Password" type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
              <button onClick={handleRegisterInline} disabled={regLoading}>
                {regLoading ? 'Creating…' : 'Register'}
              </button>
            </div>
            <p>After registering you'll be logged in and can submit KYC below.</p>
          </div>
        )}

        {!hasApproved && (
          <form className="kyc-form" onSubmit={handleSubmit}>
            <label>
              Account Type
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="user">User</option>
                <option value="owner">Owner</option>
              </select>
            </label>

            <label>
              Details
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Add identifying details, name on ID, etc."
                required
              />
            </label>

            <label>
              Document URL <span style={{ fontWeight: 400, color: '#6b7280' }}>(optional)</span>
              <input
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="Paste URL to scanned ID or cloud storage"
              />
            </label>

            <button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit KYC'}
            </button>
          </form>
        )}

        {hasApproved && (
          <div className="kyc-verified">
            Your identity has already been verified.
          </div>
        )}

        <div className="kyc-history">
          <h3>Your KYC Submissions</h3>
          {myKycs.length === 0
            ? <p className="empty">No submissions yet.</p>
            : (
              <ul>
                {myKycs.map(k => (
                  <li key={k._id}>
                    <strong>{k.role}</strong>
                    <span className={`kyc-status ${k.status}`}>{k.status}</span>
                    {' '}— submitted {new Date(k.createdAt).toLocaleString()}
                    {k.message && <div className="kyc-msg">Message: {k.message}</div>}
                  </li>
                ))}
              </ul>
            )
          }
        </div>
      </div>
    </div>
  );
};

export default KycSubmit;