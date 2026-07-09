import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProperties } from '../../context/PropertiesContext';
import PropertyCarousel from './PropertyCarousel';
import FeaturedProperties from './FeaturedProperties';
import './Properties.css';

const Properties = () => {
  const { properties } = useProperties();
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const [visibleCarouselIds, setVisibleCarouselIds] = useState([]);

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

  const visibleIds = useMemo(
    () => visibleCarouselIds.map((property) => String(property._id || property.id)),
    [visibleCarouselIds]
  );

  return (
    <div className="properties properties--home scroll-animate" ref={sectionRef}>
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Properties List</h2>
          <p className="section-subtitle">Explore our latest rental listings in a smoother, faster way.</p>
        </div>

        <PropertyCarousel
          properties={properties}
          onVisiblePropertiesChange={setVisibleCarouselIds}
          onViewDetails={(propertyId) => navigate(`/property/${propertyId}`)}
        />

        <div className="properties-actions">
          <Link to="/properties" className="btn-view-all-properties">
            View All Properties
          </Link>
        </div>

        <FeaturedProperties excludeIds={visibleIds} />
      </div>
    </div>
  );
};

export default Properties;

