import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropertyCard from '../PropertyCard/PropertyCard';

const getVisibleCount = () => {
  if (typeof window === 'undefined') return 4;
  if (window.innerWidth >= 1320) return 4;
  if (window.innerWidth >= 1024) return 3;
  if (window.innerWidth >= 720) return 2;
  return 1;
};

const PropertyCarousel = ({ properties = [], onVisiblePropertiesChange, onViewDetails }) => {
  const [visibleCount, setVisibleCount] = useState(getVisibleCount);
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef(null);
  const cardRefs = useRef([]);

  useEffect(() => {
    const handleResize = () => setVisibleCount(getVisibleCount());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxStartIndex = Math.max(properties.length - visibleCount, 0);

  useEffect(() => {
    if (activeIndex > maxStartIndex) {
      setActiveIndex(maxStartIndex);
    }
  }, [activeIndex, maxStartIndex]);

  const visibleProperties = useMemo(() => {
    if (properties.length === 0) return [];

    const current = properties.slice(activeIndex, activeIndex + visibleCount);
    if (current.length === visibleCount) return current;

    return [...current, ...properties.slice(0, visibleCount - current.length)];
  }, [activeIndex, properties, visibleCount]);

  useEffect(() => {
    onVisiblePropertiesChange?.(visibleProperties);
  }, [onVisiblePropertiesChange, visibleProperties]);

  useEffect(() => {
    if (properties.length <= visibleCount) return undefined;

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex >= maxStartIndex ? 0 : currentIndex + 1));
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, [maxStartIndex, properties.length, visibleCount]);

  useEffect(() => {
    const track = trackRef.current;
    const targetCard = cardRefs.current[activeIndex];

    if (!track || !targetCard) return;

    const nextScrollLeft = targetCard.offsetLeft - track.offsetLeft;

    track.scrollTo({
      left: Math.max(0, nextScrollLeft),
      behavior: 'smooth',
    });
  }, [activeIndex]);

  const handleNext = () => {
    setActiveIndex((currentIndex) => (currentIndex >= maxStartIndex ? 0 : currentIndex + 1));
  };

  const handlePrev = () => {
    setActiveIndex((currentIndex) => (currentIndex <= 0 ? maxStartIndex : currentIndex - 1));
  };

  if (properties.length === 0) {
    return (
      <div className="properties-carousel properties-carousel--empty" aria-live="polite">
        <div className="properties-empty-state">
          <p>No properties are available yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="properties-carousel">
      <div className="carousel-controls">
        <button
          type="button"
          className="carousel-arrow carousel-arrow--prev"
          onClick={handlePrev}
          aria-label="Previous properties"
          disabled={properties.length <= visibleCount}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="properties-carousel-viewport" style={{ '--carousel-visible-count': visibleCount }}>
          <div className="properties-carousel-track" ref={trackRef} aria-label="Property carousel">
            {properties.map((property, index) => (
              <div
                key={property?._id || property?.id || index}
                className="properties-carousel-item"
                ref={(element) => {
                  cardRefs.current[index] = element;
                }}
              >
                <PropertyCard
                  property={property}
                  onViewDetails={onViewDetails}
                  variant="carousel"
                  badgeTone={index === activeIndex ? 'featured' : 'default'}
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="carousel-arrow carousel-arrow--next"
          onClick={handleNext}
          aria-label="Next properties"
          disabled={properties.length <= visibleCount}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="carousel-indicator" aria-hidden="true">
        <span>
          {Math.min(activeIndex + 1, properties.length)}-{Math.min(activeIndex + visibleCount, properties.length)} of {properties.length}
        </span>
      </div>
    </div>
  );
};

export default PropertyCarousel;