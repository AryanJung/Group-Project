import React from 'react';
import './About.css';

const About = () => {
  return (
    <div className="about">
      <div className="container">
        <div className="about-content">
          <div className="about-text">
            <h2 className="section-title">About Us</h2>
            <p className="about-description">
              We are a leading rental property platform dedicated to helping you
              find the perfect home. With years of experience in the real estate
              industry, we understand that finding the right rental property can
              be challenging.
            </p>
            <p className="about-description">
              Our mission is to simplify the rental process by providing a
              user-friendly platform that connects tenants with quality
              properties. We work with verified landlords and property managers
              to ensure you have access to the best rental options in your
              desired location.
            </p>

          </div>
          <div className="about-image">
            <div className="about-placeholder">
              <span>🏘️</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;

