import React, { useRef, useEffect } from 'react';
import './Features.css';

const iconProps = {
  width: 32,
  height: 32,
  viewBox: '0 0 24 24',
  fill: 'none',
  'aria-hidden': 'true',
};

const Features = () => {
  const sectionRef = useRef(null);

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

  const features = [
    {
      icon: (
        <svg {...iconProps}>
          <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
      title: 'Easy Search',
      description: 'Find properties quickly with our advanced search filters',
    },
    {
      icon: (
        <svg {...iconProps}>
          <path d="M7 8V6a2 2 0 012-2h6a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="4" y="8" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 13h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
      title: 'Verified Listings',
      description: 'All properties are verified and checked for authenticity',
    },
    {
      icon: (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
          <path d="M14.5 9.5A3 3 0 0012 8.5c-1.4 0-2.5.7-2.5 1.7 0 2.4 5 1.2 5 3.6 0 1-1.1 1.7-2.5 1.7a3.5 3.5 0 01-3-1.5M12 6.8v10.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      title: 'Best Prices',
      description: 'Competitive rental prices with no hidden fees',
    },
    {
      icon: (
        <svg {...iconProps}>
          <rect x="7" y="3" width="10" height="18" rx="2.4" stroke="currentColor" strokeWidth="1.8" />
          <path d="M10.5 17.5h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
      title: 'Mobile Friendly',
      description: 'Browse and book properties on any device',
    },
    {
      icon: (
        <svg {...iconProps}>
          <path d="M7 10V8a5 5 0 0110 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 14v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
      title: 'Secure Process',
      description: 'Safe and secure rental process with legal protection',
    },
    {
      icon: (
        <svg {...iconProps}>
          <path d="M12 4l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L12 4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      ),
      title: '24/7 Support',
      description: 'Round-the-clock customer support for all your needs',
    },
  ];

  return (
    <div className="features scroll-animate" ref={sectionRef}>
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Why Choose Us</h2>
          <p className="section-subtitle">
            We make finding your perfect rental property simple and stress-free
          </p>
        </div>
        <div className="features-grid">
          {features.map((feature) => (
            <div key={feature.title} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features;
