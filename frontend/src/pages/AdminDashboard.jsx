import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';

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

function RoleBadge({ role }) {
  const ROLE_LABELS = { patient: 'Patient', doctor: 'Doctor', admin: 'Admin' };
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 12,
      background: ROLE_BG[role] || 'var(--blue-200)',
      color: ROLE_COLORS[role] || 'var(--grey-600)',
      fontWeight: 700, border: `1px solid ${ROLE_COLORS[role] || 'var(--grey-300)'}`
    }}>{ROLE_LABELS[role]}</span>
  );
}

function groupByDate(msgs) {
  const groups = []; let lastDate = null;
  for (const msg of msgs) {
    const d = new Date(msg.created_at).toDateString();
    if (d !== lastDate) { groups.push({ type: 'date', label: d === new Date().toDateString() ? 'Today' : d }); lastDate = d; }
    groups.push({ type: 'msg', msg });
  }
  return groups;
}

export default function AdminDashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState('overview');
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [editDoctor, setEditDoctor] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [phoneCC, setPhoneCC] = useState('+260');
  const [doctorForm, setDoctorForm] = useState({ name: '', email: '', password: '', phoneNumber: '', department: '', specialization: '' });
  // Chat
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [aiUsageData, setAiUsageData] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);

  useEffect(() => { fetchAll(); return () => { if (pollingRef.current) clearInterval(pollingRef.current); }; }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (selectedChat) {
      pollingRef.current = setInterval(() => fetchChatMessages(selectedChat.other_user_id, selectedChat.other_user_role), 5000);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [selectedChat]);

  const fetchAll = async () => {
    try {
      await Promise.all([fetchDoctors(), fetchPatients(), fetchAppointments(), fetchConversations(), fetchAvailableUsers(), fetchUnread()]);
    } finally { setLoading(false); }
  };

  const fetchDoctors = async () => { const r = await axios.get('/api/admin/doctors'); setDoctors(r.data); };
  const fetchPatients = async () => { const r = await axios.get('/api/admin/patients'); setPatients(r.data); };
  const fetchAppointments = async () => { const r = await axios.get('/api/admin/appointments'); setAppointments(r.data); };
  const fetchConversations = async () => { try { const r = await axios.get('/api/chat/conversations'); setConversations(r.data || []); } catch {} };
  const fetchAvailableUsers = async () => { try { const r = await axios.get('/api/chat/users'); setAvailableUsers(r.data || []); } catch {} };
  const fetchUnread = async () => { try { const r = await axios.get('/api/chat/unread-count'); setUnreadCount(r.data.count); } catch {} };
  const fetchChatMessages = async (otherId, otherRole) => { const r = await axios.get(`/api/chat/messages/${otherId}?otherRole=${otherRole || ''}`); setChatMessages(r.data || []); fetchConversations(); fetchUnread(); };
  
  const fetchAIUsage = async (userId) => {
    try {
      setAiLoading(true);
      const r = await axios.get(`/api/admin/users/${userId}/ai-usage`);
      setAiUsageData(r.data);
    } catch (err) {
      showMsg('Failed to fetch AI usage data', true);
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const resetAIUsage = async (userId, service) => {
    if (!window.confirm(`Reset ${service} AI usage for this patient?`)) return;
    try {
      await axios.post(`/api/admin/users/${userId}/reset-ai-usage`, { service });
      showMsg(`${service} AI usage reset successfully`);
      fetchAIUsage(userId);
    } catch (err) {
      showMsg('Failed to reset AI usage', true);
      console.error(err);
    }
  };

  const showMsg = (msg, isErr = false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  };

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
    } catch (err) { showMsg(err.response?.data?.error || 'Failed to save doctor.', true); }
  };

  const deleteDoctor = async (id) => {
    if (!window.confirm('Remove this doctor?')) return;
    try { await axios.delete(`/api/admin/doctors/${id}`); showMsg('Doctor removed.'); fetchDoctors(); } catch { showMsg('Failed.', true); }
  };

  const openEdit = (doc) => {
    const [, num] = (doc.phone || '').match(/^(\+\d+)(.*)$/) || [null, '+260', doc.phone || ''];
    setEditDoctor(doc);
    setDoctorForm({ name: doc.name, email: doc.email, password: '', phoneNumber: num || '', department: doc.department, specialization: doc.specialization || '' });
    setShowAddDoctor(true);
  };

  const selectChat = (c) => { setSelectedChat(c); fetchChatMessages(c.other_user_id, c.other_user_role); };
  const startNewChat = (u) => {
    const existing = conversations.find(c => c.other_user_id === u.id);
    if (existing) selectChat(existing);
    else { setSelectedChat({ other_user_id: u.id, other_user_name: u.name, other_user_role: u.role }); setChatMessages([]); }
    setShowNewChat(false);
  };
  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedChat || chatSending) return;
    setChatSending(true);
    try { await axios.post('/api/chat/send', { receiverId: selectedChat.other_user_id, receiverRole: selectedChat.other_user_role, message: chatInput.trim() }); setChatInput(''); fetchChatMessages(selectedChat.other_user_id, selectedChat.other_user_role); fetchConversations(); } finally { setChatSending(false); }
  };
  const handleChatKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(e); } };
  const fmt = (ts) => { const d = new Date(ts); const diff = Date.now() - d; if (diff < 60000) return 'Just now'; if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`; if (diff < 86400000) return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }); return d.toLocaleDateString('en', { month: 'short', day: 'numeric' }); };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: '⬛' },
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
      <AdminSidebar activePage={activePage} setActivePage={setActivePage} user={user} onLogout={onLogout} />

      <main className="main-content">
        {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>✓ {success}</div>}
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

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
                { icon: '🩺', label: 'Doctors', value: doctors.length, bg: 'var(--green-bg)', c: 'var(--green)' },
                { icon: '👤', label: 'Patients', value: patients.length, bg: 'var(--blue-bg)', c: 'var(--blue)' },
                { icon: '📅', label: 'Appointments', value: appointments.length, bg: 'var(--grey-100)', c: 'var(--grey-600)' },
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

        {/* APPOINTMENTS */}
        {activePage === 'appointments' && (
          <div>
            <div className="page-header"><h1>Appointments</h1><p>All scheduled appointments</p></div>
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
                  <tbody>
                    {appointments.length === 0 ? <tr><td colSpan={5}><div className="empty-state"><div className="emoji">📅</div><h3>No appointments</h3></div></td></tr> : appointments.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontSize: '12.5px' }}>{a.patient_name}</td>
                        <td style={{ fontSize: '12.5px' }}>Dr. {a.doctor_name}</td>
                        <td style={{ fontSize: '12.5px' }}>{a.appointment_date}</td>
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

        {/* CHANGE PASSWORD */}
        {activePage === 'change-password' && (
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div className="page-header"><h1>Change Password</h1><p>Update your account password</p></div>
            <div className="card">
              <form onSubmit={e => { e.preventDefault(); alert('Password change feature coming soon'); }}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input type="password" className="form-input" placeholder="Enter current password" required />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input type="password" className="form-input" placeholder="Enter new password" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input type="password" className="form-input" placeholder="Confirm new password" required />
                </div>
                <button type="submit" className="btn btn-green" style={{ width: '100%' }}>Update Password</button>
              </form>
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

        {/* AI USAGE MANAGEMENT */}
        {activePage === 'ai-usage' && (
          <div>
            <div className="page-header"><h1>AI Usage Management</h1><p>Monitor and reset AI service usage limits</p></div>
            <div className="card">
              <div style={{ marginBottom: 20 }}>
                <label className="form-label">Select Patient</label>
                <select className="form-input" onChange={(e) => {
                  if (e.target.value) {
                    const pt = patients.find(p => p.id === parseInt(e.target.value));
                    setSelectedPatient(pt);
                    fetchAIUsage(pt.id);
                  } else {
                    setSelectedPatient(null);
                    setAiUsageData(null);
                  }
                }} style={{ marginBottom: 0 }}>
                  <option value="">Choose a patient...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                  ))}
                </select>
              </div>

              {selectedPatient && aiUsageData && (
                <div>
                  <div style={{ background: '#f9fafb', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: '#000000' }}>{selectedPatient.name}</div>
                        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Plan: <span style={{ fontWeight: 600, color: '#000000' }}>{aiUsageData.plan}</span></div>
                        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>Billing Period: <span style={{ fontWeight: 600, color: '#000000' }}>{new Date(aiUsageData.billingPeriodStart).toLocaleDateString()} - {new Date(new Date(aiUsageData.billingPeriodStart).getFullYear(), new Date(aiUsageData.billingPeriodStart).getMonth() + 1, 0).toLocaleDateString()}</span></div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {/* Diagnosis Usage */}
                      <div style={{ background: 'white', padding: 16, borderRadius: 6, border: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#000000', marginBottom: 4 }}>AI Diagnosis</div>
                            <div style={{ fontSize: 12, color: '#6B7280' }}>Monthly limit: <span style={{ fontWeight: 600 }}>{aiUsageData.diagnosis.limit}</span></div>
                          </div>
                          <button className="btn btn-outline btn-sm" onClick={() => resetAIUsage(selectedPatient.id, 'diagnosis')} style={{ minWidth: 'auto' }}>Reset</button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ background: '#E5E7EB', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ background: '#3B82F6', height: '100%', width: `${(aiUsageData.diagnosis.used / aiUsageData.diagnosis.limit) * 100}%`, transition: 'width 0.3s' }}></div>
                            </div>
                          </div>
                          <div style={{ fontWeight: 700, color: '#000000', minWidth: 60, textAlign: 'right' }}>{aiUsageData.diagnosis.used} / {aiUsageData.diagnosis.limit}</div>
                        </div>
                        <div style={{ fontSize: 12, color: '#10B981', marginTop: 8, fontWeight: 600 }}>Remaining: {aiUsageData.diagnosis.remaining}</div>
                      </div>

                      {/* Education Usage */}
                      <div style={{ background: 'white', padding: 16, borderRadius: 6, border: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#000000', marginBottom: 4 }}>Health Education</div>
                            <div style={{ fontSize: 12, color: '#6B7280' }}>Monthly limit: <span style={{ fontWeight: 600 }}>{aiUsageData.education.limit}</span></div>
                          </div>
                          <button className="btn btn-outline btn-sm" onClick={() => resetAIUsage(selectedPatient.id, 'education')} style={{ minWidth: 'auto' }}>Reset</button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ background: '#E5E7EB', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ background: '#10B981', height: '100%', width: `${(aiUsageData.education.used / aiUsageData.education.limit) * 100}%`, transition: 'width 0.3s' }}></div>
                            </div>
                          </div>
                          <div style={{ fontWeight: 700, color: '#000000', minWidth: 60, textAlign: 'right' }}>{aiUsageData.education.used} / {aiUsageData.education.limit}</div>
                        </div>
                        <div style={{ fontSize: 12, color: '#10B981', marginTop: 8, fontWeight: 600 }}>Remaining: {aiUsageData.education.remaining}</div>
                      </div>
                    </div>

                    <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={() => resetAIUsage(selectedPatient.id, 'both')}>Reset All AI Usage</button>
                  </div>
                </div>
              )}

              {!selectedPatient && (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="emoji" style={{ fontSize: '2.5rem', marginBottom: 10 }}>⚡</div>
                  <h3>Select a patient to view AI usage</h3>
                  <p style={{ fontSize: 13, color: '#6B7280' }}>Choose from the dropdown above to see their AI diagnosis and health education usage</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CHAT */}
        {activePage === 'chat' && (
          <div>
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <div className="page-header" style={{ marginBottom: 0 }}><h1>Messages</h1><p>Chat with doctors and patients</p></div>
              <button className="btn btn-primary" onClick={() => setShowNewChat(true)}>+ New Message</button>
            </div>
            <div className="chat-layout">
              <div className="chat-sidebar">
                <div className="chat-sidebar-header">
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Conversations</span>
                  {unreadCount > 0 && <span className="nav-badge" style={{ position: 'static' }}>{unreadCount} unread</span>}
                </div>
                <div className="chat-list">
                  {conversations.length === 0 ? <div className="empty-state" style={{ padding: '30px 16px' }}><div className="emoji">💬</div><h3>No conversations</h3></div>
                    : conversations.map(c => (
                      <div key={c.other_user_id} className={`chat-item ${selectedChat?.other_user_id === c.other_user_id ? 'active' : ''}`} onClick={() => selectChat(c)}>
                        <Avatar name={c.other_user_name} role={c.other_user_role} />
                        <div className="chat-item-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span className="chat-item-name">{c.other_user_name}</span>
                            <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: 8, background: ROLE_BG[c.other_user_role], color: ROLE_COLORS[c.other_user_role], fontWeight: 600 }}>{c.other_user_role}</span>
                          </div>
                          <div className="chat-item-last">{c.last_message || 'No messages yet'}</div>
                        </div>
                        {c.unread_count > 0 && <span className="nav-badge" style={{ position: 'static' }}>{c.unread_count}</span>}
                      </div>
                    ))}
                </div>
              </div>
              <div className="chat-main">
                {!selectedChat ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, background: 'var(--grey-50)' }}><div style={{ fontSize: '2.5rem' }}>💬</div><div style={{ fontWeight: 600, color: '#000000' }}>Select a conversation</div><button className="btn btn-primary btn-sm" onClick={() => setShowNewChat(true)}>New Message</button></div> : (
                  <>
                    <div className="chat-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #E5E7EB', background: '#ffffff' }}>
                      <Avatar name={selectedChat.other_user_name} role={selectedChat.other_user_role} size={40} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#000000' }}>{selectedChat.other_user_name}</div>
                        <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <RoleBadge role={selectedChat.other_user_role} />
                        </div>
                      </div>
                      <button onClick={() => deleteConversation(selectedChat)}
                        style={{ background: '#fff0f0', border: '1px solid #fdd', color: '#000000', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                        🗑 Delete
                      </button>
                    </div>
                    <div className="chat-messages" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {chatMessages.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#000000', fontSize: 13, padding: 20 }}>No messages yet. Say hello! 👋</div>
                      )}
                      {groupByDate(chatMessages).map((item, i) => {
                        if (item.type === 'date') return (
                          <div key={i} style={{ textAlign: 'center', margin: '12px 0 4px', fontSize: 11, color: '#000000', fontWeight: 600 }}>── {item.label} ──</div>
                        );
                        const msg = item.msg;
                        const isMine = msg.sender_id === user.id && msg.sender_role === user.role;
                        return (
                          <div key={msg.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
                            {!isMine && (
                              <div style={{ fontSize: 10.5, color: '#000000', marginBottom: 3, marginLeft: 4, fontWeight: 500 }}>{selectedChat.other_user_name}</div>
                            )}
                            <div style={{
                              maxWidth: '70%', padding: '10px 14px',
                              borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                              background: isMine ? '#2563EB' : 'white',
                              color: isMine ? 'white' : '#111827',
                              boxShadow: isMine ? '0 2px 8px rgba(37, 99, 235, 0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
                              border: isMine ? 'none' : '1px solid #E5E7EB',
                              fontSize: 13.5, lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                            }}>{msg.message}</div>
                            <div style={{ fontSize: 10, color: '#000000', marginTop: 3, marginLeft: isMine ? 0 : 4, marginRight: isMine ? 4 : 0 }}>
                              {fmt(msg.created_at)}
                              {isMine && <span style={{ marginLeft: 4, color: msg.is_read ? '#2563EB' : '#9CA3AF' }}>{msg.is_read ? '✓✓' : '✓'}</span>}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                    <div style={{ padding: '10px 16px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10, alignItems: 'flex-end', background: 'white' }}>
                      <textarea rows={1} placeholder={`Message ${selectedChat.other_user_name}...`}
                        value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={handleChatKey}
                        style={{ flex: 1, resize: 'none', borderRadius: 20, padding: '9px 16px', fontSize: 13.5, border: '1.5px solid #E5E7EB', outline: 'none', fontFamily: 'inherit' }} />
                      <button onClick={sendChatMessage} disabled={!chatInput.trim() || chatSending}
                        style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: chatInput.trim() ? '#2563EB' : '#D1D5DB', color: 'white', fontSize: 16, cursor: chatInput.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
                        {chatSending ? '…' : '↑'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            {showNewChat && (
              <div className="modal-overlay" onClick={() => setShowNewChat(false)}>
                <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                  <div className="modal-header"><span className="modal-title">New Message</span><button className="modal-close" onClick={() => setShowNewChat(false)}>✕</button></div>
                  <input className="form-input" placeholder="Search by name or department..." autoFocus value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ marginBottom: 16 }} />
                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {availableUsers.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || (u.department || '').toLowerCase().includes(userSearch.toLowerCase())).length === 0 ? (
                      <div className="empty-state"><div className="emoji">🔍</div><h3>No users found</h3></div>
                    ) : availableUsers.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || (u.department || '').toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                      <div key={`${u.role}:${u.id}`} onClick={() => startNewChat(u)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, border: '1px solid #E5E7EB', transition: 'background 0.1s' }}
                        onMouseOver={e => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <Avatar name={u.name} role={u.role} size={36} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: '#000000' }}>{u.name}</div>
                          <div style={{ fontSize: 12, color: '#000000' }}>{u.department || u.email || (u.role.charAt(0).toUpperCase() + u.role.slice(1))}</div>
                        </div>
                        <RoleBadge role={u.role} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
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
