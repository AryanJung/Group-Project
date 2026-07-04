import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationAPI } from '../../services/api';
import LoginModal from '../Auth/LoginModal';
import RegisterModal from '../Auth/RegisterModal';
import './Header.css';

// Returns the navigation destination for a notification
const getNotificationDestination = (notification) => {
  const roomId = notification.room?._id || notification.room;
  switch (notification.type) {
    case 'new_application':
      return roomId ? `/admin?tab=applications&room=${roomId}` : '/admin';
    case 'application_accepted':
      return roomId ? `/property/${roomId}` : '/';
    case 'application_rejected':
      return roomId ? `/property/${roomId}` : '/';
    default:
      return '/';
  }
};

const typeLabel = {
  new_application: '📋 New Application',
  application_accepted: '✅ Application Accepted',
  application_rejected: '❌ Application Rejected',
};

// ─── Notification Bell ────────────────────────────────────────────────────────

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const intervalRef = useRef(null);

  const pollUnread = useCallback(async () => {
    if (!user?.token) return;
    try {
      const count = await notificationAPI.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // silently ignore
    }
  }, [user]);

  useEffect(() => {
    pollUnread();
    intervalRef.current = setInterval(pollUnread, 10_000);
    return () => clearInterval(intervalRef.current);
  }, [pollUnread]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    notificationAPI
      .getAll()
      .then((data) => setNotifications(data))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClickNotification = async (notification) => {
    if (!notification.read) {
      try {
        await notificationAPI.markAsRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch { /* ignore */ }
    }
    setOpen(false);
    navigate(getNotificationDestination(notification));
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  return (
    <div className="notif-wrapper" ref={dropdownRef}>
      <button
        className="btn-icon-header btn-notif-icon"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
          <path d="M5.85 3.5a.75.75 0 00-1.117-1 9.719 9.719 0 00-2.348 4.876.75.75 0 001.479.248A8.219 8.219 0 015.85 3.5zM19.267 2.5a.75.75 0 10-1.118 1 8.22 8.22 0 011.987 4.124.75.75 0 001.48-.248A9.72 9.72 0 0019.266 2.5z" />
          <path fillRule="evenodd" d="M12 2.25A6.75 6.75 0 005.25 9v.75a8.217 8.217 0 01-2.119 5.52.75.75 0 00.298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 107.48 0 24.583 24.583 0 004.83-1.244.75.75 0 00.298-1.205 8.217 8.217 0 01-2.118-5.52V9A6.75 6.75 0 0012 2.25zM9.75 18c0-.034 0-.067.002-.1a25.05 25.05 0 004.496 0l.002.1a2.25 2.25 0 11-4.5 0z" clipRule="evenodd" />
        </svg>
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <span className="notif-dropdown-title">Notifications</span>
            {unreadCount > 0 && (
              <button className="notif-mark-all" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-list">
            {loading ? (
              <div className="notif-empty">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">No notifications yet.</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n._id}
                  className={`notif-item ${!n.read ? 'notif-item--unread' : ''}`}
                  onClick={() => handleClickNotification(n)}
                >
                  <div className="notif-item-type">{typeLabel[n.type] || '🔔 Notification'}</div>
                  <div className="notif-item-message">{n.message}</div>
                  <div className="notif-item-meta">
                    {n.room?.title && <span className="notif-room">{n.room.title}</span>}
                    <span className="notif-time">
                      {new Date(n.createdAt).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {!n.read && <span className="notif-dot" aria-hidden="true" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Header ───────────────────────────────────────────────────────────────────

const Header = () => {
  const { user, logout, isAuthenticated, isOwner, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const handleNavClick = (e, sectionId) => {
    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLoginClick = () => { setShowLogin(true); setShowRegister(false); };
  const handleRegisterClick = () => { setShowRegister(true); setShowLogin(false); };
  const handleCloseModals = () => { setShowLogin(false); setShowRegister(false); };
  const switchToRegister = () => { setShowLogin(false); setShowRegister(true); };
  const switchToLogin = () => { setShowRegister(false); setShowLogin(true); };

  return (
    <>
      <header className="header">
        <div className="header-container">
          <div className="logo">
            <h1>RentalProperties</h1>
          </div>
          <nav className="nav">
            <a href="#home" className="nav-link" onClick={(e) => handleNavClick(e, 'home')}>Home</a>
            <a href="#properties" className="nav-link" onClick={(e) => handleNavClick(e, 'properties')}>Properties</a>
            <a href="#features" className="nav-link" onClick={(e) => handleNavClick(e, 'features')}>Features</a>
            <a href="#about" className="nav-link" onClick={(e) => handleNavClick(e, 'about')}>About</a>
            <a href="#contact" className="nav-link" onClick={(e) => handleNavClick(e, 'contact')}>Contact</a>

            {/* KYC link — show if authenticated but not yet verified or admin */}
            {isAuthenticated && !isAdmin && !user?.kycVerified && (
              <Link to="/kyc" className="nav-link">KYC</Link>
            )}
            {/* Admin dashboard — owners + admins */}
            {isAuthenticated && isOwner && (
              <Link to="/admin" className="nav-link">Admin</Link>
            )}
            {/* Super Admin panel */}
            {isAuthenticated && isSuperAdmin && (
              <Link to="/super-admin" className="nav-link">SuperAdmin</Link>
            )}
          </nav>

          <div className="auth-buttons">
            {isAuthenticated ? (
              <div className="user-menu">
                <span className="user-name">Welcome, {user?.name}</span>

                {/* Chat icon */}
                <button
                  className="btn-icon-header btn-chat-icon"
                  onClick={() => navigate('/my-chats')}
                  title="My Chats"
                  aria-label="My Chats"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
                    <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                    <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
                  </svg>
                </button>

                {/* Notification bell */}
                <NotificationBell />

                <button onClick={logout} className="btn-logout">Logout</button>
              </div>
            ) : (
              <>
                <button onClick={handleLoginClick} className="btn-login">Login</button>
                <button onClick={handleRegisterClick} className="btn-register">Register</button>
              </>
            )}
          </div>
        </div>
      </header>

      {showLogin && <LoginModal onClose={handleCloseModals} onSwitchToRegister={switchToRegister} />}
      {showRegister && <RegisterModal onClose={handleCloseModals} onSwitchToLogin={switchToLogin} />}
    </>
  );
};

export default Header;
