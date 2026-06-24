import React, { useEffect } from 'react';
import './Hero.css';

const Hero = () => {
useEffect(() => {
  const logo = document.querySelector(
    '.hero-image .hero-placeholder span'
  );

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

  // 🔥 force initial check
  const rect = logo.getBoundingClientRect();
  const inView =
    rect.top < window.innerHeight && rect.bottom > 0;

  if (inView) {
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

      <div className="hero-image">
        <div className="hero-placeholder">
          <span>🏠</span>
        </div>
      </div>
    </div>
  );
};

export default Hero;
