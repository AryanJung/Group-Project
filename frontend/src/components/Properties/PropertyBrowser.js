import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProperties } from '../../context/PropertiesContext';
import PropertyCard from '../PropertyCard/PropertyCard';
import {
  extractNumericPrice,
  filterPropertiesByBrowseFilters,
  sortPropertiesByNewest,
} from '../../utils/propertyDiscovery';
import './Properties.css';

const defaultFilters = {
  searchQuery: '',
  locationFilter: '',
  minPrice: '',
  maxPrice: '',
  bedroomsFilter: '',
  bathroomsFilter: '',
};

const sortProperties = (properties, sortBy) => {
  const sorted = [...properties];

  switch (sortBy) {
    case 'price-asc':
      return sorted.sort(
        (left, right) =>
          extractNumericPrice(left.price ?? left.rawPrice) -
          extractNumericPrice(right.price ?? right.rawPrice)
      );
    case 'price-desc':
      return sorted.sort(
        (left, right) =>
          extractNumericPrice(right.price ?? right.rawPrice) -
          extractNumericPrice(left.price ?? left.rawPrice)
      );
    case 'newest':
    default:
      return sortPropertiesByNewest(sorted);
  }
};

const PropertyBrowser = () => {
  const { properties, latestSearchFilters, setLatestSearchFilters } = useProperties();
  const navigate = useNavigate();
  const sectionRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState(latestSearchFilters?.searchQuery || '');
  const [locationFilter, setLocationFilter] = useState(latestSearchFilters?.locationFilter || '');
  const [minPrice, setMinPrice] = useState(latestSearchFilters?.minPrice || '');
  const [maxPrice, setMaxPrice] = useState(latestSearchFilters?.maxPrice || '');
  const [bedroomsFilter, setBedroomsFilter] = useState(latestSearchFilters?.bedroomsFilter || '');
  const [bathroomsFilter, setBathroomsFilter] = useState(latestSearchFilters?.bathroomsFilter || '');
  const [sortBy, setSortBy] = useState(latestSearchFilters?.sortBy || 'newest');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setLatestSearchFilters?.({
      searchQuery,
      locationFilter,
      minPrice,
      maxPrice,
      bedroomsFilter,
      bathroomsFilter,
      sortBy,
    });
  }, [bathroomsFilter, bedroomsFilter, locationFilter, maxPrice, minPrice, searchQuery, setLatestSearchFilters, sortBy]);

  const uniqueLocations = useMemo(() => {
    const locations = properties.map((property) => property.location).filter(Boolean);
    return [...new Set(locations)].sort();
  }, [properties]);

  const filteredProperties = useMemo(() => {
    const baseFilters = {
      searchQuery,
      locationFilter,
      minPrice,
      maxPrice,
      bedroomsFilter,
      bathroomsFilter,
    };

    return sortProperties(filterPropertiesByBrowseFilters(properties, baseFilters), sortBy);
  }, [bathroomsFilter, bedroomsFilter, locationFilter, maxPrice, minPrice, properties, searchQuery, sortBy]);

  const hasActiveFilters =
    searchQuery || locationFilter || minPrice || maxPrice || bedroomsFilter || bathroomsFilter || sortBy !== 'newest';

  const handleClearFilters = () => {
    setSearchQuery(defaultFilters.searchQuery);
    setLocationFilter(defaultFilters.locationFilter);
    setMinPrice(defaultFilters.minPrice);
    setMaxPrice(defaultFilters.maxPrice);
    setBedroomsFilter(defaultFilters.bedroomsFilter);
    setBathroomsFilter(defaultFilters.bathroomsFilter);
    setSortBy('newest');
  };

  const handleViewDetails = (propertyId) => {
    navigate(`/property/${propertyId}`);
  };

  return (
    <div className="properties properties--page scroll-animate" ref={sectionRef}>
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">All Properties</h2>
          <p className="section-subtitle">Search, filter, and browse every available rental listing.</p>
        </div>

        <div className="search-filter-bar search-filter-bar--page">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search by title, location, price, or features..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <button className="btn-toggle-filters" onClick={() => setShowFilters((value) => !value)} type="button">
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {showFilters && (
          <div className="filter-panel">
            <div className="filter-row">
              <div className="filter-group">
                <label htmlFor="location-filter">Location</label>
                <select
                  id="location-filter"
                  className="filter-select"
                  value={locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value)}
                >
                  <option value="">All Locations</option>
                  {uniqueLocations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="sort-by">Sort By</label>
                <select id="sort-by" className="filter-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="bedrooms-filter">Bedrooms</label>
                <select
                  id="bedrooms-filter"
                  className="filter-select"
                  value={bedroomsFilter}
                  onChange={(event) => setBedroomsFilter(event.target.value)}
                >
                  <option value="">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="5">5+</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="bathrooms-filter">Bathrooms</label>
                <select
                  id="bathrooms-filter"
                  className="filter-select"
                  value={bathroomsFilter}
                  onChange={(event) => setBathroomsFilter(event.target.value)}
                >
                  <option value="">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                </select>
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-group price-group">
                <label htmlFor="min-price">Min Price (Rs.)</label>
                <input
                  id="min-price"
                  type="number"
                  className="filter-input"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                  min="0"
                />
              </div>

              <div className="filter-group price-group">
                <label htmlFor="max-price">Max Price (Rs.)</label>
                <input
                  id="max-price"
                  type="number"
                  className="filter-input"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  min="0"
                />
              </div>

              {hasActiveFilters && (
                <button className="btn-clear-filters" onClick={handleClearFilters} type="button">
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        )}

        <div className="results-info">
          <p>
            Showing <strong>{filteredProperties.length}</strong> of <strong>{properties.length}</strong> properties
          </p>
        </div>

        {filteredProperties.length > 0 ? (
          <div className="properties-grid">
            {filteredProperties.map((property) => (
              <PropertyCard
                key={property._id || property.id}
                property={property}
                onViewDetails={handleViewDetails}
                variant="grid"
              />
            ))}
          </div>
        ) : (
          <div className="no-results">
            <p>No properties found matching your criteria.</p>
            {hasActiveFilters && (
              <button className="btn-clear-filters" onClick={handleClearFilters} type="button">
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyBrowser;