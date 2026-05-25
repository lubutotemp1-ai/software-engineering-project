import React, { useState } from 'react';
import axios from 'axios';
import { Lock, Mail, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [step, setStep] = useState(1); // 1: Email, 2: Code & New Password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!email) {
      setError('Email is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/auth/request-password-reset', { email });
      setMessage(res.data.message || 'Password reset code sent to your email.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!code || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/auth/reset-password', {
        email,
        code,
        newPassword,
      });
      setMessage(res.data.message || 'Password reset successfully! You can now login.');
      setTimeout(() => {
        setStep(1);
        setEmail('');
        setCode('');
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '20px' }}>
      <div className="page-header" style={{ marginBottom: 32, textAlign: 'center' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Lock size={24} strokeWidth={1.5} />
          Reset Password
        </h1>
        <p>Recover your account access</p>
      </div>

      <div className="card" style={{ padding: 24, background: '#ffffff' }}>
        {step === 1 ? (
          // Step 1: Request Reset
          <form onSubmit={handleRequestReset}>
            <div style={{ marginBottom: 24 }}>
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#4B5563',
                }} />
                <input
                  type="email"
                  className="form-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: 40 }}
                />
              </div>
              <p style={{ fontSize: 12, color: '#4B5563', marginTop: 8 }}>
                We'll send a reset code to this email address.
              </p>
            </div>

            {message && (
              <div style={{
                marginBottom: 16,
                padding: '12px 16px',
                borderRadius: 8,
                background: '#ECFDF5',
                border: '1px solid #D1FAE5',
                color: '#065F46',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <CheckCircle size={18} strokeWidth={1.5} />
                <span>{message}</span>
              </div>
            )}

            {error && (
              <div style={{
                marginBottom: 16,
                padding: '12px 16px',
                borderRadius: 8,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <AlertCircle size={18} strokeWidth={1.5} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          // Step 2: Verify Code & Reset Password
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: 20 }}>
              <label className="form-label">Reset Code</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter the code sent to your email"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#4B5563',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="form-label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#4B5563',
                  }}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {message && (
              <div style={{
                marginBottom: 16,
                padding: '12px 16px',
                borderRadius: 8,
                background: '#ECFDF5',
                border: '1px solid #D1FAE5',
                color: '#065F46',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <CheckCircle size={18} strokeWidth={1.5} />
                <span>{message}</span>
              </div>
            )}

            {error && (
              <div style={{
                marginBottom: 16,
                padding: '12px 16px',
                borderRadius: 8,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <AlertCircle size={18} strokeWidth={1.5} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: 12 }}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setCode('');
                setNewPassword('');
                setConfirmPassword('');
                setMessage('');
                setError('');
              }}
              className="btn btn-outline"
              style={{ width: '100%' }}
            >
              Back to Email
            </button>
          </form>
        )}
      </div>

      <div style={{
        marginTop: 24,
        padding: 16,
        borderRadius: 8,
        background: '#EFF6FF',
        border: '1px solid #DBEAFE',
        color: '#0C4A6E',
        fontSize: 13,
        textAlign: 'center',
      }}>
        Remember your password? <a href="/login" style={{ color: '#2563EB', fontWeight: 600 }}>Sign in here</a>
      </div>
    </div>
  );
}
