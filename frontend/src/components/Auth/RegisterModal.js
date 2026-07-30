import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './AuthModal.css';

const OtpVerification = ({ otpSessionId, maskedEmail, onBack, onSuccess }) => {
  const { verifyOtp, resendOtp } = useAuth();
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setResendMessage('');
    setLoading(true);

    const result = await verifyOtp({ otpSessionId, otp });
    setLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      setErrors({ otp: result.error || 'Verification failed.' });
    }
  };

  const handleResend = async () => {
    setErrors({});
    setResendMessage('');
    setResendLoading(true);

    const result = await resendOtp({ otpSessionId });
    setResendLoading(false);

    if (result.success) {
      setResendMessage(result.message || 'A new code has been sent.');
    } else {
      setErrors({ form: result.error || 'Unable to resend code.' });
    }
  };

  return (
    <>
      <h2>Verify your email</h2>
      <p className="otp-subtitle">
        Enter the 6-digit code sent to <strong>{maskedEmail}</strong>
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="otp">Verification code</label>
          <input
            type="text"
            id="otp"
            name="otp"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
              setErrors((prev) => ({ ...prev, otp: '', form: '' }));
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            required
          />
          {errors.otp && <p className="field-error">{errors.otp}</p>}
        </div>
        {errors.form && <p className="field-error">{errors.form}</p>}
        {resendMessage && <p className="otp-success">{resendMessage}</p>}
        <button type="submit" className="btn-submit" disabled={loading || otp.length !== 6}>
          {loading ? 'Verifying...' : 'Verify & Complete Registration'}
        </button>
      </form>
      <p className="switch-auth">
        Didn't receive a code?{' '}
        <button
          type="button"
          onClick={handleResend}
          className="link-button"
          disabled={resendLoading}
        >
          {resendLoading ? 'Sending...' : 'Resend code'}
        </button>
      </p>
      <p className="switch-auth">
        <button type="button" onClick={onBack} className="link-button">
          Back to registration
        </button>
      </p>
    </>
  );
};

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
  const [otpStep, setOtpStep] = useState(null);

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
      if (result.requiresOtp) {
        setOtpStep({
          otpSessionId: result.otpSessionId,
          maskedEmail: result.email,
        });
      } else {
        onClose();
      }
    } else {
      const message = result.error || 'Registration failed.';
      const lower = message.toLowerCase();
      const field = ['name', 'email', 'password'].find((key) => lower.includes(key)) || 'email';
      setErrors({ [field]: message });
    }
  };

  const handleBackToRegister = () => {
    setOtpStep(null);
    setErrors({});
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-split" onClick={(e) => e.stopPropagation()}>
        <div className="auth-visual" aria-hidden="true" />
        <div className="auth-form-pane">
          <button className="modal-close" onClick={onClose}>
            x
          </button>
          {otpStep ? (
            <OtpVerification
              otpSessionId={otpStep.otpSessionId}
              maskedEmail={otpStep.maskedEmail}
              onBack={handleBackToRegister}
              onSuccess={onClose}
            />
          ) : (
            <>
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
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? 'Sending code...' : 'Register'}
                </button>
              </form>
              <p className="switch-auth">
                Already have an account?{' '}
                <button onClick={onSwitchToLogin} className="link-button">
                  Login here
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;
