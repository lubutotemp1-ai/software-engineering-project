import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSidebarOpen } from '../hooks/useSidebarOpen';
import SidebarToggle from '../components/SidebarToggle';
import FlashBanner from '../components/FlashBanner';
import MessagingPanel from '../components/MessagingPanel';
import { useFlashMessage } from '../utils/flashMessage';

const COUNTRY_CODES = [
  { code: '+1', flag: '🇺🇸', name: 'US (+1)' }, { code: '+44', flag: '🇬🇧', name: 'UK (+44)' },
  { code: '+260', flag: '🇿🇲', name: 'ZM (+260)' }, { code: '+27', flag: '🇿🇦', name: 'ZA (+27)' },
  { code: '+234', flag: '🇳🇬', name: 'NG (+234)' }, { code: '+254', flag: '🇰🇪', name: 'KE (+254)' },
  { code: '+233', flag: '🇬🇭', name: 'GH (+233)' }, { code: '+91', flag: '🇮🇳', name: 'IN (+91)' },
  { code: '+61', flag: '🇦🇺', name: 'AU (+61)' }, { code: '+49', flag: '🇩🇪', name: 'DE (+49)' },
];

const ROLE_COLORS = { patient: 'var(--blue)', doctor: 'var(--green)', admin: 'var(--amber)' };
const ROLE_BG = { patient: 'var(--blue-bg)', doctor: 'var(--green-bg)', admin: 'var(--amber-bg)' };

function Avatar({ name, role, size = 36 }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
  return <div style={{ width: size, height: size, borderRadius: '50%', background: ROLE_BG[role] || 'var(--blue-200)', color: ROLE_COLORS[role] || 'var(--grey-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.37, fontWeight: 700, flexShrink: 0 }}>{initials}</div>;
}

export default function AdminDashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState('overview');
  const { isOpen, setIsOpen, closeOnMobile } = useSidebarOpen();
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ totalPatients: 0, totalDoctors: 0, totalAppointments: 0, pendingAppointments: 0 });
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [editDoctor, setEditDoctor] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [phoneCC, setPhoneCC] = useState('+260');
  const [doctorForm, setDoctorForm] = useState({ name: '', email: '', password: '', phoneNumber: '', department: '', specialization: '' });
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      await Promise.all([fetchDoctors(), fetchPatients(), fetchAppointments(), fetchUnread(), fetchStats()]);
    } finally { setLoading(false); }
  };

  const fetchDoctors = async () => { const r = await axios.get('/api/admin/doctors'); setDoctors(r.data); };
  const fetchPatients = async () => { const r = await axios.get('/api/admin/patients'); setPatients(r.data); };
  const fetchAppointments = async () => { const r = await axios.get('/api/admin/appointments'); setAppointments(r.data); };
  const fetchUnread = async () => { try { const r = await axios.get('/api/chat/unread-count'); setUnreadCount(r.data.count); } catch {} };
  const fetchStats = async () => { try { const r = await axios.get('/api/admin/stats'); setStats(r.data); } catch (err) { console.error('Error fetching stats:', err); } };

  const { show: showMsg, dismiss: dismissMsg } = useFlashMessage(setSuccess, setError);

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    try {
      const phone = doctorForm.phoneNumber ? `${phoneCC}${doctorForm.phoneNumber}` : '';
      if (editDoctor) {
        await axios.put(`/api/admin/doctors/${editDoctor.id}`, { ...doctorForm, phone });
        showMsg('Doctor updated.');
      } else {
        await axios.post('/api/admin/doctors', { ...doctorForm, phone });
        showMsg('Doctor added.');
      }
      setShowAddDoctor(false);
      setEditDoctor(null);
      setDoctorForm({ name: '', email: '', password: '', phoneNumber: '', department: '', specialization: '' });
      fetchDoctors();
      fetchStats();
    } catch (err) { showMsg(err.response?.data?.error || 'Failed to save doctor.', true); }
  };

  const deleteDoctor = async (id) => {
    if (!window.confirm('Remove this doctor?')) return;
    try { await axios.delete(`/api/admin/doctors/${id}`); showMsg('Doctor removed.'); fetchDoctors(); fetchStats(); } catch { showMsg('Failed.', true); }
  };

  const openEdit = (doc) => {
    const [, num] = (doc.phone || '').match(/^(\+\d+)(.*)$/) || [null, '+260', doc.phone || ''];
    setEditDoctor(doc);
    setDoctorForm({ name: doc.name, email: doc.email, password: '', phoneNumber: num || '', department: doc.department, specialization: doc.specialization || '' });
    setShowAddDoctor(true);
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'doctors', label: 'Doctors', icon: '🩺' },
    { id: 'patients', label: 'Patients', icon: '👤' },
    { id: 'appointments', label: 'Appointments', icon: '📅' },
    { id: 'chat', label: 'Messages', icon: '💬', badge: unreadCount },
  ];

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AD';
  const getStatusBadge = (s) => ({ pending: 'badge-amber', confirmed: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red' }[s] || 'badge-grey');

  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;

  return (
    <div className="app-layout">
      <SidebarToggle isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)} />
      {isOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            zIndex: 998,
            cursor: 'pointer'
          }}
        />
      )}
      <aside className={`sidebar admin-sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button 
            className="sidebar-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close sidebar"
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              fontSize: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button key={item.id} className={`nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => { setActivePage(item.id); closeOnMobile(); }} title={item.label} aria-label={item.label}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">Administrator</div>
            </div>
          </div>
          <button className="nav-item" onClick={onLogout} style={{ width: '100%' }}>
            <span className="nav-icon" aria-hidden="true">↩</span>
            <span className="nav-label">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <FlashBanner success={success} error={error} onDismiss={dismissMsg} />

        {/* OVERVIEW */}
        {activePage === 'overview' && (
          <div>
            <div style={{ background: 'var(--grey-900)', borderRadius: 'var(--radius-lg)', padding: '24px 28px', color: '#000000', marginBottom: 24 }}>
              <p style={{ fontSize: '12px', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Administration</p>
              <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: 4 }}>Welcome, {user?.name}</h1>
              <p style={{ color: 'var(--grey-400)', fontSize: '13.5px' }}>Manage doctors, patients, and appointments</p>
            </div>
            <div className="stats-grid">
              {[
                { icon: '🩺', label: 'Doctors', value: stats.totalDoctors ?? doctors.length, bg: 'var(--green-bg)', c: 'var(--green)' },
                { icon: '👤', label: 'Patients', value: stats.totalPatients ?? patients.length, bg: 'var(--blue-bg)', c: 'var(--blue)' },
                { icon: '📅', label: 'Appointments', value: stats.totalAppointments ?? appointments.length, bg: 'var(--grey-100)', c: 'var(--grey-600)' },
                { icon: '💬', label: 'Unread Messages', value: unreadCount, bg: unreadCount > 0 ? 'var(--amber-bg)' : 'var(--grey-100)', c: unreadCount > 0 ? 'var(--amber)' : 'var(--grey-600)' },
              ].map((s, i) => (
                <div className="stat-card" key={i}>
                  <div className="stat-icon" style={{ background: s.bg }}><span style={{ fontSize: '1.2rem' }}>{s.icon}</span></div>
                  <div className="stat-info"><h3 style={{ color: s.c }}>{s.value}</h3><p>{s.label}</p></div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card">
                <div className="card-header"><span className="card-title">Recent Doctors</span><button className="btn btn-ghost btn-sm" onClick={() => setActivePage('doctors')}>View all →</button></div>
                {doctors.slice(0, 5).map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--grey-100)' }}>
                    <Avatar name={d.name} role="doctor" size={32} />
                    <div><div style={{ fontSize: '13px', fontWeight: 600 }}>{d.name}</div><div style={{ fontSize: '11.5px', color: '#000000' }}>{d.department}</div></div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-header"><span className="card-title">Recent Appointments</span><button className="btn btn-ghost btn-sm" onClick={() => setActivePage('appointments')}>View all →</button></div>
                {appointments.slice(0, 5).map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--grey-100)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{a.patient_name} → Dr. {a.doctor_name}</div>
                      <div style={{ fontSize: '11.5px', color: '#000000' }}>{a.appointment_date} · {a.appointment_time}</div>
                    </div>
                    <span className={`badge ${getStatusBadge(a.status)}`}>{a.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DOCTORS */}
        {activePage === 'doctors' && (
          <div>
            <div className="flex-between" style={{ marginBottom: 20 }}>
              <div className="page-header" style={{ marginBottom: 0 }}><h1>Doctors</h1><p>Manage all medical staff</p></div>
              <button className="btn btn-green" onClick={() => { setEditDoctor(null); setDoctorForm({ name: '', email: '', password: '', phoneNumber: '', department: '', specialization: '' }); setShowAddDoctor(true); }}>+ Add Doctor</button>
            </div>
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Department</th><th>Specialization</th><th>Actions</th></tr></thead>
                  <tbody>
                    {doctors.length === 0 ? <tr><td colSpan={6}><div className="empty-state"><div className="emoji">🩺</div><h3>No doctors added</h3></div></td></tr> : doctors.map(d => (
                      <tr key={d.id}>
                        <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={d.name} role="doctor" size={30} /><span style={{ fontWeight: 600, fontSize: '13px' }}>{d.name}</span></div></td>
                        <td style={{ fontSize: '12.5px' }}>{d.email}</td>
                        <td style={{ fontSize: '12.5px' }}>{d.phone || '—'}</td>
                        <td><span className="badge badge-green">{d.department}</span></td>
                        <td style={{ fontSize: '12.5px', color: '#000000' }}>{d.specialization || '—'}</td>
                        <td><div style={{ display: 'flex', gap: 6 }}><button className="btn btn-outline btn-sm" onClick={() => openEdit(d)}>Edit</button><button className="btn btn-danger btn-sm" onClick={() => deleteDoctor(d.id)}>Remove</button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PATIENTS */}
        {activePage === 'patients' && (
          <div>
            <div className="page-header"><h1>Patients</h1><p>All registered patients</p></div>
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>DOB</th><th>Blood Type</th><th>Joined</th></tr></thead>
                  <tbody>
                    {patients.length === 0 ? <tr><td colSpan={6}><div className="empty-state"><div className="emoji">👤</div><h3>No patients yet</h3></div></td></tr> : patients.map(p => (
                      <tr key={p.id}>
                        <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={p.name} role="patient" size={30} /><span style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</span></div></td>
                        <td style={{ fontSize: '12.5px' }}>{p.email}</td>
                        <td style={{ fontSize: '12.5px' }}>{p.phone || '—'}</td>
                        <td style={{ fontSize: '12.5px' }}>{p.date_of_birth ? new Date(p.date_of_birth + 'T00:00:00').toLocaleDateString() : '—'}</td>
                        <td>{p.blood_type ? <span className="badge badge-red">{p.blood_type}</span> : '—'}</td>
                        <td style={{ fontSize: '12px', color: '#000000' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* APPOINTMENTS */}
        {activePage === 'appointments' && (
          <div>
            <div className="page-header"><h1>All Appointments</h1><p>Overview of all system appointments</p></div>
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Patient</th><th>Doctor</th><th>Department</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
                  <tbody>
                    {appointments.length === 0 ? <tr><td colSpan={6}><div className="empty-state"><div className="emoji">📅</div><h3>No appointments</h3></div></td></tr> : appointments.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontSize: '13px', fontWeight: 600 }}>{a.patient_name}</td>
                        <td style={{ fontSize: '13px' }}>Dr. {a.doctor_name}</td>
                        <td><span className="badge badge-blue">{a.department}</span></td>
                        <td style={{ fontSize: '12.5px' }}>{new Date(a.appointment_date + 'T00:00:00').toLocaleDateString()}</td>
                        <td style={{ fontSize: '12.5px' }}>{a.appointment_time}</td>
                        <td><span className={`badge ${getStatusBadge(a.status)}`}>{a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activePage === 'chat' && <MessagingPanel />}
      </main>

      {/* ADD/EDIT DOCTOR MODAL */}
      {showAddDoctor && (
        <div className="modal-overlay" onClick={() => setShowAddDoctor(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editDoctor ? 'Edit Doctor' : 'Add New Doctor'}</span>
              <button className="modal-close" onClick={() => setShowAddDoctor(false)}>✕</button>
            </div>
            <form onSubmit={handleAddDoctor}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={doctorForm.name} onChange={e => setDoctorForm({ ...doctorForm, name: e.target.value })} required placeholder="Dr. Jane Smith" />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-input" value={doctorForm.email} onChange={e => setDoctorForm({ ...doctorForm, email: e.target.value })} required disabled={!!editDoctor} placeholder="doctor@hospital.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">{editDoctor ? 'New Password (optional)' : 'Password *'}</label>
                  <div className="input-with-icon has-right">
                    <input type={showPw ? 'text' : 'password'} className="form-input" value={doctorForm.password} onChange={e => setDoctorForm({ ...doctorForm, password: e.target.value })} required={!editDoctor} placeholder="Min 6 characters" />
                    <button type="button" className="input-icon-right" onClick={() => setShowPw(!showPw)}>{showPw ? '🙈' : '👁️'}</button>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div className="phone-input-row">
                  <select className="form-input phone-flag-select" value={phoneCC} onChange={e => setPhoneCC(e.target.value)}>
                    {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                  </select>
                  <input className="form-input" placeholder="971 234 567" value={doctorForm.phoneNumber} onChange={e => setDoctorForm({ ...doctorForm, phoneNumber: e.target.value })} />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select className="form-input" value={doctorForm.department} onChange={e => setDoctorForm({ ...doctorForm, department: e.target.value })} required>
                    <option value="">Select...</option>
                    {['Cardiology','Neurology','Orthopedics','Pediatrics','Oncology','Radiology','Emergency','General Practice','Surgery','Gynecology','Psychiatry','Dermatology'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Specialization</label>
                  <input className="form-input" placeholder="E.g., Heart Surgery" value={doctorForm.specialization} onChange={e => setDoctorForm({ ...doctorForm, specialization: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAddDoctor(false)}>Cancel</button>
                <button type="submit" className="btn btn-green" style={{ flex: 1 }}>{editDoctor ? 'Save Changes' : 'Add Doctor'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
