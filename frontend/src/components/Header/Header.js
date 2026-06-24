import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoginModal from '../Auth/LoginModal';
import RegisterModal from '../Auth/RegisterModal';
import './Header.css';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const canManageHouses =
    user?.role === 'admin' || user?.role === 'owner';

  const handleNavClick = (e, sectionId) => {
    e.preventDefault();
    
    // If we're not on the home page, navigate to home first
    if (location.pathname !== '/') {
      navigate('/');
      // Wait for navigation to complete, then scroll
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      // If we're already on home page, just scroll
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleLoginClick = () => {
    setShowLogin(true);
    setShowRegister(false);
  };

  const handleRegisterClick = () => {
    setShowRegister(true);
    setShowLogin(false);
  };

  const handleCloseModals = () => {
    setShowLogin(false);
    setShowRegister(false);
  };

  const switchToRegister = () => {
    setShowLogin(false);
    setShowRegister(true);
  };

  const switchToLogin = () => {
    setShowRegister(false);
    setShowLogin(true);
  };

  return (
    <>
      <header className="header">
        <div className="header-container">
          <div className="logo">
            <h1>RentalProperties</h1>
          </div>
          <nav className="nav">
            <a 
              href="#home" 
              className="nav-link" 
              onClick={(e) => handleNavClick(e, 'home')}
            >
              Home
            </a>
            <a 
              href="#properties" 
              className="nav-link" 
              onClick={(e) => handleNavClick(e, 'properties')}
            >
              Properties
            </a>
            <a 
              href="#features" 
              className="nav-link" 
              onClick={(e) => handleNavClick(e, 'features')}
            >
              Features
            </a>
            <a 
              href="#about" 
              className="nav-link" 
              onClick={(e) => handleNavClick(e, 'about')}
            >
              About
            </a>
            <a 
              href="#contact" 
              className="nav-link" 
              onClick={(e) => handleNavClick(e, 'contact')}
            >
              Contact
            </a>
            {isAuthenticated && canManageHouses && (
              <Link to="/admin" className="nav-link">Admin</Link>
            )}
          </nav>
          <div className="auth-buttons">
            {isAuthenticated ? (
              <div className="user-menu">
                <span className="user-name">Welcome, {user?.name}</span>
                <button onClick={logout} className="btn-logout">
                  Logout
                </button>
              </div>
            ) : (
              <>
                <button onClick={handleLoginClick} className="btn-login">
                  Login
                </button>
                <button onClick={handleRegisterClick} className="btn-register">
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      {showLogin && (
        <LoginModal
          onClose={handleCloseModals}
          onSwitchToRegister={switchToRegister}
        />
      )}
      {showRegister && (
        <RegisterModal
          onClose={handleCloseModals}
          onSwitchToLogin={switchToLogin}
        />
      )}
    </>
  );
};

export default Header;

