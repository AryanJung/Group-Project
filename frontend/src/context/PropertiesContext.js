import React, { createContext, useState, useContext, useEffect } from 'react';
import { adminAPI } from '../services/api';

const PropertiesContext = createContext();

export const useProperties = () => {
  const context = useContext(PropertiesContext);
  if (!context) {
    throw new Error('useProperties must be used within a PropertiesProvider');
  }
  return context;
};

export const PropertiesProvider = ({ children }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getPropertyId = (property) => property?.id ?? property?._id ?? null;

  // Load properties from backend on mount
  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminAPI.getAllProperties();
      setProperties(data);
    } catch (err) {
      console.error('Error loading properties from backend:', err);
      setError('Failed to load properties from backend');
      // Fallback to localStorage if backend is not available
      const savedProperties = localStorage.getItem('properties');
      if (savedProperties) {
        setProperties(JSON.parse(savedProperties));
      } else {
        // Initialize with default properties if no backend and no localStorage
        const defaultProperties = [];
        setProperties(defaultProperties);
      }
    } finally {
      setLoading(false);
    }
  };

  const addProperty = async (property) => {
    try {
      setError(null);
      // Format property data for backend
      const propertyData = {
        title: property.title,
        location: property.location,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        area: property.area,
        image: property.image,
      };
      
      const newProperty = await adminAPI.createProperty(propertyData);
      setProperties([...properties, newProperty]);
      
      // Also save to localStorage as backup
      const updatedProperties = [...properties, newProperty];
      localStorage.setItem('properties', JSON.stringify(updatedProperties));
      
      return { success: true, data: newProperty };
    } catch (err) {
      console.error('Error adding property:', err);
      setError('Failed to add property to backend');
      
      // Fallback to local state if backend fails
      const newProperty = {
        ...property,
        id: Date.now(),
      };
      setProperties([...properties, newProperty]);
      const updatedProperties = [...properties, newProperty];
      localStorage.setItem('properties', JSON.stringify(updatedProperties));
      
      return { success: false, error: err.response?.data?.message || 'Failed to add property' };
    }
  };

  const removeProperty = async (id) => {
    try {
      setError(null);
      await adminAPI.deleteProperty(id);
      const updatedProperties = properties.filter((prop) => String(getPropertyId(prop)) !== String(id));
      setProperties(updatedProperties);
      
      // Update localStorage as backup
      localStorage.setItem('properties', JSON.stringify(updatedProperties));
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting property:', err);
      setError('Failed to delete property from backend');
      
      // Fallback to local state if backend fails
      const updatedProperties = properties.filter((prop) => String(getPropertyId(prop)) !== String(id));
      setProperties(updatedProperties);
      localStorage.setItem('properties', JSON.stringify(updatedProperties));
      
      return { success: false, error: err.response?.data?.message || 'Failed to delete property' };
    }
  };

  const updateProperty = async (id, updatedProperty) => {
    try {
      setError(null);
      const propertyData = {
        title: updatedProperty.title,
        location: updatedProperty.location,
        price: updatedProperty.price,
        bedrooms: updatedProperty.bedrooms,
        bathrooms: updatedProperty.bathrooms,
        area: updatedProperty.area,
        image: updatedProperty.image,
      };
      
      const updated = await adminAPI.updateProperty(id, propertyData);
      const updatedProperties = properties.map((prop) => 
        String(getPropertyId(prop)) === String(id) ? updated : prop
      );
      setProperties(updatedProperties);
      
      // Update localStorage as backup
      localStorage.setItem('properties', JSON.stringify(updatedProperties));
      
      return { success: true, data: updated };
    } catch (err) {
      console.error('Error updating property:', err);
      setError('Failed to update property in backend');
      
      // Fallback to local state if backend fails
      const updatedProperties = properties.map((prop) => 
        String(getPropertyId(prop)) === String(id) ? { ...updatedProperty, id } : prop
      );
      setProperties(updatedProperties);
      localStorage.setItem('properties', JSON.stringify(updatedProperties));
      
      return { success: false, error: err.response?.data?.message || 'Failed to update property' };
    }
  };

  const value = {
    properties,
    addProperty,
    removeProperty,
    updateProperty,
    loadProperties,
    loading,
    error,
  };

  return (
    <PropertiesContext.Provider value={value}>
      {children}
    </PropertiesContext.Provider>
  );
};

