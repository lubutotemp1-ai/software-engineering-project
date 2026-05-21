import React, { useState } from 'react';
import {
  Mail,
  Lock,
  ChevronRight,
  Sparkles,
  AlertCircle,
  CheckCircle,
  User,
  Stethoscope,
  Settings,
} from 'lucide-react';
import hospitalSvg from '../images/hospital-svgrepo-com (1).svg';

export default function ForgotPasswordPage({ onBack, onSuccess }) {
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState('patient');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState(null);

  const userTypes = [
    { id: 'patient', label: 'Patient', icon: User },
    { id: 'doctor', label: 'Doctor', icon: Stethoscope },
    { id: 'admin', label: 'Admin', icon: Settings },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userType }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to process request');
        return;
      }

      setSuccess(data.message);
      // For demo purposes, store the token if provided
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }
    } catch (err) {
      setError('Failed to connect to server. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEmail('');
    setResetToken(null);
    setSuccess('');
  };

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
          <p>Reset your password securely</p>
        </div>

        <div className="auth-form">
          <h2>Forgot Password?</h2>
          <p className="subtitle">Enter your email and account type to receive a password reset link</p>

          {!resetToken ? (
            <>
              <div className="role-tabs">
                {userTypes.map(type => (
                  <button
                    key={type.id}
                    className={`role-tab ${userType === type.id ? 'active' : ''}`}
                    onClick={() => {
                      setUserType(type.id);
                      setError('');
                      setSuccess('');
                    }}
                  >
                    <type.icon size={16} strokeWidth={2} />
                    {type.label}
                  </button>
                ))}
              </div>

              {error && (
                <div className="alert alert-error">
                  <AlertCircle size={14} strokeWidth={2} />
                  {error}
                </div>
              )}

              {success && (
                <div className="alert alert-success">
                  <CheckCircle size={14} strokeWidth={2} />
                  {success}
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

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-sm" /> Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              <div
                className="alert alert-info"
                style={{ fontSize: '12px', marginTop: 16 }}
              >
                <Sparkles size={14} strokeWidth={2} />
                For demo purposes, the reset token will be displayed after submission.
                Copy it and use it on the password reset page.
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  background: 'var(--success-light)',
                  border: '1px solid var(--success-dark)',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <CheckCircle size={32} strokeWidth={1.5} style={{ color: 'var(--success-dark)', marginBottom: 8 }} />
                <h3 style={{ marginBottom: 8, color: 'var(--success-dark)' }}>Reset Link Sent!</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Check your email for the password reset link.
                </p>
              </div>

              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  textAlign: 'left',
                }}
              >
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 8 }}>
                  <strong>Reset Token (for demo):</strong>
                </p>
                <code
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    background: 'var(--background)',
                    padding: 8,
                    borderRadius: 4,
                    wordBreak: 'break-all',
                    color: 'var(--text-secondary)',
                    fontFamily: 'monospace',
                    overflow: 'auto',
                    maxHeight: 80,
                  }}
                >
                  {resetToken}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(resetToken);
                    alert('Token copied to clipboard!');
                  }}
                  style={{
                    marginTop: 8,
                    padding: '4px 8px',
                    fontSize: '11px',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  Copy Token
                </button>
              </div>

              <button
                onClick={() => onSuccess?.(resetToken, email, userType)}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}
              >
                Go to Reset Password
              </button>

              <button
                onClick={handleReset}
                className="btn btn-secondary btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Request New Link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
