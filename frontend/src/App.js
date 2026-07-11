import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PropertiesProvider } from './context/PropertiesContext';
import Header from './components/Header/Header';
import { useAuth } from './context/AuthContext';
import { appealsAPI } from './services/api';
import Home from './pages/Home/Home';
import PropertiesPage from './pages/Properties/PropertiesPage';
import Admin from './pages/Admin/Admin';
import PropertyDetail from './pages/PropertyDetail/PropertyDetail';
import Chat from './pages/Chat/Chat';
import MyChats from './pages/MyChats/MyChats';
import KycSubmit from './pages/Kyc/KycSubmit';
import SuperAdmin from './pages/SuperAdmin/SuperAdmin';
import ChatbotWidget from './components/ChatbotWidget/ChatbotWidget';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <PropertiesProvider>
        <Router>
          <AppContent />
        </Router>
      </PropertiesProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [appealPending, setAppealPending] = React.useState(false);
  const [appealLoading, setAppealLoading] = React.useState(false);

  const loadAppealStatus = React.useCallback(async () => {
    if (!user?.token) {
      setAppealPending(false);
      return;
    }

    try {
      setAppealLoading(true);
      const appeals = await appealsAPI.getMine();
      setAppealPending(appeals.length > 0);
    } catch (err) {
      console.error('Failed to load appeal status', err);
      setAppealPending(false);
    } finally {
      setAppealLoading(false);
    }
  }, [user?.token]);

  React.useEffect(() => {
    if (user?.suspended) {
      loadAppealStatus();
    } else {
      setAppealPending(false);
    }
  }, [user?.suspended, loadAppealStatus]);

  const sendAppeal = async () => {
    if (appealPending) return;

    const message = prompt('Enter appeal message (explain why your account should be reinstated)');
    if (message == null) return;
    try {
      await appealsAPI.create(message || 'Appeal submitted via app');
      setAppealPending(true);
      alert('Appeal submitted. Super-admins will review it.');
    } catch (err) {
      alert('Failed to send appeal: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  const isSuspended = Boolean(
    user?.suspended &&
      (!user.suspendedUntil || new Date(user.suspendedUntil) > new Date())
  );

  if (user?.banned) {
    return (
      <div className="App">
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 12, maxWidth: 560, width: '100%', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
            <h2 style={{ marginBottom: 20, fontSize: '1.7rem', color: '#111827' }}>Account Permanently Banned</h2>
            <p style={{ marginBottom: 20, color: '#4b5563' }}>Your account has been permanently banned.</p>
            {user?.suspensionReason && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: 6 }}>Reason</div>
                <div style={{ color: '#111827', fontSize: '0.96rem' }}>{user.suspensionReason}</div>
              </div>
            )}
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '12px 18px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Logout
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className="App">
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 12, maxWidth: 560, width: '100%', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
            <h2 style={{ marginBottom: 20, fontSize: '1.7rem', color: '#111827' }}>Account Temporarily Suspended</h2>
            <p style={{ marginBottom: 20, color: '#4b5563' }}>Your account has been suspended until the date and time shown below.</p>
            {user?.suspendedUntil && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: 6 }}>Suspension expires</div>
                <div style={{ color: '#111827', fontSize: '1rem', fontWeight: 600 }}>
                  {new Date(user.suspendedUntil).toLocaleString()}
                </div>
              </div>
            )}
            {user?.suspensionReason && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: 6 }}>Reason</div>
                <div style={{ color: '#111827', fontSize: '0.96rem' }}>{user.suspensionReason}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={sendAppeal}
                disabled={appealPending || appealLoading}
                style={{
                  flex: 1,
                  minWidth: 120,
                  padding: '12px 18px',
                  background: appealPending ? '#e2e8f0' : '#4f46e5',
                  color: appealPending ? '#64748b' : '#fff',
                  border: 'none',
                  borderRadius: 10,
                  cursor: appealPending ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                }}
              >
                {appealPending ? 'Appeal Pending' : 'Submit Appeal'}
              </button>
              <button
                onClick={handleLogout}
                style={{
                  flex: 1,
                  minWidth: 120,
                  padding: '12px 18px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="App">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/properties" element={<PropertiesPage />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/chat/:id" element={<Chat />} />
        <Route path="/my-chats" element={<MyChats />} />
        <Route path="/kyc" element={<KycSubmit />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
      </Routes>
      <ChatbotWidget />
    </div>
  );
}

export default App;
