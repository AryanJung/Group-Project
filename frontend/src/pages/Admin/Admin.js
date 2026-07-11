import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { adminAPI, rentalAPI, applicationAPI } from '../../services/api';
import { needsKycVerification } from '../../utils/kyc';
import MapPicker from './MapPicker';
import './Admin.css';

const Admin = () => {
  const { isAuthenticated, isOwner, user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('profile');
  // applications tab state (opened via notification link)
  const [applicationsRoomId, setApplicationsRoomId] = useState(null);
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);

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
  const [formError, setFormError] = useState('');
  const formRef = useRef(null);

  const emptyForm = {
    title: '',
    location: '',
    coordinates: null,
    price: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    description: '',
    image: '',
    maxRenters: 1,
  };
  const [formData, setFormData] = useState(emptyForm);
  const [selectedFiles, setSelectedFiles] = useState([]); // Track cloud upload image target selections

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

  const handleFileChange = (e) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedFiles([]);
    setEditingProperty(null);
    setShowAddForm(false);
    setFormError('');
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
      description: property.description || '',
      maxRenters: property.maxRenters ?? 1,
      image: property.image || '',
    });
    setSelectedFiles([]);
    setFormError('');
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
      setRoomsError(err.response?.data?.message || 'Failed to delete property');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.coordinates) {
      setFormError('Please select a precise location on the map first.');
      return;
    }

    const hasExistingImages = editingProperty && (editingProperty.images?.length > 0 || (editingProperty.image && editingProperty.image !== '🏠'));
    if (!editingProperty && selectedFiles.length === 0) {
      setFormError('Please upload at least one image of the property.');
      return;
    }
    if (editingProperty && !hasExistingImages && selectedFiles.length === 0) {
      setFormError('Please upload at least one image of the property.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    // Package fields inside multi-part FormData container structure
    const multipartData = new FormData();
    multipartData.append('title', formData.title);
    multipartData.append('location', formData.location);
    multipartData.append('description', formData.description);
    multipartData.append('price', formData.price);
    multipartData.append('area', formData.area);
    multipartData.append('maxRenters', parseInt(formData.maxRenters, 10));
    multipartData.append('bedrooms', parseInt(formData.bedrooms, 10));
    multipartData.append('bathrooms', parseInt(formData.bathrooms, 10));
    
    if (formData.coordinates) {
      multipartData.append('coordinates', JSON.stringify(formData.coordinates));
    }

    // Append standard file streams to match backend middleware definition
    selectedFiles.forEach((file) => {
      multipartData.append('images', file);
    });

    try {
      if (editingProperty) {
        const updated = await adminAPI.updateProperty(editingProperty._id || editingProperty.id, multipartData);
        setMyRooms((prev) =>
          prev.map((r) => (String(r._id || r.id) === String(updated._id || updated.id) ? updated : r))
        );
      } else {
        const created = await adminAPI.createProperty(multipartData);
        setMyRooms((prev) => [created, ...prev]);
      }
      resetForm();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save property');
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
              My Profile
            </button>

            {isOwner && (
              <button className={activeTab === 'houses' ? 'active' : ''} onClick={() => setActiveTab('houses')}>
                Manage Houses
              </button>
            )}

            {isOwner && (
              <button className={activeTab === 'applications' ? 'active' : ''} onClick={() => setActiveTab('applications')}>
                Applications
              </button>
            )}

            {!isOwner && (
              <button className={activeTab === 'rentals' ? 'active' : ''} onClick={() => setActiveTab('rentals')}>
                My Rentals
              </button>
            )}

            <button className={activeTab === 'chat' ? 'active' : ''} onClick={() => setActiveTab('chat')}>
              Chat Messages
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

                <div className="profile-kyc-section">
                  <h3>Identity Verification</h3>
                  {user?.kycVerified ? (
                    <div className="kyc-status-card kyc-status-card--verified">
                      <p>Your identity has been verified.</p>
                      <Link to="/kyc" className="btn-kyc-link">View verification details</Link>
                    </div>
                  ) : (
                    <div className="kyc-status-card kyc-status-card--pending">
                      <p>
                        Complete KYC verification to list properties or apply to rent.
                        Verification is required before you can use these features.
                      </p>
                      <Link to="/kyc" className="btn-kyc-link btn-kyc-link--primary">
                        Complete KYC Verification
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── MANAGE HOUSES (owners only) ── */}
          {activeTab === 'houses' && isOwner && (
            <div className="admin-container">
              <div className="admin-header">
                <h1>Property Management</h1>
                {roomsError && <div className="error-banner">{roomsError}</div>}
              </div>

              <div className="admin-actions">
                <button
                  className="btn-add-property"
                  onClick={() => {
                    if (showAddForm) {
                      resetForm();
                      return;
                    }
                    if (needsKycVerification(user, isAdmin)) {
                      navigate('/kyc');
                      return;
                    }
                    setShowAddForm(true);
                  }}
                >
                  {showAddForm ? 'Cancel' : 'Add New Property'}
                </button>
              </div>

              {/* FORM */}
              {showAddForm && (
                <div className="add-property-form" ref={formRef}>
                  <h2>{editingProperty ? 'Edit Property' : 'Add New Property'}</h2>
                  {formError && <div className="error-banner">{formError}</div>}
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
                    </div>

                    <div className="form-row">
                      <div className="form-group form-group--wide">
                        <label>Property Description</label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          rows="5"
                          placeholder="Describe the rooms, neighborhood, access, and house rules."
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group form-group--wide">
                        <label>Upload Property Pictures (Max 5)</label>
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          onChange={handleFileChange} 
                          style={{ padding: '0.5rem 0' }}
                        />
                        {selectedFiles.length > 0 && (
                          <p style={{ fontSize: '0.85rem', color: '#6366f1', margin: '4px 0 0 0', fontWeight: 600 }}>
                            {selectedFiles.length} item(s) selected ready for Cloudinary upload.
                          </p>
                        )}
                      </div>
                    </div>

                    <button type="submit" className="btn-submit-form" disabled={submitting}>
                      {submitting
                        ? editingProperty ? 'Updating...' : 'Adding...'
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
                          {property.image && property.image !== '🏠' ? (
                            <img src={property.image} alt={property.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                          ) : (
                            property.image ? (
                              <img src={property.image} alt={property.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                            ) : (
                              <span className="property-card-icon" aria-hidden="true">
                                <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
                                  <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                                </svg>
                              </span>
                            )
                          )}
                        </div>
                        <div className="admin-property-content">
                          <h3>{property.title}</h3>
                          <p className="property-location">{property.location}</p>
                          {property.status && (
                            <span
                              style={{
                                display: 'inline-block',
                                marginBottom: '0.5rem',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '999px',
                                fontSize: '0.73rem',
                                fontWeight: 700,
                                color: property.status === 'approved' ? '#115e59' : property.status === 'rejected' ? '#b91c1c' : '#78350f',
                                background: property.status === 'approved' ? '#d1fae5' : property.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                              }}
                            >
                              {property.status === 'approved'
                                ? 'Approved'
                                : property.status === 'rejected'
                                ? 'Rejected'
                                : 'Pending Approval'}
                            </span>
                          )}
                          <div className="property-details">
                            <span>{property.bedrooms} Bed</span>
                            <span>{property.bathrooms} Bath</span>
                            <span>{property.area}</span>
                          </div>
                          <div className="property-price">{property.price}</div>
                          {property.isRented && (
                            <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 600 }}>
                              Currently Rented
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
                              Applications
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
                <h1>Rental Applications</h1>
                <p>
                  {applicationsRoomId
                    ? 'Applications for selected listing'
                    : 'All applications across your listings'}
                  {applicationsRoomId && (
                    <button
                      onClick={() => setApplicationsRoomId(null)}
                      style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: '#6366f1', background: 'none', border: '1px solid #6366f1', borderRadius: '99px', padding: '0.1rem 0.65rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Clear filter
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
                          {app.room?.title && (
                            <div style={{ fontSize: '0.72rem', background: '#f0f9ff', color: '#0369a1', display: 'inline-block', padding: '0.1rem 0.55rem', borderRadius: '99px', fontWeight: 600, marginBottom: '0.4rem' }}>
                              {app.room.title}
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
                                  } catch (e) { setFormError(e.response?.data?.message || 'Failed to accept'); }
                                }}
                              >
                                Accept
                              </button>
                              <button
                                style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
                                onClick={async () => {
                                  try {
                                    await applicationAPI.reject(app._id);
                                    setApplications((prev) =>
                                      prev.map((a) => a._id === app._id ? { ...a, status: 'rejected' } : a)
                                    );
                                  } catch (e) { setFormError(e.response?.data?.message || 'Failed to reject'); }
                                }}
                              >
                                Reject
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
                            {room.image && room.image !== '🏠' ? (
                              <img src={room.image} alt={room.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                            ) : (
                              <span className="property-card-icon" aria-hidden="true">
                                <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
                                  <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                                </svg>
                              </span>
                            )}
                          </div>
                          <div className="admin-property-content">
                            <h3>{room.title}</h3>
                            <p className="property-location">{room.location}</p>
                            <div className="property-details">
                              <span>{room.bedrooms} Bed</span>
                              <span>{room.bathrooms} Bath</span>
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
                                Open Chat
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
                <div className="property-card-icon" style={{ margin: '0 auto 1rem' }} aria-hidden="true">
                  <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15a3 3 0 01-3 3H8l-5 4V6a3 3 0 013-3h12a3 3 0 013 3v9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3>Go to My Chats</h3>
                <p>All your active chat sessions with owners and renters are in one place.</p>
                <button
                  className="btn-add-property"
                  style={{ marginTop: '1rem' }}
                  onClick={() => navigate('/my-chats')}
                >
                  Open My Chats
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