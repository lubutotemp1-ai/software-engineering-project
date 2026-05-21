import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Bot,
  MessageSquare,
  FileText,
  BookOpen,
  User,
  Mail,
  Phone,
  Calendar,
  Droplets,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  ArrowLeft,
  Shield,
  Clock,
  Activity,
  Search
} from 'lucide-react';
import hospitalSvg from '../images/hospital-svgrepo-com (1).svg';

// Comprehensive country codes list with full country names
const COUNTRY_CODES = [
  { code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱' },
  { code: '+32', name: 'Belgium', flag: '🇧🇪' },
  { code: '+43', name: 'Austria', flag: '🇦🇹' },
  { code: '+41', name: 'Switzerland', flag: '🇨🇭' },
  { code: '+46', name: 'Sweden', flag: '🇸🇪' },
  { code: '+47', name: 'Norway', flag: '🇳🇴' },
  { code: '+45', name: 'Denmark', flag: '🇩🇰' },
  { code: '+358', name: 'Finland', flag: '🇫🇮' },
  { code: '+48', name: 'Poland', flag: '🇵🇱' },
  { code: '+353', name: 'Ireland', flag: '🇮🇪' },
  { code: '+30', name: 'Greece', flag: '🇬🇷' },
  { code: '+36', name: 'Hungary', flag: '🇭🇺' },
  { code: '+420', name: 'Czech Republic', flag: '🇨🇿' },
  { code: '+421', name: 'Slovakia', flag: '🇸🇰' },
  { code: '+385', name: 'Croatia', flag: '🇭🇷' },
  { code: '+381', name: 'Serbia', flag: '🇷🇸' },
  { code: '+40', name: 'Romania', flag: '🇷🇴' },
  { code: '+359', name: 'Bulgaria', flag: '🇧🇬' },
  { code: '+90', name: 'Turkey', flag: '🇹🇷' },
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+86', name: 'China', flag: '🇨🇳' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷' },
  { code: '+66', name: 'Thailand', flag: '🇹🇭' },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: '+62', name: 'Indonesia', flag: '🇮🇩' },
  { code: '+63', name: 'Philippines', flag: '🇵🇭' },
  { code: '+84', name: 'Vietnam', flag: '🇻🇳' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+64', name: 'New Zealand', flag: '🇳🇿' },
  { code: '+260', name: 'Zambia', flag: '🇿🇲' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
  { code: '+254', name: 'Kenya', flag: '🇰🇪' },
  { code: '+233', name: 'Ghana', flag: '🇬🇭' },
  { code: '+255', name: 'Tanzania', flag: '🇹🇿' },
  { code: '+256', name: 'Uganda', flag: '🇺🇬' },
  { code: '+263', name: 'Zimbabwe', flag: '🇿🇼' },
  { code: '+267', name: 'Botswana', flag: '🇧🇼' },
  { code: '+258', name: 'Mozambique', flag: '🇲🇿' },
  { code: '+257', name: 'Burundi', flag: '🇧🇮' },
  { code: '+266', name: 'Lesotho', flag: '🇱🇸' },
  { code: '+264', name: 'Namibia', flag: '🇳🇦' },
  { code: '+268', name: 'Eswatini', flag: '🇸🇿' },
  { code: '+250', name: 'Rwanda', flag: '🇷🇼' },
  { code: '+44', name: 'Egypt', flag: '🇪🇬' },
  { code: '+212', name: 'Morocco', flag: '🇲🇦' },
  { code: '+216', name: 'Tunisia', flag: '🇹🇳' },
  { code: '+213', name: 'Algeria', flag: '🇩🇿' },
  { code: '+673', name: 'Brunei', flag: '🇧🇳' },
  { code: '+852', name: 'Hong Kong', flag: '🇭🇰' },
  { code: '+853', name: 'Macau', flag: '🇲🇴' },
  { code: '+886', name: 'Taiwan', flag: '🇹🇼' },
  { code: '+244', name: 'Angola', flag: '🇦🇴' },
  { code: '+245', name: 'Guinea-Bissau', flag: '🇬🇼' },
  { code: '+239', name: 'São Tomé and Príncipe', flag: '🇸🇹' },
  { code: '+242', name: 'Congo', flag: '🇨🇬' },
  { code: '+243', name: 'Democratic Republic of the Congo', flag: '🇨🇩' },
  { code: '+236', name: 'Central African Republic', flag: '🇨🇫' },
  { code: '+220', name: 'Gambia', flag: '🇬🇲' },
  { code: '+221', name: 'Senegal', flag: '🇸🇳' },
  { code: '+225', name: 'Ivory Coast', flag: '🇨🇮' },
  { code: '+226', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: '+227', name: 'Niger', flag: '🇳🇪' },
  { code: '+228', name: 'Togo', flag: '🇹🇬' },
  { code: '+229', name: 'Benin', flag: '🇧🇯' },
  { code: '+230', name: 'Mauritius', flag: '🇲🇺' },
  { code: '+248', name: 'Seychelles', flag: '🇸🇨' },
  { code: '+356', name: 'Malta', flag: '🇲🇹' },
  { code: '+357', name: 'Cyprus', flag: '🇨🇾' },
  { code: '+380', name: 'Ukraine', flag: '🇺🇦' },
  { code: '+373', name: 'Moldova', flag: '🇲🇩' },
  { code: '+389', name: 'North Macedonia', flag: '🇲🇰' },
  { code: '+383', name: 'Kosovo', flag: '🇽🇰' },
  { code: '+387', name: 'Bosnia and Herzegovina', flag: '🇧🇦' },
  { code: '+382', name: 'Montenegro', flag: '🇲🇪' },
  { code: '+386', name: 'Slovenia', flag: '🇸🇮' },
  { code: '+98', name: 'Iran', flag: '🇮🇷' },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+971', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: '+974', name: 'Qatar', flag: '🇶🇦' },
  { code: '+973', name: 'Bahrain', flag: '🇧🇭' },
  { code: '+968', name: 'Oman', flag: '🇴🇲' },
  { code: '+967', name: 'Yemen', flag: '🇾🇪' },
  { code: '+970', name: 'Palestine', flag: '🇵🇸' },
  { code: '+961', name: 'Lebanon', flag: '🇱🇧' },
  { code: '+963', name: 'Syria', flag: '🇸🇾' },
  { code: '+962', name: 'Jordan', flag: '🇯🇴' },
  { code: '+964', name: 'Iraq', flag: '🇮🇶' },
  { code: '+92', name: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+95', name: 'Myanmar', flag: '🇲🇲' },
  { code: '+856', name: 'Laos', flag: '🇱🇦' },
  { code: '+855', name: 'Cambodia', flag: '🇰🇭' },
  { code: '+506', name: 'Costa Rica', flag: '🇨🇷' },
  { code: '+507', name: 'Panama', flag: '🇵🇦' },
  { code: '+503', name: 'El Salvador', flag: '🇸🇻' },
  { code: '+504', name: 'Honduras', flag: '🇭🇳' },
  { code: '+505', name: 'Nicaragua', flag: '🇳🇮' },
  { code: '+502', name: 'Guatemala', flag: '🇬🇹' },
  { code: '+501', name: 'Belize', flag: '🇧🇿' },
  { code: '+1', name: 'Bahamas', flag: '🇧🇸' },
  { code: '+1', name: 'Jamaica', flag: '🇯🇲' },
  { code: '+1', name: 'Cuba', flag: '🇨🇺' },
  { code: '+1', name: 'Dominican Republic', flag: '🇩🇴' },
  { code: '+1', name: 'Puerto Rico', flag: '🇵🇷' },
  { code: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: '+51', name: 'Peru', flag: '🇵🇪' },
  { code: '+57', name: 'Colombia', flag: '🇨🇴' },
  { code: '+58', name: 'Venezuela', flag: '🇻🇪' },
  { code: '+597', name: 'Suriname', flag: '🇸🇷' },
  { code: '+592', name: 'Guyana', flag: '🇬🇾' },
].sort((a, b) => a.name.localeCompare(b.name));

export default function RegisterPage({ onSwitch, onBack }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', password: '', phoneNumber: '',
    date_of_birth: '', blood_type: ''
  });
  const [countryCode, setCountryCode] = useState('+1');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      const phone = form.phoneNumber ? `${countryCode}${form.phoneNumber}` : '';
      await register({ 
        name: form.name,
        email: form.email,
        password: form.password,
        phone: phone,
        date_of_birth: form.date_of_birth,
        blood_type: form.blood_type
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  const features = [
    { icon: Bot, label: 'AI Symptom Checker', desc: 'Get instant health insights' },
    { icon: MessageSquare, label: 'Chat with your Doctor', desc: '24/7 consultation access' },
    { icon: FileText, label: 'Health Records & Meds', desc: 'Complete medical history' },
    { icon: BookOpen, label: 'Health Education AI', desc: 'Personalized health tips' },
    { icon: Shield, label: 'Secure & Private', desc: 'HIPAA compliant platform' },
    { icon: Activity, label: 'Health Tracking', desc: 'Monitor your vitals' },
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
          <h1>Join Health Easy Portal</h1>
          <p>Create your account and take control of your health</p>
        </div>

        <div className="auth-form">
          <button
            onClick={onSwitch}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              color: '#000000',
              fontSize: '13px',
              cursor: 'pointer',
              marginBottom: '16px',
              padding: 0,
              transition: 'color 0.2s',
              fontWeight: 500
            }}
            onMouseEnter={(e) => e.target.style.color = '#2563EB'}
            onMouseLeave={(e) => e.target.style.color = '#9CA3AF'}
          >
            <ArrowLeft size={14} /> Back to sign in
          </button>
          <h2>Create Account</h2>
          <p className="subtitle">Fill in your details to get started</p>

          {error && (
            <div className="alert alert-error">
              <ChevronRight size={14} strokeWidth={2} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <User size={16} strokeWidth={1.5} />
                </span>
                <input className="form-input" placeholder="John Banda"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  style={{ paddingLeft: '42px' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <Mail size={16} strokeWidth={1.5} />
                </span>
                <input type="email" className="form-input" placeholder="you@example.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
                  style={{ paddingLeft: '42px' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <div className="phone-input-row" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', position: 'relative', width: '100%' }}>
                  <div style={{ position: 'relative', width: '130px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                      style={{
                        width: '100%', padding: '14px 12px', borderRadius: '10px',
                        border: '1.5px solid #E5E7EB', background: '#F9FAFB',
                        color: '#000000', fontSize: '13px', fontFamily: 'Montserrat, sans-serif',
                        fontWeight: 500, cursor: 'pointer', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      {COUNTRY_CODES.find(c => c.code === countryCode)?.flag} {countryCode}
                    </button>
                    {showCountryDropdown && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                        background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '10px',
                        zIndex: 1000, maxHeight: '300px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ padding: '8px', borderBottom: '1px solid #E5E7EB', stickyTop: 0 }}>
                          <div style={{ position: 'relative' }}>
                            <Search size={14} strokeWidth={1.5} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#000000' }} />
                            <input
                              type="text"
                              placeholder="Search country..."
                              value={countrySearch}
                              onChange={e => setCountrySearch(e.target.value)}
                              className="form-input"
                              style={{ paddingLeft: '32px', fontSize: '12px' }}
                            />
                          </div>
                        </div>
                        {COUNTRY_CODES.filter(c =>
                          c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                          c.code.includes(countrySearch)
                        ).map(c => (
                          <div
                            key={`${c.code}-${c.name}`}
                            onClick={() => {
                              setCountryCode(c.code);
                              setShowCountryDropdown(false);
                              setCountrySearch('');
                            }}
                            style={{
                              padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #F3F4F6',
                              background: countryCode === c.code ? '#EFF6FF' : 'transparent',
                              color: countryCode === c.code ? '#2563EB' : '#111827',
                              fontSize: '13px', fontWeight: countryCode === c.code ? 600 : 400
                            }}
                            onMouseOver={e => e.currentTarget.style.background = '#F9FAFB'}
                            onMouseOut={e => e.currentTarget.style.background = countryCode === c.code ? '#EFF6FF' : 'transparent'}
                          >
                            {c.flag} {c.name} <span style={{ fontSize: '11px', color: '#000000', marginLeft: '4px' }}>({c.code})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="input-with-icon" style={{ flex: 1, minWidth: '200px' }}>
                    <span className="input-icon">
                      <Phone size={10} strokeWidth={1.5} />
                    </span>
                    <input className="form-input" placeholder="971 234567"
                      value={form.phoneNumber} onChange={e => setForm({ ...form, phoneNumber: e.target.value })}
                      style={{ paddingLeft: '42px', width: '100%', minHeight: '44px' }} />
                  </div>
                </div>
              </div>


            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <div className="input-with-icon">
                  <span className="input-icon">
                    <Calendar size={16} strokeWidth={1.5} />
                  </span>
                  <input type="date" className="form-input"
                    value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })}
                    style={{ paddingLeft: '42px' }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Blood Type</label>
                <div className="input-with-icon">
                  <span className="input-icon">
                    <Droplets size={16} strokeWidth={1.5} />
                  </span>
                  <select className="form-input" value={form.blood_type} onChange={e => setForm({ ...form, blood_type: e.target.value })}
                    style={{ paddingLeft: '42px' }}>
                    <option value="">Select...</option>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password *</label>
              <div className="input-with-icon has-right">
                <span className="input-icon">
                  <Lock size={16} strokeWidth={1.5} />
                </span>
                <input type={showPw ? 'text' : 'password'} className="form-input" placeholder="Min 6 characters"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                <button type="button" className="input-icon-right" onClick={() => setShowPw(!showPw)}>
                  {showPw ? (
                    <EyeOff size={16} strokeWidth={1.5} />
                  ) : (
                    <Eye size={16} strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
              {loading ? <><span className="spinner-sm" /> Creating account...</> : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: '13.5px', color: '#000000' }}>
            Already have an account?{' '}
            <button onClick={onSwitch} style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 600, cursor: 'pointer', fontSize: '13.5px' }}>
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}