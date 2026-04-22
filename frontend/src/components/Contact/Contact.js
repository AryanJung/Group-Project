import React, { useRef, useEffect } from 'react';
import './Contact.css';

const Contact = () => {
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

  return (
    <div className="contact scroll-animate" ref={sectionRef}>
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Get In Touch</h2>
          <p className="section-subtitle">
            Have questions? We'd love to hear from you. Send us a message!
          </p>
        </div>
        <div className="contact-content">
          <div className="contact-info">
            <div className="info-card">
              <div className="info-icon">📍</div>
              <h3>Address</h3>
              <p>Balkumari, Lalitpur</p>
            </div>
            <div className="info-card">
              <div className="info-icon">📞</div>
              <h3>Phone</h3>
              <p>(+977) 98xxxxxxxx</p>
            </div>
            <div className="info-card">
              <div className="info-icon">✉️</div>
              <h3>Email</h3>
              <p>support@rentalproperties.com</p>
            </div>
            <div className="info-card">
              <div className="info-icon">🕐</div>
              <h3>Working Hours</h3>
              <p>Mon - Fri: 9:00 AM - 6:00 PM<br/>Sat: 10:00 AM - 4:00 PM</p>
            </div>
          </div>
          <form className="contact-form">
            <div className="form-group">
              <input 
                type="text" 
                placeholder="Your Name" 
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <input 
                type="email" 
                placeholder="Your Email" 
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <input 
                type="text" 
                placeholder="Subject" 
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <textarea 
                placeholder="Your Message" 
                className="form-textarea"
                rows="6"
                required
              />
            </div>
            <button type="submit" className="btn-submit">Send Message</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;

