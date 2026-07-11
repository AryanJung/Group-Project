import React, { useState, useEffect } from 'react';
import './SuperAdmin.css';
import { superAdminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SuperAdmin = () => {
  const { refreshUser } = useAuth();
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

  // Appeals
  const [appeals, setAppeals] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);

  // Properties pending approval
  const [pendingProperties, setPendingProperties] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [suspendModalUser, setSuspendModalUser] = useState(null);
  const [suspendDuration, setSuspendDuration] = useState(24);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspending, setSuspending] = useState(false);

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
      console.error('loadReviews error:', err);
      alert('Failed to load reviews: ' + (err?.response?.data?.message || err.message));
    }
  };

  const loadAppeals = async () => {
    try {
      const res = await superAdminAPI.listAppeals(key);
      setAppeals(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadPendingProperties = async () => {
    try {
      const res = await superAdminAPI.listPendingProperties(key);
      setPendingProperties(res || []);
    } catch (err) {
      console.error('loadPendingProperties error', err);
    }
  };

  const handleApproveKyc = async (id) => {
    if (!window.confirm('Approve this KYC?')) return;
    try {
      await superAdminAPI.approveKyc(id, key);
      await loadKyc();
      await refreshUser();
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
      await refreshUser();
      alert('KYC rejected');
    } catch (err) {
      console.error('reject error', err);
      alert('Failed to reject KYC: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleApproveProperty = async (id) => {
    if (!window.confirm('Approve this property for public listing?')) return;
    try {
      await superAdminAPI.approveProperty(id, key);
      await loadPendingProperties();
      alert('Property approved');
    } catch (err) {
      console.error('approve property error', err);
      alert('Failed to approve property: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleRejectProperty = async (id) => {
    const message = prompt('Rejection reason (optional)');
    if (message === null) return;
    try {
      await superAdminAPI.rejectProperty(id, key, { message });
      await loadPendingProperties();
      alert('Property rejected');
    } catch (err) {
      console.error('reject property error', err);
      alert('Failed to reject property: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleSearchUsers = async () => {
    try {
      const res = await superAdminAPI.searchUsers(searchQ, key);
      setUsers(res || []);
    } catch (err) {
      console.error('searchUsers error:', err);
      alert('Failed to search users: ' + (err?.response?.data?.message || err.message));
    }
  };

  const openSuspendDialog = (user) => {
    setSuspendModalUser(user);
    setSuspendDuration(24);
    setSuspensionReason('');
  };

  const closeSuspendDialog = () => {
    setSuspendModalUser(null);
    setSuspending(false);
  };

  const confirmSuspend = async () => {
    if (!suspendModalUser) return;
    if (!suspendDuration || Number(suspendDuration) <= 0) {
      alert('Please enter a valid suspension duration in hours.');
      return;
    }

    const payload = {
      suspended: true,
      durationHours: Number(suspendDuration),
      suspensionReason: suspensionReason?.trim() || '',
    };

    setSuspending(true);
    try {
      await superAdminAPI.suspendUser(suspendModalUser._id, payload, key);
      await handleSearchUsers();
      alert('User suspended');
      closeSuspendDialog();
    } catch (err) {
      console.error('suspend error', err);
      alert('Failed to suspend user: ' + (err?.response?.data?.message || err.message));
      setSuspending(false);
    }
  };

  const toggleSuspend = async (id, current) => {
    if (!current) {
      const userToSuspend = users.find((u) => u._id === id);
      openSuspendDialog(userToSuspend || { _id: id });
      return;
    }

    const nextSuspendedState = false;
    setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, suspended: nextSuspendedState } : u)));

    try {
      await superAdminAPI.suspendUser(id, { suspended: false }, key);
      await handleSearchUsers();
      alert('User unsuspended');
    } catch (err) {
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, suspended: current } : u)));
      console.error('unsuspend error', err);
      alert('Failed to unsuspend user: ' + (err?.response?.data?.message || err.message));
    }
  };

  const toggleBan = async (id, current) => {
    const nextValue = !current;
    setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, banned: nextValue } : u)));

    try {
      await superAdminAPI.banUser(id, nextValue, key);
      await handleSearchUsers();
    } catch (err) {
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, banned: current } : u)));
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

  const handlePublishReview = async (id, currentContent) => {
    const newContent = prompt('Publish review content', currentContent || '');
    if (newContent == null) return;
    try {
      await superAdminAPI.publishReview(id, newContent, key);
      await loadReviews();
      alert('Review published');
    } catch (err) {
      console.error('publish review error', err);
      alert('Failed to publish review: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleResolveAppeal = async (id, action, label) => {
    if (!window.confirm(label)) return;
    try {
      await superAdminAPI.resolveAppeal(id, action, key);
      setAppeals((prev) => prev.filter((appeal) => appeal._id !== id));
      alert(`Appeal resolved: ${label}`);
    } catch (err) {
      console.error('resolve appeal error', err);
      alert('Failed to resolve appeal: ' + (err?.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    if (accessOk) {
      if (tab === 'kyc') loadKyc();
      if (tab === 'reviews') loadReviews();
      if (tab === 'appeals') loadAppeals();
      if (tab === 'properties') loadPendingProperties();
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
            <button className={tab === 'properties' ? 'active' : ''} onClick={() => setTab('properties')}>Properties</button>
            <button className={tab === 'appeals' ? 'active' : ''} onClick={() => setTab('appeals')}>Appeals</button>
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
                        {k.documentUrl && (
                          <div className="kyc-document-preview">
                            <button type="button" className="kyc-document-link" onClick={() => setSelectedDocument(k.documentUrl)}>
                              Preview document
                            </button>
                          </div>
                        )}
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
                        <button onClick={() => handlePublishReview(r._id, r.censoredReview || r.originalReview)}>Publish</button>
                        <button onClick={() => handleDeleteReview(r._id)}>Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tab === 'properties' && (
              <div>
                <h2>Pending Properties</h2>
                {pendingProperties.length === 0 && <p>No pending properties.</p>}
                <ul className="kyc-list">
                  {pendingProperties.map((property) => (
                    <li key={property._id} className="kyc-item">
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          <strong>{property.title}</strong>
                          <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem' }}>Pending Approval</span>
                        </div>
                        <div style={{ marginTop: '0.5rem', color: '#475569' }}>
                          <div><strong>Owner:</strong> {property.createdBy?.name || 'Unknown'} ({property.createdBy?.email || 'No email'})</div>
                          <div><strong>Location:</strong> {property.location}</div>
                          <div><strong>Price:</strong> {property.price}</div>
                          <div style={{ marginTop: '0.75rem' }}>{property.description}</div>
                        </div>

                        {((property.images && property.images.length > 0) || property.image) && (
                          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                            {((property.images && property.images.length > 0) ? property.images : [property.image]).map((src) => (
                              <button
                                key={src}
                                type="button"
                                onClick={() => setSelectedImage(src)}
                                style={{
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  width: '96px',
                                  height: '72px',
                                  padding: 0,
                                  cursor: 'pointer',
                                  background: 'white',
                                }}
                              >
                                <img src={src} alt={property.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="kyc-actions" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button onClick={() => handleApproveProperty(property._id)}>Approve</button>
                        <button onClick={() => handleRejectProperty(property._id)}>Reject</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tab === 'appeals' && (
              <div>
                <h2>Suspension Appeals</h2>
                {appeals.filter(a => a.type === 'unsuspend').length === 0 && <p>No suspension appeals to review.</p>}
                <ul className="review-list">
                  {appeals.filter(a => a.type === 'unsuspend').map((appeal) => (
                    <li key={appeal._id} className="review-item">
                      <div>
                        <strong>{appeal.user?.name || 'Unknown user'} ({appeal.user?.email || 'No email'})</strong>
                        <p style={{ margin: '0.75rem 0 0.5rem' }}>{appeal.message || 'No message provided.'}</p>
                        <div>Submitted: {new Date(appeal.createdAt).toLocaleString()}</div>
                        {appeal.user?.suspendedUntil && (
                          <div>Suspension expires: {new Date(appeal.user.suspendedUntil).toLocaleString()}</div>
                        )}
                        {appeal.user?.suspensionReason && (
                          <div>Suspension reason: {appeal.user.suspensionReason}</div>
                        )}
                      </div>
                      <div className="review-actions">
                        <button onClick={() => handleResolveAppeal(appeal._id, 'approve', 'Unsuspend this user?')}>
                          Unsuspend
                        </button>
                        <button onClick={() => handleResolveAppeal(appeal._id, 'reject', 'Keep the account suspended?')}>
                          Keep Suspended
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedDocument && (
        <div className="document-modal-overlay" onClick={() => setSelectedDocument(null)}>
          <div className="document-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="document-modal-close" onClick={() => setSelectedDocument(null)} aria-label="Close preview">
              ×
            </button>
            {selectedDocument.match(/\.(jpg|jpeg|png)$/i) ? (
              <img src={selectedDocument} alt="KYC document preview" className="document-modal-image" />
            ) : selectedDocument.match(/\.pdf$/i) ? (
              <iframe title="KYC document preview" src={selectedDocument} className="document-modal-frame" />
            ) : (
              <a href={selectedDocument} target="_blank" rel="noreferrer" className="document-modal-link">Open document</a>
            )}
          </div>
        </div>
      )}
 
      {suspendModalUser && (
        <div className="suspend-modal-overlay" onClick={closeSuspendDialog}>
          <div className="suspend-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="document-modal-close" onClick={closeSuspendDialog} aria-label="Close suspend dialog">
              ×
            </button>
            <div className="suspend-modal-content">
              <h2>Suspend User</h2>
              <p>Choose a suspension duration and optional reason.</p>
              <label>
                Duration (hours)
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={suspendDuration}
                  onChange={(e) => setSuspendDuration(e.target.value)}
                />
              </label>
              <label>
                Reason (optional)
                <textarea
                  rows="4"
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="Suspension reason"
                />
              </label>
              <div className="suspend-actions">
                <button type="button" onClick={closeSuspendDialog} className="cancel-button">
                  Cancel
                </button>
                <button type="button" onClick={confirmSuspend} disabled={suspending} className="confirm-button">
                  {suspending ? 'Suspending...' : 'Suspend'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
 
      {selectedImage && (
        <div className="document-modal-overlay" onClick={() => setSelectedImage(null)}>
          <div className="document-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="document-modal-close" onClick={() => setSelectedImage(null)} aria-label="Close image preview">
              ×
            </button>
            <img src={selectedImage} alt="Property preview" className="document-modal-image" />
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;