import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Stethoscope,
  Settings,
  Calendar,
  Bot,
  MessageSquare,
  Activity,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  Sparkles,
  Shield,
  Clock,
  FileText
} from 'lucide-react';
import hospitalSvg from '../images/hospital-svgrepo-com (1).svg';

const COUNTRY_CODES = [
  { code: '+1', name: 'US' },
  { code: '+44', name: 'UK' },
  { code: '+260', name: 'ZM' },
  { code: '+27', name: 'ZA' },
  { code: '+234', name: 'NG' },
  { code: '+254', name: 'KE' },
  { code: '+233', name: 'GH' },
  { code: '+91', name: 'IN' },
  { code: '+86', name: 'CN' },
  { code: '+49', name: 'DE' },
  { code: '+33', name: 'FR' },
  { code: '+61', name: 'AU' },
];

export default function LoginPage({ onSwitch, onBack, onForgotPassword }) {
  const { login, doctorLogin } = useAuth();
  const [tab, setTab] = useState('patient');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (tab === 'doctor') await doctorLogin(form.email, form.password);
      else await login(form.email, form.password);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  const tabs = [
    { id: 'patient', label: 'Patient', icon: User },
    { id: 'doctor', label: 'Doctor', icon: Stethoscope },
    { id: 'admin', label: 'Admin', icon: Settings },
  ];

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
          <p>Your all-in-one health management platform</p>
        </div>

        <div className="auth-form">
          <h2>Welcome back</h2>
          <p className="subtitle">Sign in to continue to your dashboard</p>

          <div className="role-tabs">
            {tabs.map(t => (
              <button key={t.id} className={`role-tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => { setTab(t.id); setError(''); setForm({ email: '', password: '' }); }}>
                <t.icon size={16} strokeWidth={2} />
                {t.label}
              </button>
            ))}
          </div>
          

          {error && <div className="alert alert-error">
            <ChevronRight size={14} strokeWidth={2} />
            {error}
          </div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <Mail size={16} strokeWidth={1.5} />
                </span>
                <input type="email" className="form-input" placeholder="you@example.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon has-right">
                <span className="input-icon">
                  <Lock size={16} strokeWidth={1.5} />
                </span>
                <input type={showPw ? 'text' : 'password'} className="form-input" placeholder="Enter password"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                <button type="button" className="input-icon-right" onClick={() => setShowPw(!showPw)}>
                  {showPw ? (
                    <EyeOff size={16} strokeWidth={1.5} />
                  ) : (
                    <Eye size={16} strokeWidth={1.5} />
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={onForgotPassword}
                style={{
                  marginTop: 8,
                  background: 'none',
                  border: 'none',
                  color: 'var(--pistachio-frost)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  textDecoration: 'underline',
                }}
              >
                Forgot password?
              </button>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
              {loading ? <><span className="spinner-sm" /> Signing in...</> : `Sign in as ${tabs.find(t => t.id === tab)?.label}`}
            </button>
          </form>

          {tab === 'patient' && (
            <p style={{ textAlign: 'center', marginTop: 20, fontSize: '13.5px', color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <button onClick={onSwitch} style={{ background: 'none', border: 'none', color: 'var(--pistachio-frost)', fontWeight: 600, cursor: 'pointer', fontSize: '13.5px' }}>
                Create one
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}