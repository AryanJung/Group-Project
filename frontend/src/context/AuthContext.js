import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
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

  const persist = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const refreshUser = useCallback(async () => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return null;

    try {
      const freshUser = await authAPI.getMe();
      const mergedUser = {
        ...JSON.parse(storedUser),
        ...freshUser,
        token: freshUser.token || JSON.parse(storedUser).token,
      };
      persist(mergedUser);
      return mergedUser;
    } catch (error) {
      console.error('Failed to refresh user session', error);
      return null;
    }
  }, []);

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

  useEffect(() => {
    if (!user?.token) return undefined;

    const refreshOnFocus = () => {
      refreshUser();
    };

    const intervalId = window.setInterval(() => {
      refreshUser();
    }, 10000);

    window.addEventListener('focus', refreshOnFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [refreshUser, user?.token]);

  /**
   * Step 1 Register — Sends user details and triggers OTP email
   * @param {{ name: string, email: string, password: string, role?: string }} userData
   */
  const register = async (userData) => {
    try {
      const data = await authAPI.register(userData);

      if (data.requiresOtp) {
        return {
          success: true,
          requiresOtp: true,
          otpSessionId: data.otpSessionId,
          email: data.email,
          message: data.message,
        };
      }

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
   * Direct Login (No OTP required)
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

  /**
   * Step 2 Register — Complete registration after OTP verification
   * @param {{ otpSessionId: string, otp: string }} payload
   */
  const verifyOtp = async ({ otpSessionId, otp }) => {
    try {
      const data = await authAPI.verifyRegisterOtp({ otpSessionId, otp });
      persist(data);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          'Verification failed. Please try again.',
      };
    }
  };

  /**
   * Resend Registration OTP
   * @param {{ otpSessionId: string }} payload
   */
  const resendOtp = async ({ otpSessionId }) => {
    try {
      const data = await authAPI.resendRegisterOtp({ otpSessionId });
      return {
        success: true,
        message: data.message,
        email: data.email,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          'Unable to resend verification code.',
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
    verifyOtp,
    resendOtp,
    logout,
    refreshUser,
    loading,
    isAuthenticated: Boolean(user?.token),
    isOwner: user?.role === 'owner' || user?.role === 'admin' || user?.role === 'superadmin',
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    isSuperAdmin: user?.role === 'superadmin',
    hasReviewAccess: Boolean(user?.token),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
