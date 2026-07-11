import React, { useEffect } from 'react';
import './Hero.css';

const Hero = () => {
  useEffect(() => {
    const logo = document.querySelector('.hero-image .hero-placeholder span');
    if (!logo) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          logo.classList.add('in-view');
        } else {
          logo.classList.remove('in-view');
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(logo);

    const rect = logo.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      logo.classList.add('in-view');
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="hero">
      <div className="hero-content">
        <h1 className="hero-title">Find Your <span className="highlight">Perfect Rental</span> Property</h1>
        <p className="hero-subtitle">
          Discover amazing homes and apartments in prime locations. Your dream rental is just a click away.
        </p>
        <div className="hero-buttons">
          <a href="#properties" className="btn-primary">
            Explore Now
          </a>
        </div>
      </div>

      {/* <div className="hero-image">
        <div className="hero-placeholder">
          <span aria-hidden="true">
            <svg width="92" height="92" viewBox="0 0 24 24" fill="none">
              <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div> */}
    </div>
  );
};

export default Hero;
