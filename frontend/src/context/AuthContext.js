import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within a PropertiesProvider');
  }
  return context;
};

// Default users stored in localStorage
const initializeDefaultUsers = () => {
  const usersKey = 'app_users';
  const initializedKey = 'users_initialized';
  
  // Check if users have already been initialized
  if (localStorage.getItem(initializedKey)) {
    return;
  }

  // Default users
  const defaultUsers = [
    {
      _id: 'admin-1',
      name: 'Admin User',
      email: 'admin@rental.com',
      password: 'admin123',
      role: 'admin'
    },
    {
      _id: 'user-1',
      name: 'John Doe',
      email: 'john.doe@test.com',
      password: 'test123',
      role: 'renter'
    },
    {
      _id: 'user-2',
      name: 'Jane Smith',
      email: 'jane.smith@test.com',
      password: 'test123',
      role: 'renter'
    },
    {
      _id: 'user-3',
      name: 'Bob Wilson',
      email: 'bob.wilson@test.com',
      password: 'test123',
      role: 'renter'
    }
  ];

  // Store users in localStorage
  localStorage.setItem(usersKey, JSON.stringify(defaultUsers));
  localStorage.setItem(initializedKey, 'true');
};

// Get users from localStorage
const getStoredUsers = () => {
  const usersKey = 'app_users';
  const users = localStorage.getItem(usersKey);
  return users ? JSON.parse(users) : [];
};

// Add new user to localStorage
const addStoredUser = (userData) => {
  const users = getStoredUsers();
  const role = userData.role === 'owner' || userData.role === 'admin'
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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize default users on first load
    initializeDefaultUsers();
    
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const register = async (userData) => {
    try {
      // Check if user already exists in localStorage
      const storedUsers = getStoredUsers();
      const userExists = storedUsers.find(u => u.email === userData.email);
      
      if (userExists) {
        return {
          success: false,
          error: 'User already exists',
        };
      }

      const normalizedUserData = {
        ...userData,
        role: userData.role === 'owner' || userData.role === 'admin'
          ? userData.role
          : 'renter',
      };

      // Try backend first, fallback to localStorage
      let data;
      try {
        data = await authAPI.register(normalizedUserData);
      } catch (error) {
        // Backend failed, use localStorage
        data = addStoredUser(normalizedUserData);
      }

      // Remove password from user object before storing
      const { password, ...userWithoutPassword } = data;
      const finalUser = {
        ...userWithoutPassword,
        role: userWithoutPassword.role || normalizedUserData.role,
      };
      setUser(finalUser);
      localStorage.setItem('user', JSON.stringify(finalUser));
      return { success: true, data: finalUser };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed',
      };
    }
  };

  const login = async (credentials) => {
    try {
      // Check localStorage first
      const storedUsers = getStoredUsers();
      const foundUser = storedUsers.find(
        u => u.email === credentials.email && u.password === credentials.password
      );

      if (foundUser) {
        // Remove password from user object
        const { password, ...userWithoutPassword } = foundUser;
        setUser(userWithoutPassword);
        localStorage.setItem('user', JSON.stringify(userWithoutPassword));
        return { success: true, data: userWithoutPassword };
      }

      // If not found in localStorage, try backend
      try {
        const data = await authAPI.login(credentials);
        const storedUser = getStoredUsers().find(
          (u) => u.email === credentials.email
        );
        const finalUser = {
          ...data,
          role: data.role || storedUser?.role || 'renter',
        };
        setUser(finalUser);
        localStorage.setItem('user', JSON.stringify(finalUser));
        return { success: true, data: finalUser };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || 'Invalid email or password',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Login failed',
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
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
