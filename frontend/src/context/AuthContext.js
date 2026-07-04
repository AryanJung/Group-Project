import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.token) setUser(parsed);
        else localStorage.removeItem('user');
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const persist = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  /**
   * Register a new user.
   * @param {{ name: string, email: string, password: string, role?: string }} userData
   */
  const register = async (userData) => {
    try {
      const data = await authAPI.register(userData);
      persist(data);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          'Registration failed. Ensure the backend server is running.',
      };
    }
  };

  /**
   * Log in an existing user.
   * @param {{ email: string, password: string }} credentials
   */
  const login = async (credentials) => {
    try {
      const data = await authAPI.login(credentials);
      persist(data);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          'Login failed. Ensure the backend server is running.',
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const value = {
    user,
    register,
    login,
    logout,
    loading,
    isAuthenticated: Boolean(user?.token),
    // Role helpers — derived directly from the backend-issued role field
    isOwner: user?.role === 'owner' || user?.role === 'admin' || user?.role === 'superadmin',
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    isSuperAdmin: user?.role === 'superadmin',
    hasReviewAccess: Boolean(user?.token),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
