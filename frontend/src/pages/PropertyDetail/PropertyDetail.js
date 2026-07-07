import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProperties } from '../../context/PropertiesContext';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, reviewAPI, rentalAPI, applicationAPI } from '../../services/api';
import {
  buildPropertyFeatures,
  formatDescription,
  getPropertyImages,
  getPropertyVideos,
  getVideoEmbedUrl,
} from '../../utils/propertyHelpers';
import { needsKycVerification } from '../../utils/kyc';
import './PropertyDetail.css';

const PENDING_STATUSES = ['pending_verification', 'pending'];

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20 6L9 17l-5-5"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const StarRating = ({ rating, interactive = false, onSelect }) => (
  <div className={`star-rating${interactive ? ' star-rating--interactive' : ''}`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        className={`star-btn${star <= rating ? ' star-btn--filled' : ''}`}
        onClick={interactive ? () => onSelect(star) : undefined}
        disabled={!interactive}
        aria-label={`${star} star${star !== 1 ? 's' : ''}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={star <= rating ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    ))}
  </div>
);

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { properties } = useProperties();
  const { user, hasReviewAccess, isAdmin } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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
        setActiveImageIndex(0);

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

  useEffect(() => {
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

    if (needsKycVerification(user, isAdmin)) {
      navigate('/kyc');
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
        <div className="property-detail-container">
          <div className="property-detail-loading">
            <div className="loading-spinner" aria-hidden="true" />
            <p>Loading property details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="property-detail">
        <div className="property-detail-container">
          <div className="property-detail-error">
            <h2>Property not found</h2>
            <p>The listing you are looking for may have been removed or is unavailable.</p>
            <button onClick={() => navigate('/')} className="btn-back" type="button">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const images = getPropertyImages(property);
  const videos = getPropertyVideos(property);
  const features = buildPropertyFeatures(property);
  const descriptionParagraphs = formatDescription(
    property.description || 'No property description has been added yet.'
  );
  const hasGallery = images.length > 0;

  return (
    <div className="property-detail">
      <div className="property-detail-container">
        <button onClick={() => navigate('/')} className="btn-back" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Properties
        </button>

        {/* Hero / Gallery */}
        <section className="property-hero">
          {hasGallery ? (
            <div className="property-gallery">
              <div className="gallery-main">
                <img
                  src={images[activeImageIndex]}
                  alt={`${property.title} - view ${activeImageIndex + 1}`}
                  className="gallery-main-image"
                />
                {images.length > 1 && (
                  <span className="gallery-counter">
                    {activeImageIndex + 1} / {images.length}
                  </span>
                )}
              </div>
              {images.length > 1 && (
                <div className="gallery-thumbnails">
                  {images.map((src, index) => (
                    <button
                      key={src + index}
                      type="button"
                      className={`gallery-thumb${index === activeImageIndex ? ' gallery-thumb--active' : ''}`}
                      onClick={() => setActiveImageIndex(index)}
                      aria-label={`View photo ${index + 1}`}
                    >
                      <img src={src} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="property-gallery property-gallery--placeholder">
              <div className="gallery-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                  <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>No photos available</span>
              </div>
            </div>
          )}

          <aside className="property-summary">
            <div className="property-summary-header">
              <h1 className="property-title">{property.title}</h1>
              <p className="property-location">{property.location}</p>
              {property.rating > 0 && (
                <div className="property-rating-badge">
                  <StarRating rating={Math.round(property.rating)} />
                  <span>{property.rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            <div className="property-price-block">
              <span className="property-price-label">Monthly rent</span>
              <p className="property-price">{property.price}</p>
            </div>

            {features.length > 0 && (
              <div className="property-features">
                <h2 className="section-label">Features</h2>
                <ul className="feature-tags">
                  {features.map((feature) => (
                    <li key={feature} className="feature-tag">
                      <span className="feature-tag-icon"><CheckIcon /></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="property-actions">
              {hasChatAccess ? (
                <>
                  <button className="btn-primary" onClick={handleOpenChat} type="button">
                    Open Group Chat
                  </button>
                  {rentalStatus?.isRenter && (
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() =>
                        rentalAPI
                          .cancelRent(id)
                          .then(() =>
                            setRentalStatus((p) => ({ ...p, isRenter: false, isRented: false }))
                          )
                      }
                      disabled={renting}
                    >
                      Cancel Rental
                    </button>
                  )}
                </>
              ) : applicationStatus === 'pending' ? (
                <>
                  <button className="btn-primary btn-primary--muted" disabled type="button">
                    Application Pending
                  </button>
                  <button
                    type="button"
                    className="btn-outline btn-outline--danger"
                    onClick={handleWithdrawApplication}
                    disabled={renting}
                  >
                    {renting ? 'Withdrawing...' : 'Withdraw Application'}
                  </button>
                </>
              ) : applicationStatus === 'rejected' ? (
                <>
                  <button className="btn-primary btn-primary--danger" disabled type="button">
                    Application Rejected
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleApply}
                    disabled={renting}
                  >
                    {renting ? 'Submitting...' : 'Apply Again'}
                  </button>
                </>
              ) : isAtCapacity ? (
                <button className="btn-primary" disabled type="button">
                  Listing Full
                </button>
              ) : canApply ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleApply}
                  disabled={renting}
                >
                  {renting ? 'Submitting...' : 'Apply to Rent'}
                </button>
              ) : null}

              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  const { coordinates, location } = property;
                  const hasCoords = coordinates && coordinates.lat && coordinates.lng;
                  const url = hasCoords
                    ? `http://maps.google.com/?q=${coordinates.lat},${coordinates.lng}`
                    : `http://maps.google.com/?q=${encodeURIComponent(location)}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
              >
                View on Map
              </button>
              <button type="button" className="btn-ghost" onClick={() => navigate('/')}>
                Browse More Properties
              </button>
            </div>

            {(errorMessage || successMessage) && (
              <div className="property-action-messages">
                {errorMessage && <p className="action-error">{errorMessage}</p>}
                {successMessage && <p className="action-success">{successMessage}</p>}
              </div>
            )}
          </aside>
        </section>

        {/* Description */}
        <section className="property-section property-description-section">
          <h2 className="section-heading">Property Description</h2>
          <div className="property-description">
            {descriptionParagraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>

        {/* Videos */}
        {videos.length > 0 && (
          <section className="property-section property-videos-section">
            <h2 className="section-heading">Property Videos</h2>
            <div className="property-videos-grid">
              {videos.map((videoUrl, index) => {
                const embedUrl = getVideoEmbedUrl(videoUrl);
                const isEmbed = /youtube\.com\/embed|player\.vimeo\.com/i.test(embedUrl);
                return (
                  <div key={videoUrl + index} className="property-video-card">
                    {isEmbed ? (
                      <iframe
                        src={embedUrl}
                        title={`Property video ${index + 1}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video controls preload="metadata" src={videoUrl}>
                        <track kind="captions" />
                        Your browser does not support embedded videos.
                      </video>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Reviews */}
        <section className="reviews-section">
          <div className="reviews-display-pane">
            <h2 className="section-heading">Community Reviews ({reviews.length})</h2>
            {reviews.length === 0 ? (
              <p className="no-reviews">
                No reviews yet. Be the first to share your experience.
              </p>
            ) : (
              <div className="reviews-list">
                {reviews.map((review) => (
                  <article key={review._id} className="review-card">
                    <div className="review-card-header">
                      <div className="review-user-info">
                        <div className="user-avatar" aria-hidden="true">
                          {(review.userId?.name || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="user-name">
                            {review.userId?.name || 'Anonymous User'}
                          </h4>
                          <span className="review-date">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <StarRating rating={review.rating} />
                    </div>
                    <p className="review-text">{review.censoredReview}</p>
                    {review.wordsBlurred && (
                      <span className="ai-flag-tag">
                        Sensitive words were automatically censored
                      </span>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="reviews-form-pane">
            <h2 className="section-heading">Leave a Review</h2>
            {!hasReviewAccess ? (
              <p className="no-reviews">
                Please log in with a registered account to submit a review.
              </p>
            ) : (
              <form onSubmit={handleReviewSubmit}>
                <StarRating rating={rating} interactive onSelect={setRating} />

                {errorMessage && (
                  <div className="review-error-banner">{errorMessage}</div>
                )}
                {successMessage && (
                  <div className="review-success-banner">{successMessage}</div>
                )}

                <textarea
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  placeholder="Share your experience with this property. Inappropriate language will be automatically filtered."
                  rows="4"
                  disabled={submitting}
                />

                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Running moderation check...' : 'Submit Review'}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default PropertyDetail;
