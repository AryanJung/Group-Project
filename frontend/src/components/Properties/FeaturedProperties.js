import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProperties } from '../../context/PropertiesContext';
import PropertyCard from '../PropertyCard/PropertyCard';
import {
  hasBrowseFilters,
  isRecentlyAdded,
  rankFeaturedProperties,
} from '../../utils/propertyDiscovery';

const FeaturedProperties = ({ excludeIds = [] }) => {
  const navigate = useNavigate();
  const { properties, latestSearchFilters } = useProperties();
  const [expanded, setExpanded] = useState(false);

  const featuredProperties = useMemo(
    () => rankFeaturedProperties(properties, latestSearchFilters || {}, excludeIds),
    [excludeIds, latestSearchFilters, properties]
  );

  const showSearchRecommendations = hasBrowseFilters(latestSearchFilters || {});
  const displayedProperties = expanded ? featuredProperties : featuredProperties.slice(0, 4);
  const hasMore = featuredProperties.length > displayedProperties.length;

  if (featuredProperties.length === 0) {
    return null;
  }

  return (
    <section className="featured-properties" aria-labelledby="featured-properties-title">
      <div className="section-header section-header--compact">
        <div className="section-kicker">
          <span className="section-kicker-pill">
            {showSearchRecommendations ? 'Based on your search' : 'Fresh picks'}
          </span>
        </div>
        <h2 id="featured-properties-title" className="section-title">
          Featured Properties
        </h2>
        <p className="section-subtitle">
          {showSearchRecommendations
            ? 'Matches ranked from your latest search filters, with recent listings surfaced first.'
            : 'New and recently added properties highlighted for quick discovery.'}
        </p>
      </div>

      <div className="featured-properties-grid">
        {displayedProperties.map((property, index) => {
          const badge = showSearchRecommendations
            ? index === 0
              ? 'Recommended'
              : isRecentlyAdded(property)
                ? 'New'
                : 'Featured'
            : isRecentlyAdded(property)
              ? 'New'
              : index === 0
                ? 'Featured'
                : 'Recommended';

          return (
            <PropertyCard
              key={property?._id || property?.id || index}
              property={property}
              onViewDetails={(propertyId) => navigate(`/property/${propertyId}`)}
              badge={badge}
              badgeTone={index === 0 ? 'featured' : 'default'}
              variant="featured"
            />
          );
        })}
      </div>

      {hasMore && (
        <div className="featured-properties-actions">
          <button
            type="button"
            className="btn-featured-more"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Show Less' : 'View More'}
          </button>
        </div>
      )}
    </section>
  );
};

export default FeaturedProperties;