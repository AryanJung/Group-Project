import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProperties } from '../../context/PropertiesContext';
import { adminAPI } from '../../services/api';
import './PropertyDetail.css';

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { properties } = useProperties();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProperty = async () => {
      try {
        setLoading(true);
        // Try to get from backend first
        try {
          const data = await adminAPI.getPropertyById(id);
          setProperty(data);
        } catch (err) {
          // Fallback to context properties
          const foundProperty = properties.find(p => p.id === parseInt(id) || p._id === id);
          if (foundProperty) {
            setProperty(foundProperty);
          } else {
            console.error('Property not found');
          }
        }
      } catch (err) {
        console.error('Error loading property:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [id, properties]);

  const handleTalkToBroker = () => {
    navigate(`/chat/${id}`);
  };

  if (loading) {
    return (
      <div className="property-detail">
        <div className="container">
          <div className="loading">Loading property details...</div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="property-detail">
        <div className="container">
          <div className="error">Property not found</div>
          <button onClick={() => navigate('/')} className="btn-back">Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="property-detail">
      <div className="container">
        <button onClick={() => navigate('/')} className="btn-back">← Back to Properties</button>
        
        <div className="property-detail-content">
          <div className="property-detail-image">
            <span className="property-emoji-large">{property.image}</span>
          </div>
          
          <div className="property-detail-info">
            <h1 className="property-detail-title">{property.title}</h1>
            <p className="property-detail-location">📍 {property.location}</p>
            
            <div className="property-detail-specs">
              <div className="spec-item">
                <span className="spec-icon">🛏️</span>
                <span className="spec-label">Bedrooms</span>
                <span className="spec-value">{property.bedrooms}</span>
              </div>
              <div className="spec-item">
                <span className="spec-icon">🚿</span>
                <span className="spec-label">Bathrooms</span>
                <span className="spec-value">{property.bathrooms}</span>
              </div>
              <div className="spec-item">
                <span className="spec-icon">📐</span>
                <span className="spec-label">Area</span>
                <span className="spec-value">{property.area}</span>
              </div>
            </div>

            <div className="property-detail-price-section">
              <h2 className="property-detail-price">{property.price}</h2>
            </div>

            <div className="property-detail-actions">
              <button className="btn-talk-to-broker" onClick={handleTalkToBroker}>
                💬 Talk to Broker
              </button>
             <button 
  className="btn-location" 
  onClick={() => {
    const { coordinates, location } = property;
    
    const hasCoords = coordinates && coordinates.lat && coordinates.lng;

    const url = hasCoords
      ? `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
      
    window.open(url, '_blank', 'noopener,noreferrer');
  }}
>
  View exact location
</button>
              <button className="btn-view" onClick={() => navigate('/')}>
                View More Properties
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;

