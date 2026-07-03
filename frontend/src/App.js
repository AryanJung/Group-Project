import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PropertiesProvider } from './context/PropertiesContext';
import Header from './components/Header/Header';
import { useAuth } from './context/AuthContext';
import { appealsAPI } from './services/api';
import Home from './pages/Home/Home';
import Admin from './pages/Admin/Admin';
import KycSubmit from './pages/Kyc/KycSubmit';
import SuperAdmin from './pages/SuperAdmin/SuperAdmin';
import PropertyDetail from './pages/PropertyDetail/PropertyDetail';
import Chat from './pages/Chat/Chat';
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
  const { user } = useAuth();

  const sendAppeal = async () => {
    const message = prompt('Enter appeal message (explain why your account should be reinstated)');
    try {
      await appealsAPI.create(message || 'Appeal submitted via app');
      alert('Appeal submitted. Super-admins will review it.');
    } catch (err) {
      alert('Failed to send appeal: ' + (err?.response?.data?.message || err.message));
    }
  };

  if (user?.banned) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div style={{ background: '#222', padding: 24, borderRadius: 8, maxWidth: 700 }}>
         <p>Account Banned</p> 
          <p>Your account has been banned. You cannot perform actions.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {/*<button onClick={sendAppeal} style={{ padding: '8px 12px' }}>Appeal</button> */}
            <button onClick={() => { localStorage.removeItem('user'); window.location.href = '/'; }} style={{ padding: '8px 12px' }}>Logout</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/kyc" element={<KycSubmit />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
        <Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/chat/:id" element={<Chat />} />
      </Routes>
    </div>
  );
}

export default App;

