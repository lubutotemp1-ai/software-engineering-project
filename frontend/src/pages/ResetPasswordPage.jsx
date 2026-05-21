import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  Sparkles,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import hospitalSvg from '../images/hospital-svgrepo-com (1).svg';

export default function ResetPasswordPage({ onBack, initialData }) {
  const [email, setEmail] = useState(initialData?.email || '');
  const [token, setToken] = useState(initialData?.token || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!token) {
      setError('Reset token is required');
      return false;
    }
    if (!password || !confirmPassword) {
      setError('Both password fields are required');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token,
          newPassword: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to reset password');
        return;
      }

      setSuccess(data.message);
      // Reset form
      setPassword('');
      setConfirmPassword('');
      setToken('');
      setEmail('');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        onBack?.();
      }, 2000);
    } catch (err) {
      setError('Failed to connect to server. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  return (
    <div className="auth-page">
      <button
        onClick={onBack}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          background: '#000000',
          border: 'none',
          color: 'white',
          padding: '8px 12px',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backdropFilter: 'blur(10px)',
          zIndex: 10,
        }}
      >
        ← Back
      </button>

      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-logo">
            <img src={hospitalSvg} alt="Hospital" style={{ width: 36, height: 36 }} />
          </div>
          <h1>Health Easy Portal</h1>
          <p>Create your new password</p>
        </div>

        <div className="auth-form">
          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  background: 'var(--success-light)',
                  border: '1px solid var(--success-dark)',
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <CheckCircle
                  size={40}
                  strokeWidth={1.5}
                  style={{ color: 'var(--success-dark)', marginBottom: 12 }}
                />
                <h3 style={{ marginBottom: 8, color: 'var(--success-dark)' }}>
                  Password Reset Successfully!
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 16 }}>
                  {success}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Redirecting to login page...
                </p>
              </div>
            </div>
          ) : (
            <>
              <h2>Reset Your Password</h2>
              <p className="subtitle">Enter your reset token and create a new password</p>

              {error && (
                <div className="alert alert-error">
                  <AlertCircle size={14} strokeWidth={2} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="input-with-icon">
                    <span className="input-icon">
                      <Mail size={16} strokeWidth={1.5} />
                    </span>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reset Token</label>
                  <textarea
                    className="form-input"
                    placeholder="Paste your reset token here"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    rows="3"
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      resize: 'vertical',
                      padding: '8px',
                    }}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div className="input-with-icon has-right">
                    <span className="input-icon">
                      <Lock size={16} strokeWidth={1.5} />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Create a strong password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="input-icon-right"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff size={16} strokeWidth={1.5} />
                      ) : (
                        <Eye size={16} strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div className="input-with-icon has-right">
                    <span className="input-icon">
                      <Lock size={16} strokeWidth={1.5} />
                    </span>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="input-icon-right"
                      onClick={() => setShowConfirm(!showConfirm)}
                      disabled={loading}
                    >
                      {showConfirm ? (
                        <EyeOff size={16} strokeWidth={1.5} />
                      ) : (
                        <Eye size={16} strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                  {passwordsMatch && (
                    <p style={{ fontSize: '11px', color: 'var(--success-dark)', marginTop: 4 }}>
                      ✓ Passwords match
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-sm" /> Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>

              <div
                className="alert alert-info"
                style={{ fontSize: '12px', marginTop: 16 }}
              >
                <Sparkles size={14} strokeWidth={2} />
                Password must be at least 6 characters long.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
