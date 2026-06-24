import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PropertiesProvider } from './context/PropertiesContext';
import Header from './components/Header/Header';
import Home from './pages/Home/Home';
import Admin from './pages/Admin/Admin';
import PropertyDetail from './pages/PropertyDetail/PropertyDetail';
import Chat from './pages/Chat/Chat';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <PropertiesProvider>
        <Router>
          <div className="App">
            <Header />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/property/:id" element={<PropertyDetail />} />
              <Route path="/chat/:id" element={<Chat />} />
            </Routes>
          </div>
        </Router>
      </PropertiesProvider>
    </AuthProvider>
  );
}

export default App;

