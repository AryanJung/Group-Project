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
  const [latestSearchFilters, setLatestSearchFilters] = useState(null);

  // Load all public listings on mount (browse page)
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
      setError('Failed to load properties. Is the backend running?');
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PropertiesContext.Provider
      value={{
        properties,
        loadProperties,
        loading,
        error,
        latestSearchFilters,
        setLatestSearchFilters,
      }}
    >
      {children}
    </PropertiesContext.Provider>
  );
};
