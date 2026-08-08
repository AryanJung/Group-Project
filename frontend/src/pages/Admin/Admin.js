import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { adminAPI, rentalAPI, applicationAPI, visitAPI, agreementAPI } from '../../services/api';
import AgreementModal from '../../components/AgreementModal/AgreementModal';
import AgreementsList from '../Agreements/AgreementsList';
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

  // Applicant profile panel (expanded inline per application)
  const [expandedApp, setExpandedApp] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [messagingApp, setMessagingApp] = useState(null); // applicationId currently opening a chat
  const [visitsByApp, setVisitsByApp] = useState({});
  const [agreementsByApp, setAgreementsByApp] = useState({});

  const canRejectApplication = (app) => {
    if (!app || app.status === 'rejected' || app.status === 'accepted') return false;
    const agreements = agreementsByApp[app._id] || [];
    return !agreements.some((agreement) => ['final_pending', 'executed', 'locked'].includes(agreement.status));
  };

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

  // Agreement modal state
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementApp, setAgreementApp] = useState(null);

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
    features: [],
  };
  const [formData, setFormData] = useState(emptyForm);
  const [newTagInput, setNewTagInput] = useState('');
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

  // expose agreementAPI to modal (legacy connector)
  useEffect(() => {
    window.agreementAPI = agreementAPI;
  }, []);

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

  useEffect(() => {
    const loadAgreementsForApplications = async () => {
      const appsToLoad = applications.filter((app) => agreementsByApp[app._id] === undefined);
      if (appsToLoad.length === 0) return;

      const loaded = {};
      await Promise.allSettled(
        appsToLoad.map(async (app) => {
          try {
            const ags = await agreementAPI.getByApplication(app._id);
            loaded[app._id] = ags;
          } catch (err) {
            loaded[app._id] = [];
          }
        })
      );
      setAgreementsByApp((prev) => ({ ...prev, ...loaded }));
    };

    if (activeTab === 'applications' && isOwner && applications.length > 0) {
      loadAgreementsForApplications();
    }
  }, [activeTab, isOwner, applications, agreementsByApp]);

  const handleViewProfile = async (app) => {
    if (expandedApp === app._id) {
      setExpandedApp(null);
      setProfileData(null);
      return;
    }
    setExpandedApp(app._id);
    setPanelLoading(true);
    try {
      const data = await applicationAPI.getApplicantProfile(app._id);
      setProfileData(data);
      // load visit requests for this application
      try {
        const visits = await visitAPI.getVisitsByApplication(app._id);
        setVisitsByApp((prev) => ({ ...prev, [app._id]: visits }));
      } catch (ve) {
        console.error('Failed to load visits for application', ve);
        setVisitsByApp((prev) => ({ ...prev, [app._id]: [] }));
      }

      // load agreements related to this application
      try {
        const ags = await agreementAPI.getByApplication(app._id);
        setAgreementsByApp((prev) => ({ ...prev, [app._id]: ags }));
      } catch (ae) {
        console.error('Failed to load agreements for application', ae);
        setAgreementsByApp((prev) => ({ ...prev, [app._id]: [] }));
      }
    } catch (e) {
      setFormError(e.response?.data?.message || 'Failed to load applicant profile');
    } finally {
      setPanelLoading(false);
    }
  };

  const handleMessageApplicant = async (app) => {
    setMessagingApp(app._id);
    setFormError('');
    try {
      const chat = await applicationAPI.getOrCreateChat(app._id);
      const roomId = chat.room?._id || chat.room;
      navigate(`/chat/${roomId}?chat=${chat._id}`);
    } catch (e) {
      setFormError(e.response?.data?.message || 'Failed to open chat');
    } finally {
      setMessagingApp(null);
    }
  };

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
      features: property.features || [],
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

    if (formData.features && formData.features.length > 0) {
      formData.features.forEach((feat) => {
        multipartData.append('features', feat);
      });
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

  const handleAddTag = () => {
    const tag = newTagInput.trim();
    if (!tag) return;
    if (formData.features?.includes(tag)) {
      setNewTagInput('');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      features: [...(prev.features || []), tag],
    }));
    setNewTagInput('');
  };

  const handleAddTagOnEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      features: (prev.features || []).filter((t) => t !== tagToRemove),
    }));
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
              <>
                <button className={activeTab === 'rentals' ? 'active' : ''} onClick={() => setActiveTab('rentals')}>
                  My Rentals
                </button>
                <button className={activeTab === 'agreements' ? 'active' : ''} onClick={() => setActiveTab('agreements')}>
                  Rental Agreements
                </button>
              </>
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
                        <label>Custom Feature Tags (e.g. WiFi, Parking, Balcony)</label>
                        <div className="custom-tags-input-wrapper">
                          <input
                            type="text"
                            placeholder="Type a feature tag and press Enter or click Add"
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={handleAddTagOnEnter}
                          />
                          <button type="button" onClick={handleAddTag} className="btn-add-tag">Add</button>
                        </div>
                        <div className="custom-tags-container">
                          {formData.features?.map((tag, idx) => (
                            <span key={idx} className="custom-tag-chip">
                              {tag}
                              <button type="button" onClick={() => handleRemoveTag(tag)} className="btn-remove-tag">×</button>
                            </span>
                          ))}
                        </div>
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
                      <div key={app._id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
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
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {app.status === 'pending' ? (
                                <>
                                  <button
                                    style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
                                    onClick={async () => {
                                      try {
                                        const result = await applicationAPI.accept(app._id);
                                        const updatedApp = result?.application || result;
                                        setApplications((prev) =>
                                          prev.map((a) => (a._id === app._id ? updatedApp : a))
                                        );
                                      } catch (e) { setFormError(e.response?.data?.message || 'Failed to accept'); }
                                    }}
                                  >
                                    Accept
                                  </button>
                                  {canRejectApplication(app) && (
                                    <button
                                      style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
                                      onClick={async () => {
                                        try {
                                          const updatedApp = await applicationAPI.reject(app._id);
                                          setApplications((prev) =>
                                            prev.map((a) => (a._id === app._id ? updatedApp : a))
                                          );
                                        } catch (e) { setFormError(e.response?.data?.message || 'Failed to reject'); }
                                      }}
                                    >
                                      Reject
                                    </button>
                                  )}
                                </>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <span style={{
                                    padding: '0.35rem 0.85rem', borderRadius: '99px', fontWeight: 700, fontSize: '0.75rem',
                                    background: app.status === 'accepted' ? '#dcfce7' : app.status === 'rejected' ? '#fee2e2' : '#f8fafc',
                                    color: app.status === 'accepted' ? '#15803d' : app.status === 'rejected' ? '#b91c1c' : '#334155',
                                    textTransform: 'capitalize',
                                  }}>
                                    {app.status}
                                  </span>
                                  {canRejectApplication(app) && (
                                    <button
                                      style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem' }}
                                      onClick={async () => {
                                        try {
                                          const updatedApp = await applicationAPI.reject(app._id);
                                          setApplications((prev) =>
                                            prev.map((a) => (a._id === app._id ? updatedApp : a))
                                          );
                                        } catch (e) { setFormError(e.response?.data?.message || 'Failed to reject'); }
                                      }}
                                    >
                                      Reject
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <button
                                type="button"
                                style={{ background: 'none', border: '1px solid #d1d5db', color: '#374151', padding: '0.4rem 0.8rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem' }}
                                onClick={() => handleViewProfile(app)}
                              >
                                {expandedApp === app._id ? 'Hide Profile' : 'View Profile'}
                              </button>
                              <button
                                type="button"
                                style={{ background: 'none', border: '1px solid #d1d5db', color: '#374151', padding: '0.4rem 0.8rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem' }}
                                onClick={() => handleMessageApplicant(app)}
                                disabled={messagingApp === app._id}
                              >
                                {messagingApp === app._id ? 'Opening…' : 'Message'}
                              </button>
                              {(app.status === 'both_agree_to_proceed' || app.status === 'visit_completed') && !(agreementsByApp[app._id]?.length > 0) && (
                                <button
                                  type="button"
                                  onClick={() => { setAgreementApp(app); setShowAgreementModal(true); }}
                                  style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '0.45rem 0.85rem', borderRadius: '7px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  Create Rental Agreement
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {expandedApp === app._id && (
                          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                            {panelLoading ? (
                              <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Loading…</p>
                            ) : (
                              profileData && (
                                <>
                                <div style={{ fontSize: '0.85rem', color: '#374151', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                  <div><strong>Name:</strong> {profileData.applicant?.name}</div>
                                  <div><strong>Email:</strong> {profileData.applicant?.email}</div>
                                  {profileData.applicant?.username && (
                                    <div><strong>Username:</strong> {profileData.applicant.username}</div>
                                  )}
                                  {profileData.applicant?.phoneNumber && (
                                    <div><strong>Phone:</strong> {profileData.applicant.phoneNumber}</div>
                                  )}
                                  <div>
                                    <strong>KYC verified:</strong> {profileData.applicant?.kycVerified ? 'Yes' : 'No'}
                                    {profileData.kyc && ` (latest submission: ${profileData.kyc.status})`}
                                  </div>
                                  <div>
                                    <strong>Member since:</strong> {new Date(profileData.applicant?.createdAt).toLocaleDateString()}
                                  </div>
                                </div>

                                {/* Visit requests for this application */}
                                {visitsByApp[app._id] && visitsByApp[app._id].length > 0 && (
                                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Visit Requests</h4>
                                    {visitsByApp[app._id].map((visit) => (
                                      <div key={visit._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px dashed #e5e7eb' }}>
                                        <div style={{ fontSize: '0.85rem' }}>
                                          <div><strong>Requested:</strong> {visit.proposedAt ? new Date(visit.proposedAt).toLocaleString() : 'Not specified'}</div>
                                          <div><strong>Confirmed:</strong> {visit.confirmedAt ? new Date(visit.confirmedAt).toLocaleString() : 'Not yet'}</div>
                                          <div style={{ color: '#6b7280', fontSize: '0.8rem' }}><strong>Status:</strong> {visit.status}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                          {visit.status === 'requested' && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  try {
                                                    const confirmedAt = visit.proposedAt || new Date().toISOString();
                                                    const updated = await visitAPI.confirmVisit(visit._id, confirmedAt);
                                                    setVisitsByApp((prev) => ({ ...prev, [app._id]: prev[app._id].map(v => v._id === visit._id ? updated : v) }));
                                                    setApplications((prev) => prev.map(a => a._id === app._id ? { ...a, status: 'visit_scheduled' } : a));
                                                  } catch (e) { setFormError(e.response?.data?.message || 'Failed to confirm visit'); }
                                                }}
                                                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer' }}
                                              >
                                                Confirm
                                              </button>
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  try {
                                                    const updated = await visitAPI.rejectVisit(visit._id);
                                                    setVisitsByApp((prev) => ({ ...prev, [app._id]: prev[app._id].map(v => v._id === visit._id ? updated : v) }));
                                                    setApplications((prev) => prev.map(a => a._id === app._id ? { ...a, status: 'selected' } : a));
                                                  } catch (e) { setFormError(e.response?.data?.message || 'Failed to reject visit'); }
                                                }}
                                                style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer' }}
                                              >
                                                Reject
                                              </button>
                                            </>
                                          )}
                                          {visit.status === 'landlord_confirmed' && (
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                try {
                                                  const updated = await visitAPI.completeVisit(visit._id, 'proceed');
                                                  setVisitsByApp((prev) => ({ ...prev, [app._id]: prev[app._id].map(v => v._id === visit._id ? updated : v) }));
                                                  setApplications((prev) => prev.map(a => a._id === app._id ? { ...a, status: 'visit_completed' } : a));
                                                } catch (e) {
                                                  setFormError(e.response?.data?.message || 'Failed to mark visit as completed');
                                                }
                                              }}
                                              style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer' }}
                                            >
                                              Mark as Visited
                                            </button>
                                          )}
                                          {visit.status !== 'requested' && visit.status !== 'landlord_confirmed' && (
                                            <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>No actions</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {agreementsByApp[app._id] && agreementsByApp[app._id].length > 0 && (
                                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Agreements</h4>
                                    {agreementsByApp[app._id].map((ag) => (
                                      <div key={ag._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px dashed #e5e7eb' }}>
                                        <div style={{ fontSize: '0.85rem' }}>
                                          <div><strong>ID:</strong> {ag.agreementId}</div>
                                          <div><strong>Status:</strong> {ag.status}</div>
                                          <div style={{ color: '#6b7280', fontSize: '0.8rem' }}><strong>Created:</strong> {new Date(ag.createdAt).toLocaleDateString()}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                          <button type="button" onClick={() => window.location.href = `/agreements/${ag._id}`} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer' }}>View</button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                </>
                              )
                            )}
                          </div>
                        )}
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

          {activeTab === 'agreements' && (
            <div className="admin-container">
              <AgreementsList />
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

        <AgreementModal
          open={showAgreementModal}
          onClose={() => setShowAgreementModal(false)}
          application={agreementApp}
          property={agreementApp?.room}
          onCreated={(result) => {
            // mark application (UI only) to indicate agreement draft
            if (agreementApp) {
              setApplications((prev) => prev.map(a => a._id === agreementApp._id ? { ...a, status: 'agreement_draft' } : a));
              if (result?.agreement) {
                setAgreementsByApp((prev) => ({
                  ...prev,
                  [agreementApp._id]: [result.agreement, ...(prev[agreementApp._id] || [])],
                }));
              }
            }
            // navigate to the created agreement so landlord can preview and send
            try {
              const agId = result?.agreement?._id;
              if (agId) navigate(`/agreements/${agId}`);
            } catch (err) {
              console.error('Failed to navigate to agreement', err);
            }
          }}
        />
        </main>
      </div>
    </div>
  );
};

export default Admin;
