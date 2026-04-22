import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProperties } from '../../context/PropertiesContext';
import './Properties.css';

const Properties = () => {
  const { properties } = useProperties();
  const navigate = useNavigate();
  const sectionRef = useRef(null);

  // Scroll animation setup
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

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedroomsFilter, setBedroomsFilter] = useState('');
  const [bathroomsFilter, setBathroomsFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Extract numeric price from price string (e.g., "Rs. 25,000/month" -> 25000)
  const extractPrice = (priceString) => {
    if (!priceString) return 0;
    const match = priceString.match(/[\d,]+/);
    if (match) {
      return parseInt(match[0].replace(/,/g, ''), 10);
    }
    return 0;
  };

  // Get unique locations from properties
  const uniqueLocations = useMemo(() => {
    const locations = properties.map(p => p.location).filter(Boolean);
    return [...new Set(locations)].sort();
  }, [properties]);

  // Filter and search properties
  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      // Search filter (searches in title, location, and price)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          property.title?.toLowerCase().includes(query) ||
          property.location?.toLowerCase().includes(query) ||
          property.price?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Location filter
      if (locationFilter && property.location !== locationFilter) {
        return false;
      }

      // Price filter
      const propertyPrice = extractPrice(property.price);
      if (minPrice && propertyPrice < parseInt(minPrice, 10)) {
        return false;
      }
      if (maxPrice && propertyPrice > parseInt(maxPrice, 10)) {
        return false;
      }

      // Bedrooms filter (X or more)
      if (bedroomsFilter && property.bedrooms < parseInt(bedroomsFilter, 10)) {
        return false;
      }

      // Bathrooms filter (X or more)
      if (bathroomsFilter && property.bathrooms < parseInt(bathroomsFilter, 10)) {
        return false;
      }

      return true;
    });
  }, [properties, searchQuery, locationFilter, minPrice, maxPrice, bedroomsFilter, bathroomsFilter]);

  // Get price range for slider
  const priceRange = useMemo(() => {
    if (properties.length === 0) return { min: 0, max: 100000 };
    const prices = properties.map(p => extractPrice(p.price)).filter(p => p > 0);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [properties]);

  const handleViewDetails = (propertyId) => {
    navigate(`/property/${propertyId}`);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setLocationFilter('');
    setMinPrice('');
    setMaxPrice('');
    setBedroomsFilter('');
    setBathroomsFilter('');
  };

  const hasActiveFilters = locationFilter || minPrice || maxPrice || bedroomsFilter || bathroomsFilter || searchQuery;

  return (
    <div className="properties scroll-animate" ref={sectionRef}>
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Featured Properties</h2>
          <p className="section-subtitle">
            Explore our handpicked selection of premium rental properties
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="search-filter-bar">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Search by title, location, or price..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className="btn-toggle-filters"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="filter-panel">
            <div className="filter-row">
              <div className="filter-group">
                <label htmlFor="location-filter">Location</label>
                <select
                  id="location-filter"
                  className="filter-select"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
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
                <label htmlFor="bedrooms-filter">Bedrooms</label>
                <select
                  id="bedrooms-filter"
                  className="filter-select"
                  value={bedroomsFilter}
                  onChange={(e) => setBedroomsFilter(e.target.value)}
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
                  onChange={(e) => setBathroomsFilter(e.target.value)}
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
                  onChange={(e) => setMinPrice(e.target.value)}
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
                  onChange={(e) => setMaxPrice(e.target.value)}
                  min="0"
                />
              </div>

              {hasActiveFilters && (
                <button className="btn-clear-filters" onClick={handleClearFilters}>
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="results-info">
          <p>
            Showing <strong>{filteredProperties.length}</strong> of <strong>{properties.length}</strong> properties
          </p>
        </div>

        {/* Properties Grid */}
        {filteredProperties.length > 0 ? (
          <div className="properties-grid">
            {filteredProperties.map((property) => (
              <div key={property.id || property._id} className="property-card">
                <div className="property-image">
                  <span className="property-emoji">{property.image}</span>
                </div>
                <div className="property-content">
                  <h3 className="property-title">{property.title}</h3>
                  <p className="property-location">📍 {property.location}</p>
                  <div className="property-details">
                    <span>🛏️ {property.bedrooms} Bed</span>
                    <span>🚿 {property.bathrooms} Bath</span>
                    <span>📐 {property.area}</span>
                  </div>
                  <div className="property-footer">
                    <span className="property-price">{property.price}</span>
                    <button
                      className="btn-view"
                      onClick={() => handleViewDetails(property.id || property._id)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-results">
            <p>No properties found matching your criteria.</p>
            {hasActiveFilters && (
              <button className="btn-clear-filters" onClick={handleClearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Properties;

