import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProperties } from '../../context/PropertiesContext';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, reviewAPI, rentalAPI, applicationAPI } from '../../services/api';
import './PropertyDetail.css';

const PENDING_STATUSES = ['pending_verification', 'pending'];

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { properties } = useProperties();
  const { user, hasReviewAccess } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rental access state: null = unknown, { isOwner, isRenter }
  const [rentalStatus, setRentalStatus] = useState(null);
  const [renting, setRenting] = useState(false);

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviews, setReviews] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValidObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(value);

  const loadApprovedReviews = async (roomId) => {
    try {
      const approvedReviews = await reviewAPI.getReviewsByRoom(roomId);
      setReviews(approvedReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
      setReviews([]);
    }
  };

  useEffect(() => {
    const loadProperty = async () => {
      try {
        setLoading(true);

        if (!isValidObjectId(id)) {
          const foundProperty = properties.find(
            (propertyItem) =>
              String(propertyItem.id) === String(id) ||
              String(propertyItem._id) === String(id)
          );

          if (foundProperty) {
            setProperty(foundProperty);
            setReviews([]);
          }
          return;
        }

        const data = await adminAPI.getPropertyById(id);
        setProperty(data);
        await loadApprovedReviews(id);
      } catch (error) {
        const foundProperty = properties.find(
          (propertyItem) =>
            String(propertyItem.id) === String(id) ||
            String(propertyItem._id) === String(id)
        );

        if (foundProperty) {
          setProperty(foundProperty);
          if (isValidObjectId(foundProperty._id || foundProperty.id)) {
            await loadApprovedReviews(foundProperty._id || foundProperty.id);
          } else {
            setReviews([]);
          }
        } else {
          console.error('Property not found:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [id, properties]);

  // Load rental status whenever the property id or logged-in user changes
  useEffect(() => {
    const isValidObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(v);
    if (!user?.token || !isValidObjectId(id)) return;

    rentalAPI
      .getStatus(id)
      .then((status) => setRentalStatus(status))
      .catch(() => setRentalStatus(null));
  }, [id, user]);

  const handleApply = async () => {
    if (!user?.token) {
      setErrorMessage('Please log in to apply for this property.');
      return;
    }
    const message = window.prompt('Add a note to the owner (optional):') ?? '';
    setRenting(true);
    setErrorMessage('');
    try {
      const application = await applicationAPI.apply(id, message);
      setRentalStatus((prev) => ({
        ...prev,
        application: { _id: application._id, status: 'pending' },
      }));
      setSuccessMessage('Application submitted! The owner will review it shortly.');
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to submit application. Please try again.'
      );
    } finally {
      setRenting(false);
    }
  };

  const handleWithdrawApplication = async () => {
    const appId = rentalStatus?.application?._id;
    if (!appId) return;
    if (!window.confirm('Withdraw your application for this property?')) return;
    setRenting(true);
    setErrorMessage('');
    try {
      await applicationAPI.withdraw(appId);
      setRentalStatus((prev) => ({ ...prev, application: null }));
      setSuccessMessage('Application withdrawn.');
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to withdraw application.'
      );
    } finally {
      setRenting(false);
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    if (!hasReviewAccess) {
      setErrorMessage('Please log in with a registered account to submit a review.');
      return;
    }

    if (rating === 0) {
      setErrorMessage('Please select a star rating before submitting.');
      return;
    }

    if (!reviewText.trim()) {
      setErrorMessage('Review text cannot be empty.');
      return;
    }

    if (!isValidObjectId(id)) {
      setErrorMessage(
        'This property is stored locally only. Reviews can only be submitted for backend properties.'
      );
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setSubmitting(true);

    try {
      const savedReviewFromDB = await reviewAPI.postReview(id, rating, reviewText);

      if (PENDING_STATUSES.includes(savedReviewFromDB.status)) {
        setSuccessMessage(
          'Your review contains sensitive content and has been sent to our Superadmin team for approval before going public.'
        );
      } else {
        const updatedReviewForUI = {
          _id: savedReviewFromDB._id,
          userId: {
            name: savedReviewFromDB.user?.name || user.name || 'You',
          },
          avatar: '👤',
          rating: savedReviewFromDB.rating,
          censoredReview: savedReviewFromDB.censoredReview,
          createdAt: savedReviewFromDB.createdAt,
          aiAnalysis: savedReviewFromDB.aiAnalysis,
          wordsBlurred: savedReviewFromDB.wordsBlurred,
        };

        setReviews([updatedReviewForUI, ...reviews]);
        setSuccessMessage('Review posted successfully!');
      }

      setReviewText('');
      setRating(0);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          'Failed to submit review. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChat = () => {
    navigate(`/chat/${id}`);
  };

  const hasChatAccess = rentalStatus?.isOwner || rentalStatus?.isRenter;
  const applicationStatus = rentalStatus?.application?.status ?? null;
  const applicationId = rentalStatus?.application?._id ?? null;
  const isAtCapacity =
    !rentalStatus?.isOwner &&
    !rentalStatus?.isRenter &&
    (rentalStatus?.isRented || property?.isRented) &&
    !applicationStatus;
  const canApply =
    user?.token &&
    isValidObjectId(id) &&
    rentalStatus !== null &&
    !rentalStatus.isOwner &&
    !rentalStatus.isRenter &&
    !applicationStatus &&
    !isAtCapacity;

  if (loading) {
    return (
      <div className="property-detail">
        <div className="container">
          <div className="loading">Loading property details...</div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="property-detail">
        <div className="container">
          <div className="error">Property not found</div>
          <button onClick={() => navigate('/')} className="btn-back">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="property-detail">
      <div className="container">
        <button onClick={() => navigate('/')} className="btn-back">
          ← Back to Properties
        </button>

        <div className="property-detail-content">
          <div className="property-detail-image">
            <span className="property-emoji-large">{property.image}</span>
          </div>

          <div className="property-detail-info">
            <h1 className="property-detail-title">{property.title}</h1>
            <p className="property-detail-location">📍 {property.location}</p>

            <div className="property-detail-specs">
              <div className="spec-item">
                <span className="spec-icon">🛏️</span>
                <span className="spec-label">Bedrooms</span>
                <span className="spec-value">{property.bedrooms}</span>
              </div>
              <div className="spec-item">
                <span className="spec-icon">🚿</span>
                <span className="spec-label">Bathrooms</span>
                <span className="spec-value">{property.bathrooms}</span>
              </div>
              <div className="spec-item">
                <span className="spec-icon">📐</span>
                <span className="spec-label">Area</span>
                <span className="spec-value">{property.area}</span>
              </div>
            </div>

            <div className="property-detail-price-section">
              <h2 className="property-detail-price">{property.price}</h2>
            </div>

            <div className="property-detail-actions">
              {/* Owner or accepted renter */}
              {hasChatAccess ? (
                <>
                  <button className="btn-talk-to-broker" onClick={handleOpenChat}>
                    💬 Open Group Chat
                  </button>
                  {rentalStatus?.isRenter && (
                    <button
                      onClick={() => rentalAPI.cancelRent(id).then(() => setRentalStatus((p) => ({ ...p, isRenter: false, isRented: false })))}
                      disabled={renting}
                      style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginLeft: '0.5rem' }}
                    >
                      Cancel Rental
                    </button>
                  )}
                </>
              ) : applicationStatus === 'pending' ? (
                /* Application submitted — waiting for owner */
                <>
                  <button className="btn-talk-to-broker" disabled style={{ opacity: 0.7, cursor: 'not-allowed', background: '#f59e0b' }}>
                    ⏳ Application Pending
                  </button>
                  <button
                    onClick={handleWithdrawApplication}
                    disabled={renting}
                    style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginLeft: '0.5rem' }}
                  >
                    {renting ? 'Withdrawing…' : 'Withdraw'}
                  </button>
                </>
              ) : applicationStatus === 'rejected' ? (
                /* Rejected — can try again */
                <>
                  <button className="btn-talk-to-broker" disabled style={{ opacity: 0.5, cursor: 'not-allowed', background: '#ef4444' }}>
                    ❌ Application Rejected
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={renting}
                    style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginLeft: '0.5rem' }}
                  >
                    {renting ? 'Submitting…' : 'Apply Again'}
                  </button>
                </>
              ) : isAtCapacity ? (
                <button className="btn-talk-to-broker" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                  🔒 Listing Full ({property?.maxRenters}/{property?.maxRenters} renters)
                </button>
              ) : canApply ? (
                <button
                  className="btn-talk-to-broker"
                  onClick={handleApply}
                  disabled={renting}
                >
                  {renting ? 'Submitting…' : '🏠 Apply to Rent'}
                </button>
              ) : null}
              <button
                className="btn-location"
                onClick={() => {
                  const { coordinates, location } = property;
                  const hasCoords = coordinates && coordinates.lat && coordinates.lng;
                  const url = hasCoords
                    ? `http://maps.google.com/?q=${coordinates.lat},${coordinates.lng}`
                    : `http://maps.google.com/?q=${encodeURIComponent(location)}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
              >
                View exact location
              </button>
              <button className="btn-view" onClick={() => navigate('/')}>
                View More Properties
              </button>
            </div>
          </div>
        </div>

        <div className="reviews-section">
          <div className="reviews-display-pane">
            <h2>Community Reviews ({reviews.length})</h2>
            {reviews.length === 0 ? (
              <p className="no-reviews">
                No reviews yet. Be the first to express your thoughts!
              </p>
            ) : (
              <div className="reviews-list">
                {reviews.map((review) => (
                  <div key={review._id} className="review-card">
                    <div className="review-card-header">
                      <div className="review-user-info">
                        <span className="user-avatar">{review.avatar || '👤'}</span>
                        <div>
                          <h4 className="user-name">
                            {review.userId?.name || 'Anonymous User'}
                          </h4>
                          <span className="review-date">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="review-stars">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <span key={index} className="star-filled">
                            {index < review.rating ? '⭐' : '☆'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="review-text">{review.censoredReview}</p>
                    {review.wordsBlurred && (
                      <span className="ai-flag-tag">Sensitive words were automatically censored</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="reviews-form-pane">
            <h2>Leave a Review</h2>
            {!hasReviewAccess ? (
              <p className="no-reviews">
                Please log in with a registered account to submit a review.
              </p>
            ) : (
              <form onSubmit={handleReviewSubmit}>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      onClick={() => setRating(star)}
                      style={{ cursor: 'pointer', fontSize: '2rem' }}
                    >
                      {star <= rating ? '⭐' : '☆'}
                    </span>
                  ))}
                </div>

                {errorMessage && (
                  <div className="review-error-banner">{errorMessage}</div>
                )}
                {successMessage && (
                  <div className="review-success-banner">{successMessage}</div>
                )}

                <textarea
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  placeholder="Write your review... Note: Any vulgar text will automatically be filtered by our XLM-R classifier system."
                  rows="4"
                  disabled={submitting}
                />

                <button type="submit" disabled={submitting}>
                  {submitting ? 'Running AI Moderation Check...' : 'Submit Review'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
