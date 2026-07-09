import React from 'react';
import { buildPropertyFeatures, getPropertyImages } from '../../utils/propertyHelpers';
import { isRecentlyAdded } from '../../utils/propertyDiscovery';

const PropertyCard = ({
  property,
  onViewDetails,
  badge,
  badgeTone = 'default',
  variant = 'default',
  className = '',
}) => {
  const [primaryImage] = getPropertyImages(property);
  const features = buildPropertyFeatures(property).slice(0, 3);
  const propertyId = property?._id || property?.id;
  const cardBadge = badge || (isRecentlyAdded(property) ? 'New' : '');

  return (
    <article className={`property-card property-card--${variant} ${className}`.trim()}>
      <div className={`property-image ${primaryImage ? 'property-image--photo' : ''}`}>
        {cardBadge ? (
          <span className={`property-badge property-badge--${badgeTone}`}>
            {cardBadge}
          </span>
        ) : null}
        {primaryImage ? (
          <img src={primaryImage} alt={property?.title || 'Property'} loading="lazy" decoding="async" />
        ) : (
          <span className="property-card-icon" aria-hidden="true">
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
              <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </div>

      <div className="property-content">
        <div className="property-heading-row">
          <div>
            <h3 className="property-title">{property?.title}</h3>
            <p className="property-location">{property?.location}</p>
          </div>
          {features.length > 0 && <span className="property-meta-pill">{features[0]}</span>}
        </div>

        <div className="property-details">
          <span>{property?.bedrooms ?? 0} Bed</span>
          <span>{property?.bathrooms ?? 0} Bath</span>
          <span>{property?.area || 'N/A'}</span>
        </div>

        <div className="property-footer">
          <span className="property-price">{property?.price}</span>
          <button
            className="btn-view"
            onClick={() => onViewDetails?.(propertyId)}
            type="button"
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  );
};

export default PropertyCard;