import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const initializeDefaultUsers = () => {
  const usersKey = 'app_users';
  const initializedKey = 'users_initialized';

  if (localStorage.getItem(initializedKey)) {
    return;
  }

  const defaultUsers = [
    {
      _id: 'admin-1',
      name: 'Admin User',
      email: 'admin@rental.com',
      password: 'admin123',
      role: 'admin',
    },
    {
      _id: 'user-1',
      name: 'John Doe',
      email: 'john.doe@test.com',
      password: 'test123',
      role: 'renter',
    },
    {
      _id: 'user-2',
      name: 'Jane Smith',
      email: 'jane.smith@test.com',
      password: 'test123',
      role: 'renter',
    },
    {
      _id: 'user-3',
      name: 'Bob Wilson',
      email: 'bob.wilson@test.com',
      password: 'test123',
      role: 'renter',
    },
  ];

  localStorage.setItem(usersKey, JSON.stringify(defaultUsers));
  localStorage.setItem(initializedKey, 'true');
};

const getStoredUsers = () => {
  const users = localStorage.getItem('app_users');
  return users ? JSON.parse(users) : [];
};

const addStoredUser = (userData) => {
  const users = getStoredUsers();
  const role =
    userData.role === 'owner' || userData.role === 'admin'
      ? userData.role
      : 'renter';
  const newUser = {
    _id: `user-${Date.now()}`,
    name: userData.name,
    email: userData.email,
    password: userData.password,
    role,
  };
  users.push(newUser);
  localStorage.setItem('app_users', JSON.stringify(users));
  return newUser;
};

const buildSessionUser = (backendUser, fallbackRole = 'renter') => {
  const storedUser = getStoredUsers().find(
    (stored) => stored.email === backendUser.email
  );

  return {
    ...backendUser,
    token: backendUser.token,
    role: backendUser.role || storedUser?.role || fallbackRole,
    kycVerified: backendUser.kycVerified || false,
    suspended: backendUser.suspended || false,
    banned: backendUser.banned || false,
    suspendedUntil: backendUser.suspendedUntil || null,
  };
};

const persistSession = (setUser, sessionUser) => {
  setUser(sessionUser);
  localStorage.setItem('user', JSON.stringify(sessionUser));
  // Notify verified users on login once
  try {
    if (sessionUser?.kycVerified) {
      // only show once per session
      if (!sessionStorage.getItem('kycVerifiedNotified')) {
        alert('Your identity has been verified. You now have owner features if applicable.');
        sessionStorage.setItem('kycVerifiedNotified', 'true');
      }
    }
  } catch (e) {
    // ignore
  }
  return sessionUser;
};

const obtainBackendSession = async ({ name, email, password, role = 'renter' }) => {
  try {
    const loginData = await authAPI.login({ email, password });
    return buildSessionUser(loginData, role);
  } catch (loginError) {
    const status = loginError.response?.status;

    if (status && status !== 401) {
      throw loginError;
    }

    try {
      await authAPI.register({ name, email, password });
    } catch (registerError) {
      const registerStatus = registerError.response?.status;
      if (registerStatus && registerStatus !== 400) {
        throw registerError;
      }
    }

    const loginData = await authAPI.login({ email, password });
    return buildSessionUser(loginData, role);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeDefaultUsers();

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);

      if (parsedUser?.token) {
        setUser(parsedUser);
      } else {
        localStorage.removeItem('user');
      }
    }

    setLoading(false);
  }, []);

  const register = async (userData) => {
    try {
      const normalizedUserData = {
        ...userData,
        role:
          userData.role === 'owner' || userData.role === 'admin'
            ? userData.role
            : 'renter',
      };

      const sessionUser = await obtainBackendSession(normalizedUserData);
      const storedUsers = getStoredUsers();
      const userExists = storedUsers.find(
        (stored) => stored.email === normalizedUserData.email
      );

      if (!userExists) {
        addStoredUser(normalizedUserData);
      }

      persistSession(setUser, sessionUser);
      return { success: true, data: sessionUser };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          'Registration failed. Ensure the backend server is running.',
      };
    }
  };

  const login = async (credentials) => {
    try {
      const storedUser = getStoredUsers().find(
        (stored) => stored.email === credentials.email
      );

      const sessionUser = await obtainBackendSession({
        name: storedUser?.name || credentials.email.split('@')[0],
        email: credentials.email,
        password: credentials.password,
        role: storedUser?.role || 'renter',
      });

      persistSession(setUser, sessionUser);
      return { success: true, data: sessionUser };
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
    hasReviewAccess: Boolean(user?.token),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
