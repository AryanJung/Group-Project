import React, {
  useState,
  useEffect,
  useRef,
} from 'react';

import { useProperties } from '../../context/PropertiesContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import MapPicker from './MapPicker';
import './Admin.css';

const Admin = () => {

  const {
    properties,
    addProperty,
    removeProperty,
    updateProperty,
    loading,
    error,
  } = useProperties();

  const {
    isAuthenticated,
    user,
    logout,
  } = useAuth();

  const navigate = useNavigate();

  // Tabs
  const [activeTab, setActiveTab] = useState('profile');

  // Form
  const [showAddForm, setShowAddForm] = useState(false);

  // Submit loading
  const [submitting, setSubmitting] = useState(false);

  // Editing
  const [editingProperty, setEditingProperty] = useState(null);

  // Ref for auto-scroll
  const formRef = useRef(null);

  // Form Data
  const [formData, setFormData] = useState({
    id: null,
    title: '',
    location: '',
    coordinates: null,
    price: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    image: '🏠',
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Check role
  const isOwner =
    user?.role === 'admin' ||
    user?.role === 'owner';

  const getPropertyId = (property) =>
    property?.id ?? property?._id ?? null;

  // Handle Inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // EDIT PROPERTY
  const handleEdit = (property) => {

    setEditingProperty(property);

    setFormData({
      id: getPropertyId(property),
      title: property.title || '',
      location: property.location || '',
      coordinates: property.coordinates || null,

      price: property.price
        ? property.price
            .replace('Rs. ', '')
            .replace('/month', '')
        : '',

      bedrooms: property.bedrooms || '',
      bathrooms: property.bathrooms || '',
      area: property.area || '',
      image: property.image || '🏠',
    });

    setShowAddForm(true);
    setActiveTab('houses');

    // Auto scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  // DELETE PROPERTY
  const handleDelete = async (id) => {

    const confirmDelete = window.confirm(
      'Are you sure you want to delete this property?'
    );

    if (!confirmDelete) return;

    const result = await removeProperty(id);

    if (!result.success) {
      alert(result.error || 'Failed to delete property');
    }
  };

  // SUBMIT FORM
  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!formData.coordinates) {
      alert(
        'Please select a precise location on the map first!'
      );
      return;
    }

    setSubmitting(true);

    const newProperty = {
      ...formData,

      price: `Rs. ${formData.price}/month`,

      bedrooms: parseInt(formData.bedrooms),

      bathrooms: parseInt(formData.bathrooms),
    };

    let result;

    // UPDATE EXISTING
    if (editingProperty) {

      result = await updateProperty(
        editingProperty.id || editingProperty._id,
        newProperty
      );

    }

    // ADD NEW
    else {

      result = await addProperty(newProperty);

    }

    setSubmitting(false);

    if (result.success) {

      setFormData({
        id: null,
        title: '',
        location: '',
        coordinates: null,
        price: '',
        bedrooms: '',
        bathrooms: '',
        area: '',
        image: '🏠',
      });

      setEditingProperty(null);

      setShowAddForm(false);

    } else {

      alert(result.error || 'Failed to save property');

    }
  };

  useEffect(() => {
    if (!isOwner && activeTab === 'houses') {
      setActiveTab('profile');
    }
  }, [activeTab, isOwner]);

  // Prevent render before auth
  if (!isAuthenticated) return null;

  return (
    <div className="admin-page">

      <div className="admin-dashboard-wrapper">

        {/* SIDEBAR */}
        <aside className="admin-sidebar">

          {/* USER */}
          <div className="admin-user-nav-header">

            <div className="user-avatar">
              {user?.name?.charAt(0) || 'U'}
            </div>

            <h3>{user?.name || 'User'}</h3>

            <span className="role-tag">
              {user?.role}
            </span>

          </div>

          {/* NAV */}
          <nav className="admin-nav-menu">

            <button
              className={
                activeTab === 'profile'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveTab('profile')
              }
            >
              👤 My Profile
            </button>

            {isOwner && (
              <button
                className={
                  activeTab === 'houses'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setActiveTab('houses')
                }
              >
                🏠 Manage Houses
              </button>
            )}

            <button
              className={
                activeTab === 'chat'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveTab('chat')
              }
            >
              💬 Chat Messages
            </button>

          </nav>

          {/* LOGOUT */}
          <button
            onClick={logout}
            className="btn-logout-sidebar"
          >
            Logout
          </button>

        </aside>

        {/* MAIN */}
        <main className="admin-main-content">

          {/* PROFILE */}
{activeTab === 'profile' && (
  <div className="admin-container">
    <div className="admin-header">
      <h1>My Account</h1>
      <p>Manage your personal information</p>
    </div>

    <div className="add-property-form"> {/* Form container style applied for consistency */}
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

          {/* HOUSES */}
          {activeTab === 'houses' && (

            <div className="admin-container">

              {/* HEADER */}
              <div className="admin-header">

                <h1>
                  {
                    isOwner
                      ? 'Property Management'
                      : 'Current Residence'
                  }
                </h1>

                {error && (
                  <div className="error-banner">
                    ⚠️ {error}
                  </div>
                )}

              </div>

              {/* ACTIONS */}
              {isOwner && (

                <div className="admin-actions">

                  <button
                    className="btn-add-property"
                    onClick={() => {

                      setShowAddForm(!showAddForm);

                      // reset when closing
                      if (showAddForm) {

                        setEditingProperty(null);

                        setFormData({
                          id: null,
                          title: '',
                          location: '',
                          coordinates: null,
                          price: '',
                          bedrooms: '',
                          bathrooms: '',
                          area: '',
                          image: '🏠',
                        });

                      }
                    }}
                  >
                    {
                      showAddForm
                        ? 'Cancel'
                        : '+ Add New Property'
                    }
                  </button>

                </div>

              )}

              {/* FORM */}
              {showAddForm && isOwner && (

                <div
                  className="add-property-form"
                  ref={formRef}
                >

                  <h2>
                    {
                      editingProperty
                        ? 'Edit Property'
                        : 'Add New Property'
                    }
                  </h2>

                  <form onSubmit={handleSubmit}>

                    {/* TITLE + MAP */}
                    <div className="form-row">

                      <div className="form-group">

                        <label>
                          Property Title
                        </label>

                        <input
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          required
                          placeholder="Modern Apartment"
                        />

                      </div>

                      <div
                        className="form-group"
                        style={{
                          gridColumn: 'span 2',
                        }}
                      >

                        <label>
                          Property Precise Location
                        </label>

                        <MapPicker
                          currentCoords={
                            formData.coordinates
                          }

                          setCoordinates={(coords) =>
                            setFormData({
                              ...formData,
                              coordinates: coords,
                            })
                          }

                          setLocationName={(name) =>
                            setFormData((prev) => ({
                              ...prev,
                              location: name,
                            }))
                          }
                        />

                        {formData.location && (

                          <p className="selected-location">

                            <strong>
                              Selected:
                            </strong>{' '}

                            {formData.location}

                          </p>

                        )}

                      </div>

                    </div>

                    {/* PRICE + AREA */}
                    <div className="form-row">

                      <div className="form-group">

                        <label>
                          Monthly Rent (NPR)
                        </label>

                        <input
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          required
                          placeholder="25000"
                        />

                      </div>

                      <div className="form-group">

                        <label>Area</label>

                        <input
                          type="text"
                          name="area"
                          value={formData.area}
                          onChange={handleInputChange}
                          required
                          placeholder="1200 sq ft"
                        />

                      </div>

                    </div>

                    {/* DETAILS */}
                    <div className="form-row">

                      <div className="form-group">

                        <label>Bedrooms</label>

                        <input
                          type="number"
                          name="bedrooms"
                          value={formData.bedrooms}
                          onChange={handleInputChange}
                          required
                          min="1"
                        />

                      </div>

                      <div className="form-group">

                        <label>Bathrooms</label>

                        <input
                          type="number"
                          name="bathrooms"
                          value={formData.bathrooms}
                          onChange={handleInputChange}
                          required
                          min="1"
                        />

                      </div>

                      <div className="form-group">

                        <label>Emoji Icon</label>

                        <input
                          type="text"
                          name="image"
                          value={formData.image}
                          onChange={handleInputChange}
                          maxLength="2"
                        />

                      </div>

                    </div>

                    {/* SUBMIT */}
                    <button
                      type="submit"
                      className="btn-submit-form"
                      disabled={submitting}
                    >

                      {
                        submitting
                          ? editingProperty
                            ? 'Updating...'
                            : 'Adding...'
                          : editingProperty
                          ? 'Update Property'
                          : 'Add Property'
                      }

                    </button>

                  </form>

                </div>

              )}

              {/* PROPERTY LIST */}
              <div className="properties-list">

                <h2>
                  {
                    isOwner
                      ? `Your Listings (${properties.length})`
                      : 'Active Lease'
                  }
                </h2>

                {loading ? (

                  <p className="no-properties">
                    Loading...
                  </p>

                ) : properties.length === 0 ? (

                  <p className="no-properties">
                    No property info found.
                  </p>

                ) : (

                  <div className="admin-properties-grid">

                    {properties.map((property) => (

                      <div
                        key={property.id || property._id}
                        className="admin-property-card"
                      >

                        {/* IMAGE */}
                        <div className="admin-property-image">

                          <span className="property-emoji">
                            {property.image}
                          </span>

                        </div>

                        {/* CONTENT */}
                        <div className="admin-property-content">

                          <h3>
                            {property.title}
                          </h3>

                          <p className="property-location">
                            📍 {property.location}
                          </p>

                          <div className="property-details">

                            <span>
                              🛏️ {property.bedrooms} Bed
                            </span>

                            <span>
                              🚿 {property.bathrooms} Bath
                            </span>

                            <span>
                              📐 {property.area}
                            </span>

                          </div>

                          <div className="property-price">
                            {property.price}
                          </div>

                          {isOwner && (

                            <div className="property-actions">

                              <button
                                className="btn-edit"
                                onClick={() =>
                                  handleEdit(property)
                                }
                              >
                                Edit
                              </button>

                              <button
                                className="btn-delete"
                                onClick={() =>
                                  handleDelete(property.id)
                                }
                              >
                                Delete
                              </button>

                            </div>

                          )}

                        </div>

                      </div>

                    ))}

                  </div>

                )}

              </div>

            </div>

          )}

          {/* CHAT */}
          {activeTab === 'chat' && (

            <div className="admin-container">

              <div className="admin-header">

                <h1>Messages</h1>

                <p>
                  Contact and inquiries will appear here.
                </p>

              </div>

              <div
                className="properties-list"
                style={{
                  textAlign: 'center',
                  padding: '5rem',
                }}
              >

                <div
                  className="property-emoji"
                  style={{
                    marginBottom: '1rem',
                  }}
                >
                  💬
                </div>

                <h3>
                  Chat System Coming Soon
                </h3>

                <p>
                  This section is being developed.
                </p>

              </div>

            </div>

          )}

        </main>

      </div>

    </div>
  );
};

export default Admin;
