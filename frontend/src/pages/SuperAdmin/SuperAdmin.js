import React, { useState, useEffect } from 'react';
import './SuperAdmin.css';
import { superAdminAPI } from '../../services/api';

const SuperAdmin = () => {
  const [key, setKey] = useState(process.env.REACT_APP_SUPER_ADMIN_KEY || '');
  const [accessOk, setAccessOk] = useState(false);

  // Tabs: kyc, users, reviews
  const [tab, setTab] = useState('kyc');

  // KYC
  const [kycs, setKycs] = useState([]);

  // Users
  const [users, setUsers] = useState([]);
  const [searchQ, setSearchQ] = useState('');

  // Reviews
  const [reviews, setReviews] = useState([]);

  const checkAccess = async () => {
    try {
      const res = await superAdminAPI.access(key);
      setAccessOk(!!res.access);
      return res;
    } catch (err) {
      setAccessOk(false);
      alert('Access denied: ' + (err?.response?.data?.message || err.message));
    }
  };

  const loadKyc = async () => {
    try {
      const res = await superAdminAPI.listKyc(key);
      setKycs(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadReviews = async () => {
    try {
      const res = await superAdminAPI.listReviews(key);
      setReviews(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveKyc = async (id) => {
    if (!window.confirm('Approve this KYC?')) return;
    try {
      await superAdminAPI.approveKyc(id, key);
      await loadKyc();
      alert('KYC approved');
    } catch (err) {
      console.error('approve error', err);
      alert('Failed to approve KYC: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleRejectKyc = async (id) => {
    const message = prompt('Rejection message (optional)');
    try {
      await superAdminAPI.rejectKyc(id, key, { message });
      await loadKyc();
      alert('KYC rejected');
    } catch (err) {
      console.error('reject error', err);
      alert('Failed to reject KYC: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleSearchUsers = async () => {
    try {
      const res = await superAdminAPI.searchUsers(searchQ, key);
      setUsers(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSuspend = async (id, current) => {
    try {
      await superAdminAPI.suspendUser(id, !current, key);
      await handleSearchUsers();
    } catch (err) {
      console.error('suspend error', err);
      alert('Failed to update suspend status: ' + (err?.response?.data?.message || err.message));
    }
  };

  const toggleBan = async (id, current) => {
    try {
      await superAdminAPI.banUser(id, !current, key);
      await handleSearchUsers();
    } catch (err) {
      console.error('ban error', err);
      alert('Failed to update ban status: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await superAdminAPI.deleteReview(id, key);
      await loadReviews();
      alert('Review deleted');
    } catch (err) {
      console.error('delete review error', err);
      alert('Failed to delete review: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleEditReview = async (id, currentContent) => {
    const newContent = prompt('Edit review content', currentContent);
    if (newContent == null) return;
    try {
      await superAdminAPI.editReview(id, newContent, key);
      await loadReviews();
      alert('Review edited and published');
    } catch (err) {
      console.error('edit review error', err);
      alert('Failed to edit review: ' + (err?.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    if (accessOk) {
      if (tab === 'kyc') loadKyc();
      if (tab === 'reviews') loadReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessOk, tab]);

  return (
    <div className="superadmin-page">
      <div className="superadmin-header">
        <h1>Super Admin Panel</h1>
        <div className="access-row">
          <input
            type="text"
            placeholder="Enter super admin key…"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <button onClick={checkAccess}>Enter</button>
          <span className="access-status">
            {accessOk ? '✓ Access granted' : 'No access'}
          </span>
        </div>
      </div>

      {accessOk && (
        <div className="superadmin-body">
          <nav className="superadmin-nav">
            <button className={tab === 'kyc' ? 'active' : ''} onClick={() => setTab('kyc')}>KYC</button>
            <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Users</button>
            <button className={tab === 'reviews' ? 'active' : ''} onClick={() => setTab('reviews')}>Reviews</button>
          </nav>

          <div className="superadmin-content">
            {tab === 'kyc' && (
              <div>
                <h2>Pending KYC</h2>
                {kycs.length === 0 && <p>No pending KYC submissions.</p>}
                <ul className="kyc-list">
                  {kycs.map(k => (
                    <li key={k._id} className="kyc-item">
                      <div>
                        <strong>{k.user?.name} ({k.user?.email})</strong>
                        <div>Role: {k.role}</div>
                        <div>Submitted: {new Date(k.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="kyc-actions">
                        <button onClick={() => handleApproveKyc(k._id)}>Approve</button>
                        <button onClick={() => handleRejectKyc(k._id)}>Reject</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tab === 'users' && (
              <div>
                <h2>User Management</h2>
                <div className="search-row">
                  <input
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Search users by name or email"
                  />
                  <button onClick={handleSearchUsers}>Search</button>
                </div>
                <ul className="user-list">
                  {users.map(u => (
                    <li key={u._id} className="user-item">
                      <div>
                        <strong>{u.name} ({u.email})</strong>
                        <div>Role: {u.role}</div>
                        <div>
                          Suspended:&nbsp;
                          <span className={`badge ${u.suspended ? 'badge-yes' : 'badge-no'}`}>
                            {u.suspended ? 'Yes' : 'No'}
                          </span>
                          &nbsp;|&nbsp;Banned:&nbsp;
                          <span className={`badge ${u.banned ? 'badge-yes' : 'badge-no'}`}>
                            {u.banned ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                      <div className="user-actions">
                        <button onClick={() => toggleSuspend(u._id, u.suspended)}>
                          {u.suspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                        <button onClick={() => toggleBan(u._id, u.banned)}>
                          {u.banned ? 'Unban' : 'Ban'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tab === 'reviews' && (
              <div>
                <h2>Flagged Reviews</h2>
                {reviews.length === 0 && <p>No flagged reviews.</p>}
                <ul className="review-list">
                  {reviews.map(r => (
                    <li key={r._id} className="review-item">
                      <div>
                        <strong>{r.user?.name} ({r.user?.email})</strong>
                        <p>{r.censoredReview}</p>
                        <div>
                          Flagged:{' '}
                          {r.aiAnalysis?.isToxicContext
                            ? 'Toxic context detected'
                            : 'Low confidence AI result'}
                        </div>
                      </div>
                      <div className="review-actions">
                        <button onClick={() => handleEditReview(r._id, r.content)}>Edit & Publish</button>
                        <button onClick={() => handleDeleteReview(r._id)}>Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;