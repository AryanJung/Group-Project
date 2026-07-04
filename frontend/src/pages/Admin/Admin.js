import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminAPI, rentalAPI, applicationAPI, groupChatAPI } from '../../services/api';
import MapPicker from './MapPicker';
import './Admin.css';

const Admin = () => {
  const { isAuthenticated, isOwner, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('profile');
  // applications tab state (opened via notification link)
  const [applicationsRoomId, setApplicationsRoomId] = useState(null);
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [groupChatCreating, setGroupChatCreating] = useState(false);
  const [groupChatName, setGroupChatName] = useState('');
  const [groupChatMsg, setGroupChatMsg] = useState('');

  // Owner's own listings
  const [myRooms, setMyRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState('');

  // Renter's active rentals
  const [myRentals, setMyRentals] = useState([]);
  const [rentalsLoading, setRentalsLoading] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const formRef = useRef(null);

  const emptyForm = {
    title: '',
    location: '',
    coordinates: null,
    price: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    image: '🏠',
    maxRenters: 1,
  };
  const [formData, setFormData] = useState(emptyForm);

  // Read URL query params on mount — notification deep-link support
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const room = params.get('room');
    if (tab) setActiveTab(tab);
    if (room) setApplicationsRoomId(room);
  }, [location.search]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  // Load owner listings when Houses tab is opened
  useEffect(() => {
    if (activeTab === 'houses' && isOwner) {
      setRoomsLoading(true);
      setRoomsError('');
      adminAPI
        .getMyRooms()
        .then((data) => setMyRooms(data))
        .catch(() => setRoomsError('Failed to load your listings.'))
        .finally(() => setRoomsLoading(false));
    }
  }, [activeTab, isOwner]);

  // Load applications when tab opens (or roomId changes)
  useEffect(() => {
    if (activeTab === 'applications' && isOwner) {
      setApplicationsLoading(true);
      const fetch = applicationsRoomId
        ? applicationAPI.getByRoom(applicationsRoomId)
        : applicationAPI.getAllForOwner();
      fetch
        .then((data) => setApplications(data))
        .catch(() => setApplications([]))
        .finally(() => setApplicationsLoading(false));
    }
  }, [activeTab, applicationsRoomId, isOwner]);

  // Load renter's rentals when My Rentals tab is opened
  useEffect(() => {
    if (activeTab === 'rentals') {
      setRentalsLoading(true);
      rentalAPI
        .getMyRentals()
        .then((data) => setMyRentals(data))
        .catch(() => setMyRentals([]))
        .finally(() => setRentalsLoading(false));
    }
  }, [activeTab]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingProperty(null);
    setShowAddForm(false);
  };

  const handleEdit = (property) => {
    setEditingProperty(property);
    setFormData({
      title: property.title || '',
      location: property.location || '',
      coordinates: property.coordinates || null,
      price: property.rawPrice || '',
      bedrooms: property.bedrooms || '',
      bathrooms: property.bathrooms || '',
      area: property.area || '',
      maxRenters: property.maxRenters ?? 1,
      image: property.image || '🏠',
    });
    setShowAddForm(true);
    setActiveTab('houses');
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this property? This will also remove all associated rentals and chat messages.')) return;
    try {
      await adminAPI.deleteProperty(id);
      setMyRooms((prev) => prev.filter((r) => String(r._id || r.id) !== String(id)));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete property');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.coordinates) {
      alert('Please select a precise location on the map first!');
      return;
    }

    setSubmitting(true);
    const payload = {
      ...formData,
      // Send the raw numeric price — api.js will strip formatting if needed
      price: formData.price,
      bedrooms: parseInt(formData.bedrooms, 10),
      bathrooms: parseInt(formData.bathrooms, 10),
    };

    try {
      if (editingProperty) {
        const updated = await adminAPI.updateProperty(editingProperty._id || editingProperty.id, payload);
        setMyRooms((prev) =>
          prev.map((r) => (String(r._id || r.id) === String(updated._id || updated.id) ? updated : r))
        );
      } else {
        const created = await adminAPI.createProperty(payload);
        setMyRooms((prev) => [created, ...prev]);
      }
      resetForm();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save property');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="admin-page">
      <div className="admin-dashboard-wrapper">

        {/* SIDEBAR */}
        <aside className="admin-sidebar">
          <div className="admin-user-nav-header">
            <div className="user-avatar">{user?.name?.charAt(0) || 'U'}</div>
            <h3>{user?.name || 'User'}</h3>
            <span className="role-tag" style={{ textTransform: 'capitalize' }}>{user?.role || 'renter'}</span>
          </div>

          <nav className="admin-nav-menu">
            <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>
              👤 My Profile
            </button>

            {isOwner && (
              <button className={activeTab === 'houses' ? 'active' : ''} onClick={() => setActiveTab('houses')}>
                🏠 Manage Houses
              </button>
            )}

            {isOwner && (
              <button className={activeTab === 'applications' ? 'active' : ''} onClick={() => setActiveTab('applications')}>
                📋 Applications
              </button>
            )}

            {!isOwner && (
              <button className={activeTab === 'rentals' ? 'active' : ''} onClick={() => setActiveTab('rentals')}>
                🔑 My Rentals
              </button>
            )}

            <button className={activeTab === 'chat' ? 'active' : ''} onClick={() => setActiveTab('chat')}>
              💬 Chat Messages
            </button>
          </nav>

          <button onClick={logout} className="btn-logout-sidebar">Logout</button>
        </aside>

        {/* MAIN */}
        <main className="admin-main-content">

          {/* ── PROFILE ── */}
          {activeTab === 'profile' && (
            <div className="admin-container">
              <div className="admin-header">
                <h1>My Account</h1>
                <p>Manage your personal information</p>
              </div>
              <div className="add-property-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name</label>
                    <div className="profile-static-value">{user?.name}</div>
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <div className="profile-static-value">{user?.email}</div>
                  </div>
                  <div className="form-group">
                    <label>Account Type</label>
                    <div className="profile-static-value" style={{ textTransform: 'capitalize' }}>
                      {user?.role}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── MANAGE HOUSES (owners only) ── */}
          {activeTab === 'houses' && isOwner && (
            <div className="admin-container">
              <div className="admin-header">
                <h1>Property Management</h1>
                {roomsError && <div className="error-banner">⚠️ {roomsError}</div>}
              </div>

              <div className="admin-actions">
                <button
                  className="btn-add-property"
                  onClick={() => {
                    if (showAddForm) resetForm();
                    else setShowAddForm(true);
                  }}
                >
                  {showAddForm ? 'Cancel' : '+ Add New Property'}
                </button>
              </div>

              {/* FORM */}
              {showAddForm && (
                <div className="add-property-form" ref={formRef}>
                  <h2>{editingProperty ? 'Edit Property' : 'Add New Property'}</h2>
                  <form onSubmit={handleSubmit}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Property Title</label>
                        <input
                          type="text" name="title" value={formData.title}
                          onChange={handleInputChange} required placeholder="Modern Apartment"
                        />
                      </div>

                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label>Property Precise Location</label>
                        <MapPicker
                          currentCoords={formData.coordinates}
                          setCoordinates={(coords) => setFormData((prev) => ({ ...prev, coordinates: coords }))}
                          setLocationName={(name) => setFormData((prev) => ({ ...prev, location: name }))}
                        />
                        {formData.location && (
                          <p className="selected-location">
                            <strong>Selected:</strong> {formData.location}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Monthly Rent (NPR)</label>
                        <input
                          type="number" name="price" value={formData.price}
                          onChange={handleInputChange} required placeholder="25000"
                        />
                      </div>
                      <div className="form-group">
                        <label>Area</label>
                        <input
                          type="text" name="area" value={formData.area}
                          onChange={handleInputChange} required placeholder="1200 sq ft"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Bedrooms</label>
                        <input type="number" name="bedrooms" value={formData.bedrooms} onChange={handleInputChange} required min="1" />
                      </div>
                      <div className="form-group">
                        <label>Bathrooms</label>
                        <input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleInputChange} required min="1" />
                      </div>
                      <div className="form-group">
                        <label>Max Renters</label>
                        <input
                          type="number" name="maxRenters"
                          value={formData.maxRenters} onChange={handleInputChange}
                          min="1" max="20" required
                          title="How many renters can rent this listing (e.g. 2 for a 2-room flat)"
                        />
                      </div>
                      <div className="form-group">
                        <label>Emoji Icon</label>
                        <input type="text" name="image" value={formData.image} onChange={handleInputChange} maxLength="2" />
                      </div>
                    </div>

                    <button type="submit" className="btn-submit-form" disabled={submitting}>
                      {submitting
                        ? editingProperty ? 'Updating…' : 'Adding…'
                        : editingProperty ? 'Update Property' : 'Add Property'}
                    </button>
                  </form>
                </div>
              )}

              {/* LISTINGS */}
              <div className="properties-list">
                <h2>Your Listings ({myRooms.length})</h2>
                {roomsLoading ? (
                  <p className="no-properties">Loading…</p>
                ) : myRooms.length === 0 ? (
                  <p className="no-properties">No listings yet. Add your first property above.</p>
                ) : (
                  <div className="admin-properties-grid">
                    {myRooms.map((property) => (
                      <div key={property._id || property.id} className="admin-property-card">
                        <div className="admin-property-image">
                          <span className="property-emoji">{property.image}</span>
                        </div>
                        <div className="admin-property-content">
                          <h3>{property.title}</h3>
                          <p className="property-location">📍 {property.location}</p>
                          <div className="property-details">
                            <span>🛏️ {property.bedrooms} Bed</span>
                            <span>🚿 {property.bathrooms} Bath</span>
                            <span>📐 {property.area}</span>
                          </div>
                          <div className="property-price">{property.price}</div>
                          {property.isRented && (
                            <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 600 }}>
                              🔑 Currently Rented
                            </span>
                          )}
                          <div className="property-actions">
                            <button
                              style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '0.45rem 0.85rem', borderRadius: '7px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                              onClick={() => {
                                setApplicationsRoomId(property._id || property.id);
                                setActiveTab('applications');
                              }}
                            >
                              📋 Applications
                            </button>
                            <button className="btn-edit" onClick={() => handleEdit(property)}>Edit</button>
                            <button className="btn-delete" onClick={() => handleDelete(property._id || property.id)}>Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── APPLICATIONS (owner only) ── */}
          {activeTab === 'applications' && isOwner && (
            <div className="admin-container">
              <div className="admin-header">
                <h1>📋 Rental Applications</h1>
                <p>
                  {applicationsRoomId
                    ? 'Applications for selected listing'
                    : 'All applications across your listings'}
                  {applicationsRoomId && (
                    <button
                      onClick={() => setApplicationsRoomId(null)}
                      style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: '#6366f1', background: 'none', border: '1px solid #6366f1', borderRadius: '99px', padding: '0.1rem 0.65rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      ✕ Clear filter
                    </button>
                  )}
                </p>
              </div>
              <div className="properties-list">
                {applicationsLoading ? (
                  <p className="no-properties">Loading…</p>
                ) : applications.length === 0 ? (
                  <p className="no-properties">
                    {applicationsRoomId
                      ? 'No applications for this listing yet.'
                      : 'No applications received yet. Share your listings to attract renters!'}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {applications.map((app) => (
                      <div key={app._id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div>
                          {/* Listing name — shown when viewing all */}
                          {app.room?.title && (
                            <div style={{ fontSize: '0.72rem', background: '#f0f9ff', color: '#0369a1', display: 'inline-block', padding: '0.1rem 0.55rem', borderRadius: '99px', fontWeight: 600, marginBottom: '0.4rem' }}>
                              🏠 {app.room.title}
                            </div>
                          )}
                          <div style={{ fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>
                            {app.applicant?.name || 'Unknown'}
                            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 400, marginLeft: '0.5rem' }}>{app.applicant?.email}</span>
                          </div>
                          {app.message && (
                            <p style={{ fontSize: '0.85rem', color: '#374151', fontStyle: 'italic', margin: '0.25rem 0' }}>"{app.message}"</p>
                          )}
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                            Applied {new Date(app.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                          {app.status === 'pending' ? (
                            <>
                              <button
                                style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
                                onClick={async () => {
                                  try {
                                    await applicationAPI.accept(app._id);
                                    setApplications((prev) =>
                                      prev.map((a) => a._id === app._id ? { ...a, status: 'accepted' } : a)
                                    );
                                  } catch (e) { alert(e.response?.data?.message || 'Failed to accept'); }
                                }}
                              >
                                ✓ Accept
                              </button>
                              <button
                                style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
                                onClick={async () => {
                                  try {
                                    await applicationAPI.reject(app._id);
                                    setApplications((prev) =>
                                      prev.map((a) => a._id === app._id ? { ...a, status: 'rejected' } : a)
                                    );
                                  } catch (e) { alert(e.response?.data?.message || 'Failed to reject'); }
                                }}
                              >
                                ✕ Reject
                              </button>
                            </>
                          ) : (
                            <span style={{
                              padding: '0.35rem 0.85rem', borderRadius: '99px', fontWeight: 700, fontSize: '0.75rem',
                              background: app.status === 'accepted' ? '#dcfce7' : '#fee2e2',
                              color: app.status === 'accepted' ? '#15803d' : '#b91c1c',
                              textTransform: 'capitalize',
                            }}>
                              {app.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Group Chat creation ──────────────────────────── */}
              {applicationsRoomId && (
                <div style={{ borderTop: '1px solid #e5e7eb', padding: '1.25rem', background: '#f9fafb' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', marginBottom: '0.75rem' }}>
                    💬 Create Group Chat for this listing
                  </p>
                  {groupChatMsg && (
                    <p style={{ fontSize: '0.82rem', color: groupChatMsg.startsWith('✅') ? '#15803d' : '#b91c1c', marginBottom: '0.5rem' }}>
                      {groupChatMsg}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="Chat name (e.g. Flat 3B Tenants)"
                      value={groupChatName}
                      onChange={(e) => setGroupChatName(e.target.value)}
                      style={{ flex: 1, minWidth: '180px', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.85rem' }}
                    />
                    <button
                      disabled={groupChatCreating || !groupChatName.trim()}
                      onClick={async () => {
                        setGroupChatCreating(true);
                        setGroupChatMsg('');
                        try {
                          // Create chat with all accepted renters added automatically
                          const acceptedRenterIds = applications
                            .filter((a) => a.status === 'accepted')
                            .map((a) => a.applicant?._id || a.applicant)
                            .filter(Boolean);

                          const newChat = await groupChatAPI.create(
                            groupChatName.trim(),
                            applicationsRoomId,
                            acceptedRenterIds
                          );
                          setGroupChatMsg(`✅ Chat created! Redirecting…`);
                          const roomId = newChat.room?._id || newChat.room;
                          setTimeout(() => navigate(`/chat/${roomId}`), 800);
                        } catch (e) {
                          const errMsg = e.response?.data?.message || 'Failed to create chat.';
                          // If already exists, try to open it
                          if (errMsg.toLowerCase().includes('already') || e.response?.status === 409) {
                            setGroupChatMsg('ℹ️ Chat already exists — opening it…');
                            setTimeout(() => navigate(`/chat/${applicationsRoomId}`), 800);
                          } else {
                            setGroupChatMsg(`❌ ${errMsg}`);
                          }
                        } finally {
                          setGroupChatCreating(false);
                        }
                      }}
                      style={{
                        background: groupChatCreating || !groupChatName.trim() ? '#d1d5db' : '#7C3AED',
                        color: '#fff', border: 'none', padding: '0.5rem 1.1rem',
                        borderRadius: '8px', fontWeight: 600, fontSize: '0.82rem',
                        cursor: groupChatCreating || !groupChatName.trim() ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {groupChatCreating ? 'Creating…' : '+ Create & Add All Renters'}
                    </button>
                    <button
                      onClick={() => navigate(`/chat/${applicationsRoomId}`)}
                      style={{
                        background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db',
                        padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600,
                        fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      Open Existing Chat
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'rentals' && !isOwner && (
            <div className="admin-container">
              <div className="admin-header">
                <h1>My Rentals</h1>
                <p>Properties you are currently renting</p>
              </div>
              <div className="properties-list">
                {rentalsLoading ? (
                  <p className="no-properties">Loading…</p>
                ) : myRentals.length === 0 ? (
                  <p className="no-properties">You are not renting any properties yet.</p>
                ) : (
                  <div className="admin-properties-grid">
                    {myRentals.map((rental) => {
                      const room = rental.room;
                      if (!room) return null;
                      return (
                        <div key={rental._id} className="admin-property-card">
                          <div className="admin-property-image">
                            <span className="property-emoji">{room.image || '🏠'}</span>
                          </div>
                          <div className="admin-property-content">
                            <h3>{room.title}</h3>
                            <p className="property-location">📍 {room.location}</p>
                            <div className="property-details">
                              <span>🛏️ {room.bedrooms} Bed</span>
                              <span>🚿 {room.bathrooms} Bath</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.25rem 0' }}>
                              Owner: {room.createdBy?.name || 'Unknown'}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>
                              Rented since {new Date(rental.createdAt).toLocaleDateString()}
                            </p>
                            <div className="property-actions">
                              <button
                                className="btn-edit"
                                onClick={() => navigate(`/chat/${room._id}`)}
                              >
                                💬 Open Chat
                              </button>
                              <button
                                className="btn-delete"
                                onClick={() => navigate(`/property/${room._id}`)}
                              >
                                View Listing
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CHAT ── */}
          {activeTab === 'chat' && (
            <div className="admin-container">
              <div className="admin-header">
                <h1>Chat Messages</h1>
                <p>View and manage your group chat sessions.</p>
              </div>
              <div className="properties-list" style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="property-emoji" style={{ marginBottom: '1rem', fontSize: '3rem' }}>💬</div>
                <h3>Go to My Chats</h3>
                <p>All your active chat sessions with owners and renters are in one place.</p>
                <button
                  className="btn-add-property"
                  style={{ marginTop: '1rem' }}
                  onClick={() => navigate('/my-chats')}
                >
                  Open My Chats →
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default Admin;