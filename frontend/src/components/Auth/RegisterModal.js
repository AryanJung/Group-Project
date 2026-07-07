import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './AuthModal.css';

const RegisterModal = ({ onClose, onSwitchToLogin }) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'renter',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const roleOptions = [
    { value: 'renter', label: 'Renter' },
    { value: 'guest', label: 'Guest' },
  ];

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

    const result = await register(formData);
    setLoading(false);

    if (result.success) {
      onClose();
    } else {
      const message = result.error || 'Registration failed.';
      const lower = message.toLowerCase();
      const field = ['name', 'email', 'password'].find((key) => lower.includes(key)) || 'email';
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
          <h2>Register</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
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
            <div className="form-group">
              <label htmlFor="role">Register as</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.role && <p className="field-error">{errors.role}</p>}
            </div>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
          <p className="switch-auth">
            Already have an account?{' '}
            <button onClick={onSwitchToLogin} className="link-button">
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;

