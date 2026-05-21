import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
} from 'lucide-react';

export default function ChangePasswordPage({ user, onBack, token }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!currentPassword) {
      setError('Current password is required');
      return false;
    }
    if (!newPassword || !confirmPassword) {
      setError('New password fields cannot be empty');
      return false;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return false;
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
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
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to change password');
        return;
      }

      setSuccess(data.message);
      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Redirect after 2 seconds
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

  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        padding: '24px',
        maxWidth: 500,
        margin: '0 auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-primary)',
          }}
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <h2 style={{ margin: 0 }}>Change Password</h2>
      </div>

      {success ? (
        <div
          style={{
            background: 'var(--success-light)',
            border: '1px solid var(--success-dark)',
            borderRadius: 12,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <CheckCircle
            size={40}
            strokeWidth={1.5}
            style={{ color: 'var(--success-dark)', marginBottom: 12 }}
          />
          <h3 style={{ marginBottom: 8, color: 'var(--success-dark)' }}>
            Password Changed Successfully!
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 0 }}>
            {success}
          </p>
        </div>
      ) : (
        <>
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={14} strokeWidth={2} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <div className="input-with-icon has-right">
                <span className="input-icon">
                  <Lock size={16} strokeWidth={1.5} />
                </span>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowCurrent(!showCurrent)}
                  disabled={loading}
                >
                  {showCurrent ? (
                    <EyeOff size={16} strokeWidth={1.5} />
                  ) : (
                    <Eye size={16} strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-with-icon has-right">
                <span className="input-icon">
                  <Lock size={16} strokeWidth={1.5} />
                </span>
                <input
                  type={showNew ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Create a new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowNew(!showNew)}
                  disabled={loading}
                >
                  {showNew ? (
                    <EyeOff size={16} strokeWidth={1.5} />
                  ) : (
                    <Eye size={16} strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div className="input-with-icon has-right">
                <span className="input-icon">
                  <Lock size={16} strokeWidth={1.5} />
                </span>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Confirm your new password"
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
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-sm" /> Updating...
                </>
              ) : (
                'Update Password'
              )}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="btn btn-secondary btn-lg"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading}
            >
              Cancel
            </button>
          </form>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 12,
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            <strong>Password Requirements:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 16 }}>
              <li>At least 6 characters long</li>
              <li>Different from current password</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
