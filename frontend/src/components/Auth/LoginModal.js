import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './AuthModal.css';

const LoginModal = ({ onClose, onSwitchToRegister }) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrors((prev) => ({ ...prev, [e.target.name]: '', form: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const result = await login(formData);
    setLoading(false);

    if (result.success) {
      onClose();
    } else {
      const message = result.error || 'Login failed.';
      const lower = message.toLowerCase();
      const field = lower.includes('password') ? 'password' : 'email';
      setErrors({ [field]: message });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-split" onClick={(e) => e.stopPropagation()}>
        <div className="auth-visual" aria-hidden="true" />
        <div className="auth-form-pane">
          <button className="modal-close" onClick={onClose}>
            x
          </button>
          <h2>Login</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email or username</label>
              <input
                type="text"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              {errors.password && <p className="field-error">{errors.password}</p>}
            </div>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <p className="switch-auth">
            Don't have an account?{' '}
            <button onClick={onSwitchToRegister} className="link-button">
              Register here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;

