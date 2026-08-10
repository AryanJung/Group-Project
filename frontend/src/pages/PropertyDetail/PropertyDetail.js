import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProperties } from '../../context/PropertiesContext';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, reviewAPI, rentalAPI, applicationAPI, visitAPI } from '../../services/api';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  buildPropertyFeatures,
  formatDescription,
  getPropertyImages,
  getPropertyVideos,
  getVideoEmbedUrl,
} from '../../utils/propertyHelpers';
import './PropertyDetail.css';
import ScheduleVisitModal from '../../components/ScheduleVisitModal/ScheduleVisitModal';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const PENDING_STATUSES = ['pending_verification', 'pending'];

// ── Builds a Mapbox Static Images URL (no WebGL required) ────────────────────
// Uses the Mapbox Static Tiles API to generate a server-rendered map image
// with a pin at the given center. This works in every browser/environment.
const buildStaticMapUrl = (center, zoom, pinHex, token) => {
  const [lng, lat] = center;
  const z = Math.min(Math.round(zoom), 17);
  return (
    `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
    `pin-s+${pinHex}(${lng},${lat})/` +
    `${lng},${lat},${z},0/` +
    `900x600@2x` +
    `?access_token=${token}`
  );
};

// ── Embedded Mapbox modal shown when "View on Map" is clicked ─────────────────
//
// Phase model (no WebGL crash possible):
//  'resolving' → geocode / validate coords
//  'static'    → show Mapbox Static Image (works everywhere, no WebGL)
//  'upgrading' → attempt to mount interactive GL map on top of static
//  'failed'    → both coords and geocoding failed → Google Maps link
export const MapModal = ({ coordinates, locationName, onClose }) => {
  const mapContainer  = useRef(null);
  const mapRef        = useRef(null);
  const [phase,           setPhase]           = useState('resolving');
  const [center,          setCenter]          = useState(null);
  const [zoom,            setZoom]            = useState(15);
  const [isApproximate,   setIsApproximate]   = useState(false);

  const hasExactCoords = Boolean(
    coordinates &&
    typeof coordinates.lat === 'number' &&
    typeof coordinates.lng === 'number'
  );

  // ── Step 1: resolve the location (synchronous for exact coords, async for geocode)
  useEffect(() => {
    let active = true;

    const resolve = async () => {
      if (hasExactCoords) {
        if (active) {
          setCenter([coordinates.lng, coordinates.lat]);
          setZoom(17);
          setPhase('static');
        }
        return;
      }

      if (!locationName) { if (active) setPhase('failed'); return; }

      try {
        const res  = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
          `${encodeURIComponent(locationName)}.json` +
          `?access_token=${mapboxgl.accessToken}&limit=1`
        );
        const data = await res.json();
        if (active && data.features?.length > 0) {
          const [lng, lat] = data.features[0].center;
          setCenter([lng, lat]);
          setZoom(14);
          setIsApproximate(true);
          setPhase('static');
        } else if (active) {
          setPhase('failed');
        }
      } catch {
        if (active) setPhase('failed');
      }
    };

    resolve();
    return () => { active = false; };
  }, [coordinates, locationName, hasExactCoords]);

  // ── Step 2: once static image is visible, try to upgrade to interactive GL map
  useEffect(() => {
    if (phase !== 'static' || !center || !mapContainer.current || mapRef.current) return;

    // Use the stricter check: failIfMajorPerformanceCaveat catches software
    // renderers (Mesa/LLVM) that pass the basic check but crash on init.
    if (!mapboxgl.supported({ failIfMajorPerformanceCaveat: true })) return;

    setPhase('upgrading');

    let map;
    try {
      map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom,
      });
    } catch {
      // Synchronous constructor throw (rare, but possible)
      setPhase('static');
      return;
    }

    // Mapbox fires the WebGL error as an *event*, not a throw.
    // Our try/catch above won't catch it — this listener handles it.
    map.once('error', (e) => {
      const msg = (e.error?.message || String(e.error || '')).toLowerCase();
      if (msg.includes('webgl') || msg.includes('failed to initialize')) {
        try { map.remove(); } catch {}
        mapRef.current = null;
        setPhase('static'); // silently fall back; static image already rendered
      }
    });

    mapRef.current = map;

    const pinColor  = isApproximate ? '#F59E0B' : '#FF4444';
    const popupHtml = isApproximate
      ? `<div style="font-family:sans-serif;line-height:1.4">
           <strong>${locationName}</strong><br/>
           <span style="font-size:11px;color:#92400e">
             ⚠ Approximate area — exact pin was not saved for this listing
           </span>
         </div>`
      : `<strong>${locationName || 'Property Location'}</strong>`;

    new mapboxgl.Marker({ color: pinColor })
      .setLngLat(center)
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml))
      .addTo(map)
      .togglePopup();

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
      map.flyTo({ center, zoom, speed: 1.4, curve: 1.5 });
    });

    // Click anywhere on the GL map → open Google Maps at the resolved location
    map.getCanvas().style.cursor = 'pointer';
    map.on('click', () => {
      // center is [lng, lat]; Google Maps expects lat,lng
      const gmUrl = `https://maps.google.com/?q=${center[1]},${center[0]}`;
      window.open(gmUrl, '_blank', 'noopener,noreferrer');
    });

    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }
    };
  }, [phase, center, zoom, isApproximate, locationName]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const pinHex    = isApproximate ? 'F59E0B' : 'FF4444';
  const staticUrl = center ? buildStaticMapUrl(center, zoom, pinHex, mapboxgl.accessToken) : null;

  // Always prefer the resolved `center` (covers both exact + geocoded coords).
  // center is [lng, lat] (Mapbox order) → Google Maps needs lat,lng.
  const googleMapsUrl = center
    ? `https://maps.google.com/?q=${center[1]},${center[0]}`
    : hasExactCoords
    ? `https://maps.google.com/?q=${coordinates.lat},${coordinates.lng}`
    : `https://maps.google.com/?q=${encodeURIComponent(locationName || '')}`;

  return (
    <div className="map-modal-backdrop" onClick={handleBackdropClick}>
      <div className="map-modal-content">

        {/* ── Header ── */}
        <div className="map-modal-header">
          <span className="map-modal-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
            </svg>
            {locationName || 'Property Location'}
            {isApproximate && <span className="map-approx-badge">Approximate</span>}
          </span>
          <button type="button" className="map-modal-close" onClick={onClose} aria-label="Close map">
            ✕
          </button>
        </div>

        {/* ── Resolving: spinner while geocoding ── */}
        {phase === 'resolving' && (
          <div className="map-modal-loading">
            <div className="map-loading-spinner" aria-hidden="true" />
            <p>Locating property…</p>
          </div>
        )}

        {/* ── Static image (phase = 'static') ── */}
        {(phase === 'static') && staticUrl && (
          // Entire container is a link — click anywhere on the map to open Google Maps
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="map-static-container"
            title="Open in Google Maps"
            aria-label={`Open location of ${locationName || 'this property'} in Google Maps`}
          >
            <img
              src={staticUrl}
              alt={`Map showing ${locationName || 'property location'}`}
              className="map-static-image"
            />
            {/* Hover-reveal "Open in Google Maps" pill */}
            <div className="map-open-gmaps-overlay" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              Open in Google Maps ↗
            </div>
            {isApproximate && (
              <div className="map-static-note">
                ⚠ Approximate area — owner has not pinned an exact location
              </div>
            )}
            <div className="map-static-badge">
              Static map — click to open in Google Maps
            </div>
          </a>
        )}

        {/* ── Interactive GL map (phase = 'upgrading') ── */}
        {/* Cursor is pointer; click anywhere → opens Google Maps at exact location */}
        {phase === 'upgrading' && (
          <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
            <div ref={mapContainer} className="map-modal-map" />
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="map-gmaps-btn"
              title="Open in Google Maps"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              Open in Google Maps ↗
            </a>
          </div>
        )}

        {/* ── Failed: both geocoding and coords missing ── */}
        {phase === 'failed' && (
          <div className="map-modal-error">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ marginBottom: '1rem', opacity: 0.35 }}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
            </svg>
            <p style={{ marginBottom: '1.25rem' }}>
              Could not load the map for this location.
            </p>
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="map-fallback-link">
              Open in Google Maps ↗
            </a>
          </div>
        )}

      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────


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
  const { user, hasReviewAccess } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Map modal state
  const [showMap, setShowMap] = useState(false);

  const [rentalStatus, setRentalStatus] = useState(null);
  const [renting, setRenting] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const [showScheduleModal, setShowScheduleModal] = useState(false);

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
      if (err.response?.data?.kycRequired) {
        navigate('/kyc');
        return;
      }
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

  const handleMessageOwner = async () => {
    const appId = rentalStatus?.application?._id;
    if (!appId) return;
    setMessaging(true);
    setErrorMessage('');
    try {
      const chat = await applicationAPI.getOrCreateChat(appId);
      const roomId = chat.room?._id || chat.room;
      navigate(`/chat/${roomId}?chat=${chat._id}`);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to open chat.');
    } finally {
      setMessaging(false);
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
  const roomImages = property.roomImages || [];
  const features = buildPropertyFeatures(property);
  const descriptionParagraphs = formatDescription(
    property.description || 'No property description has been added yet.'
  );
  const hasGallery = images.length > 0;
  const openLightbox = (imageSet, index) => {
    setLightboxImages(imageSet);
    setLightboxIndex(index);
  };
  const closeLightbox = () => {
    setLightboxImages([]);
    setLightboxIndex(0);
  };
  const showPreviousImage = (event) => {
    event.stopPropagation();
    setLightboxIndex((index) => (index === 0 ? lightboxImages.length - 1 : index - 1));
  };
  const showNextImage = (event) => {
    event.stopPropagation();
    setLightboxIndex((index) => (index === lightboxImages.length - 1 ? 0 : index + 1));
  };

  return (
    <>
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
                <button
                  type="button"
                  className="gallery-main-button"
                  onClick={() => openLightbox(images, activeImageIndex)}
                  aria-label={`Open ${property.title} photo ${activeImageIndex + 1}`}
                >
                  <img
                    src={images[activeImageIndex]}
                    alt={`${property.title} - view ${activeImageIndex + 1}`}
                    className="gallery-main-image"
                  />
                </button>
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
              ) : applicationStatus === 'selected' ? (
                <>
                  <div className="prospect-banner">
                    <p>You have been selected as a prospective tenant for this property. This does not mean you have rented it yet.</p>
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setShowScheduleModal(true)}
                    disabled={renting}
                  >
                    {renting ? 'Requesting…' : 'Schedule a Visit'}
                  </button>
                  <ScheduleVisitModal
                    open={showScheduleModal}
                    onClose={() => setShowScheduleModal(false)}
                    property={property}
                    applicationId={rentalStatus?.application?._id}
                    onSubmit={async ({ applicationId, proposedAt }) => {
                      setRenting(true);
                      try {
                        await visitAPI.requestVisit(applicationId, proposedAt, 'Visit requested from UI');
                        setSuccessMessage('Visit requested. The landlord will confirm soon.');
                      } catch (err) {
                        setErrorMessage(err.response?.data?.message || 'Failed to request visit');
                        throw err;
                      } finally {
                        setRenting(false);
                      }
                    }}
                  />
                </>
              ) : applicationStatus === 'pending' ? (
                <>
                  <button className="btn-primary btn-primary--muted" disabled type="button">
                    Application Pending
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={handleMessageOwner}
                    disabled={messaging}
                  >
                    {messaging ? 'Opening…' : 'Message Owner'}
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
                    className="btn-outline"
                    onClick={handleMessageOwner}
                    disabled={messaging}
                  >
                    {messaging ? 'Opening…' : 'Message Owner'}
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
                onClick={() => setShowMap(true)}
              >
                View on Map
              </button>
              <button type="button" className="btn-ghost" onClick={() => navigate('/')}>
                Browse More Properties
              </button>
            </div>

            {/* {(errorMessage || successMessage) && (
              <div className="property-action-messages">
                {errorMessage && <p className="action-error">{errorMessage}</p>}
                {successMessage && <p className="action-success">{successMessage}</p>}
              </div>
            )} */}
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

        {roomImages.length > 0 && (
          <section className="property-section property-room-images-section">
            <h2 className="section-heading">Room Images</h2>
            <div className="room-images-grid">
              {roomImages.map((room, roomIndex) => (
                <article key={`${room.label || 'room'}-${roomIndex}`} className="room-images-card">
                  <h3>{room.label || `Room ${roomIndex + 1}`}</h3>
                  <div className="room-images-card__photos">
                    {(room.images || []).map((src, imageIndex) => (
                      <button
                        key={src + imageIndex}
                        type="button"
                        onClick={() => openLightbox(room.images || [], imageIndex)}
                        aria-label={`Open ${room.label || `Room ${roomIndex + 1}`} image ${imageIndex + 1}`}
                      >
                        <img src={src} alt={`${room.label || `Room ${roomIndex + 1}`} ${imageIndex + 1}`} />
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

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

    {/* Mapbox location modal — rendered when coordinates exist and user clicks "View on Map" */}
    {showMap && (
      <MapModal
        coordinates={property?.coordinates}
        locationName={property?.location}
        onClose={() => setShowMap(false)}
      />
    )}
    {lightboxImages.length > 0 && (
      <div className="image-lightbox" onClick={closeLightbox}>
        <button type="button" className="image-lightbox__close" onClick={closeLightbox} aria-label="Close image preview">×</button>
        {lightboxImages.length > 1 && (
          <button type="button" className="image-lightbox__nav image-lightbox__nav--prev" onClick={showPreviousImage} aria-label="Previous image">‹</button>
        )}
        <img
          src={lightboxImages[lightboxIndex]}
          alt={`Full size view ${lightboxIndex + 1}`}
          onClick={(event) => event.stopPropagation()}
        />
        {lightboxImages.length > 1 && (
          <button type="button" className="image-lightbox__nav image-lightbox__nav--next" onClick={showNextImage} aria-label="Next image">›</button>
        )}
      </div>
    )}
    </>
  );
};

export default PropertyDetail;
