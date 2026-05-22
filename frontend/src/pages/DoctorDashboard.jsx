import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// ── Shared helpers ────────────────────────────────────────────────
const ROLE_COLORS = { patient: '#2563EB', doctor: '#10B981', admin: '#F59E0B' };
const ROLE_BG     = { patient: '#eef0ff', doctor: '#eafaf1', admin: '#fef9ee' };
const ROLE_LABELS = { patient: 'Patient',  doctor: 'Doctor',  admin: 'Admin'  };

function Avatar({ name, role, size = 36 }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: ROLE_BG[role] || '#e08181', color: ROLE_COLORS[role] || '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.37, fontWeight: 700, flexShrink: 0, border: `2px solid ${ROLE_COLORS[role] || '#ddd'}` }}>
      {initials}
    </div>
  );
}

function RoleBadge({ role }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: ROLE_BG[role] || '#f0f0f0', color: ROLE_COLORS[role] || '#666', fontWeight: 700 }}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function fmt(ts) {
  const d = new Date(ts), diff = Date.now() - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
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

// ── Schedule Calendar ─────────────────────────────────────────────
function ScheduleCalendar({ blockedDates, onToggleBlock }) {
  const [month, setMonth] = useState(new Date());
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay  = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const days = [];
  for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  }
  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 14 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()-1, 1))}>←</button>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{month.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()+1, 1))}>→</button>
      </div>
      <div className="calendar-grid">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="cal-day-label">{d}</div>)}
        {days.map((date, i) => {
          if (!date) return <div key={i} />;
          const isPast = date < today, isToday = date === today;
          const isBlocked = blockedDates.some(b => b.schedule_date === date);
          return (
            <div key={date} className={`cal-day ${isToday?'today':''} ${isBlocked?'blocked':''} ${isPast?'disabled':''}`}
              onClick={() => !isPast && onToggleBlock(date, isBlocked)}>
              {new Date(date+'T00:00:00').getDate()}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 12, fontSize: 11.5, color: '#000000' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, background: 'var(--red-bg)', borderRadius: 2, border: '1px solid var(--red)', display: 'inline-block' }} /> Blocked</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, border: '1px solid var(--blue)', borderRadius: 2, display: 'inline-block' }} /> Today</span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function DoctorDashboard({ onLogout, user }) {
  const [appointments, setAppointments]     = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activePage, setActivePage]         = useState('overview');
  const [loading, setLoading]               = useState(true);
  const [success, setSuccess]               = useState('');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showMedModal, setShowMedModal]     = useState(false);
  const [recordForm, setRecordForm] = useState({
    record_date: new Date().toISOString().split('T')[0],
    weight: '', height: '', blood_pressure: '',
    heart_rate: '', blood_sugar: '', temperature: '', notes: ''
  });
  const [medForm, setMedForm] = useState({
    name: '', dosage: '', frequency: '', start_date: '', end_date: '', notes: ''
  });
  const [blockedDates, setBlockedDates]     = useState([]);
  const [blockReason, setBlockReason]       = useState('');

  // Chat state
  const [conversations, setConversations]   = useState([]);
  const [selectedChat, setSelectedChat]     = useState(null);
  const [chatMessages, setChatMessages]     = useState([]);
  const [chatInput, setChatInput]           = useState('');
  const [chatSending, setChatSending]       = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showNewChat, setShowNewChat]       = useState(false);
  const [userSearch, setUserSearch]         = useState('');
  const [chatSearch, setChatSearch]         = useState('');
  const [unreadCount, setUnreadCount]       = useState(0);
  const [deletingConvo, setDeletingConvo]   = useState(null);

  const [diagnoses, setDiagnoses]           = useState([]);
  const messagesEndRef = useRef(null);
  const pollingRef     = useRef(null);

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
      await Promise.all([fetchAppointments(), fetchSchedules(), fetchConversations(), fetchAvailableUsers(), fetchUnread(), fetchDiagnoses()]);
    } finally { setLoading(false); }
  };

  const fetchAppointments  = async () => { const r = await axios.get('/api/doctor/appointments'); setAppointments(r.data); };
  const fetchSchedules     = async () => { const r = await axios.get('/api/schedules/my-schedules'); setBlockedDates(r.data.filter(s => s.is_available === 0)); };
  const fetchUnread        = async () => { try { const r = await axios.get('/api/chat/unread-count'); setUnreadCount(r.data.count); } catch {} };
  const fetchDiagnoses     = async () => { try { const r = await axios.get('/api/diagnosis/received'); setDiagnoses(r.data || []); } catch {} };

  const fetchConversations = async () => {
    try {
      const r = await axios.get('/api/chat/conversations');
      const seen = new Set();
      const unique = (r.data || []).filter(c => {
        const key = `${c.other_user_role}:${c.other_user_id}`;
        if (seen.has(key)) return false;
        seen.add(key); return true;
      });
      setConversations(unique);
    } catch {}
  };

  const fetchAvailableUsers = async () => { try { const r = await axios.get('/api/chat/users'); setAvailableUsers(r.data || []); } catch {} };

  const fetchChatMessages = async (otherId, otherRole) => {
    try {
      const r = await axios.get(`/api/chat/messages/${otherId}?otherRole=${otherRole || ''}`);
      setChatMessages(r.data || []);
      fetchConversations(); fetchUnread();
    } catch {}
  };

  const selectChat = (convo) => {
    setSelectedChat(convo);
    fetchChatMessages(convo.other_user_id, convo.other_user_role);
  };

  const startNewChat = (targetUser) => {
    const existing = conversations.find(c => c.other_user_id === targetUser.id && c.other_user_role === targetUser.role);
    if (existing) { selectChat(existing); }
    else {
      setSelectedChat({ other_user_id: targetUser.id, other_user_name: targetUser.name, other_user_role: targetUser.role, department: targetUser.department });
      setChatMessages([]);
    }
    setShowNewChat(false); setUserSearch('');
  };

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedChat || chatSending) return;
    setChatSending(true);
    try {
      await axios.post('/api/chat/send', { receiverId: selectedChat.other_user_id, receiverRole: selectedChat.other_user_role, message: chatInput.trim() });
      setChatInput('');
      fetchChatMessages(selectedChat.other_user_id, selectedChat.other_user_role);
      fetchConversations();
    } catch (err) { alert(err.response?.data?.error || 'Failed to send.'); }
    finally { setChatSending(false); }
  };

  const deleteConversation = async (convo) => {
    if (!window.confirm(`Delete entire conversation with ${convo.other_user_name}? This cannot be undone.`)) return;
    setDeletingConvo(convo.other_user_id);
    try {
      await axios.delete(`/api/chat/conversation/${convo.other_user_id}?otherRole=${convo.other_user_role}`);
      if (selectedChat?.other_user_id === convo.other_user_id) { setSelectedChat(null); setChatMessages([]); }
      fetchConversations();
    } catch (err) { alert(err.response?.data?.error || 'Failed to delete.'); }
    finally { setDeletingConvo(null); }
  };

  const handleChatKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(e); } };

  const toggleBlock = async (date, isBlocked) => {
    try {
      if (isBlocked) {
        // Unblocking - just do it without confirmation
        const e = blockedDates.find(b => b.schedule_date === date);
        if (e) await axios.delete(`/api/schedules/${e.id}`);
        fetchSchedules();
        showSuccessMsg('Date unblocked.');
      } else {
        // Blocking - show confirmation dialog
        const confirmed = window.confirm(
          `Are you sure you want to block ${new Date(date + 'T00:00:00').toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}?\n\nPatients will not be able to book appointments on this date.`
        );
        if (confirmed) {
          await axios.post('/api/schedules/block', { dates: [date], reason: blockReason || 'Not available' });
          fetchSchedules();
          showSuccessMsg('Date blocked successfully.');
        }
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update schedule.');
    }
  };

  const showSuccessMsg = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };
  const updateStatus   = async (id, status) => { await axios.put(`/api/doctor/appointments/${id}`, { status }); showSuccessMsg(`Marked as ${status}.`); fetchAppointments(); };

  const viewPatientRecords = async (patientId) => {
    try {
      const res = await axios.get(`/api/doctor/patients/${patientId}/records`);
      setSelectedPatient(res.data);
      setActivePage('patientRecords');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load patient records.');
    }
  };

  // Add health record for patient
  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!selectedPatient?.patient?.id) return;
    try {
      if (!recordForm.record_date) {
        alert('Please select a date');
        return;
      }
      await axios.post(`/api/health/patient/${selectedPatient.patient.id}`, recordForm);
      showSuccessMsg('Health record saved!');
      setShowRecordModal(false);
      setRecordForm({ record_date: new Date().toISOString().split('T')[0], weight: '', height: '', blood_pressure: '', heart_rate: '', blood_sugar: '', temperature: '', notes: '' });
      // Refresh patient records
      viewPatientRecords(selectedPatient.patient.id);
    } catch (err) {
      console.error('Error saving health record:', err);
      alert(err.response?.data?.error || 'Failed to save health record.');
    }
  };

  // Add medication for patient
  const handleAddMedication = async (e) => {
    e.preventDefault();
    if (!selectedPatient?.patient?.id) return;
    try {
      if (!medForm.name) {
        alert('Please enter medication name');
        return;
      }
      await axios.post(`/api/health/patient/${selectedPatient.patient.id}/medication`, medForm);
      showSuccessMsg('Medication prescribed!');
      setShowMedModal(false);
      setMedForm({ name: '', dosage: '', frequency: '', start_date: '', end_date: '', notes: '' });
      // Refresh patient records
      viewPatientRecords(selectedPatient.patient.id);
    } catch (err) {
      console.error('Error prescribing medication:', err);
      alert(err.response?.data?.error || 'Failed to prescribe medication.');
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const todayAppts    = appointments.filter(a => a.appointment_date === today);
  const upcomingAppts = appointments.filter(a => a.appointment_date > today);
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'DR';
  const getStatusBadge = s => ({ pending: 'badge-amber', confirmed: 'badge-blue', completed: 'badge-green', denied: 'badge-red', cancelled: 'badge-red' }[s] || 'badge-grey');

  const navItems = [
    { id: 'overview',     label: 'Overview',      icon: '⬛' },
    { id: 'appointments', label: 'Appointments',   icon: '📅' },
    { id: 'schedule',     label: 'My Schedule',    icon: '🗓️' },
    { id: 'chat',         label: 'Messages',       icon: '💬', badge: unreadCount },
    { id: 'diagnoses',    label: 'AI Diagnoses',   icon: '🤖' },
  ];

  const filteredConvos = conversations.filter(c =>
    !chatSearch || c.other_user_name?.toLowerCase().includes(chatSearch.toLowerCase())
  );

  const groupedAvailable = availableUsers
    .filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || (u.department||'').toLowerCase().includes(userSearch.toLowerCase()))
    .reduce((acc, u) => { const g = ROLE_LABELS[u.role]+'s'; if (!acc[g]) acc[g]=[]; acc[g].push(u); return acc; }, {});

  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;

  return (
    <div className="app-layout">
      <button 
        className="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle sidebar"
        style={{
          position: 'fixed',
          top: 20,
          left: 20,
          zIndex: 1001,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg viewBox="-0.5 -0.5 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" id="Sidebar-Collapse--Streamline-Iconoir" height="24" width="24">
          <desc>Sidebar Collapse Streamline Icon: https://streamlinehq.com</desc>
          <path d="M12.7769375 14.284625H2.2230625c-0.8326875 0 -1.5076875 -0.675 -1.5076875 -1.5076875l0 -10.553875c0 -0.8326875 0.675 -1.5076875 1.5076875 -1.5076875h10.553875c0.8326875 0 1.5076875 0.675 1.5076875 1.5076875v10.553875c0 0.8326875 -0.675 1.5076875 -1.5076875 1.5076875Z" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path>
          <path d="M3.9192500000000003 5.9923125 2.6 7.5l1.3192499999999998 1.5076875" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path>
          <path d="M5.615375 14.284625V0.7153750000000001" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path>
        </svg>
      </button>
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
      {/* ── Sidebar ── */}
      <aside className={`sidebar doctor-sidebar ${isOpen ? 'open' : 'closed'}`}>
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
            <button key={item.id}
              className={`nav-item ${activePage === item.id || (activePage === 'patientRecords' && item.id === 'appointments') ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}>
              <span className="nav-icon">{item.icon}</span>{item.label}
              {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar" style={{ background: 'rgb(0, 51, 255)', color: '#ffffff' }}>{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">Doctor</div>
            </div>
          </div>
          <button className="nav-item" onClick={onLogout} style={{ color: '#000000', width: '100%' }}>
            <span className="nav-icon">↩</span>Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>✓ {success}</div>}

        {/* ── OVERVIEW ── */}
        {activePage === 'overview' && (
          <div>
            <div style={{ background: 'var(--grey-900)', borderRadius: 'var(--radius-lg)', padding: '24px 28px', color: '#000000', marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Welcome, Dr. {user?.name?.split(' ').slice(-1)[0]}</h1>
              <p style={{ color: '#000000', fontSize: 13.5 }}>{todayAppts.length} appointment{todayAppts.length !== 1 ? 's' : ''} today · {upcomingAppts.length} upcoming</p>
            </div>
            <div className="stats-grid">
              {[
                { icon: '📆', label: 'Today',           value: todayAppts.length,                                       bg: 'var(--blue-bg)',  c: 'var(--blue)' },
                { icon: '📅', label: 'Upcoming',         value: upcomingAppts.length,                                    bg: 'var(--green-bg)', c: 'var(--green)' },
                { icon: '✅', label: 'Completed',         value: appointments.filter(a=>a.status==='completed').length,  bg: 'var(--grey-100)', c: 'var(--grey-600)' },
                { icon: '💬', label: 'Unread Messages',  value: unreadCount, bg: unreadCount>0?'var(--amber-bg)':'var(--grey-100)', c: unreadCount>0?'var(--amber)':'var(--grey-600)' },
              ].map((s, i) => (
                <div className="stat-card" key={i}>
                  <div className="stat-icon" style={{ background: s.bg }}><span style={{ fontSize: '1.2rem' }}>{s.icon}</span></div>
                  <div className="stat-info"><h3 style={{ color: s.c }}>{s.value}</h3><p>{s.label}</p></div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Today's Schedule</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setActivePage('appointments')}>View all →</button>
              </div>
              {todayAppts.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px 0' }}><div className="emoji">🎉</div><h3>No appointments today</h3></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {todayAppts.slice(0, 5).map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--grey-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--grey-200)' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{a.patient_name}</div>
                        <div style={{ fontSize: 12, color: '#000000' }}>{a.appointment_time} · {a.title || a.reason || 'No reason given'}</div>
                      </div>
                      <span className={`badge ${getStatusBadge(a.status)}`}>{a.status}</span>
                      <button className="btn btn-outline btn-sm" onClick={() => viewPatientRecords(a.patient_id)}>Records</button>
                      {a.status === 'pending' && (
                        <>
                          <button className="btn btn-green btn-sm" onClick={() => updateStatus(a.id, 'confirmed')}>Confirm</button>
                          <button className="btn btn-sm" onClick={() => updateStatus(a.id, 'denied')} style={{ background: '#ef4444', borderColor: '#dc2626', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Deny</button>
                        </>
                      )}
                      {a.status === 'confirmed' && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(a.id, 'completed')}>Done</button>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── APPOINTMENTS ── */}
        {activePage === 'appointments' && (
          <div>
            <div className="page-header"><h1>Appointments</h1><p>Manage all your patient appointments</p></div>
            <div className="card">
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Patient</th><th>Date</th><th>Time</th><th>Title / Reason</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {appointments.length === 0 ? (
                      <tr><td colSpan={6}><div className="empty-state"><div className="emoji">📅</div><h3>No appointments</h3></div></td></tr>
                    ) : appointments.map(a => (
                      <tr key={a.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{a.patient_name}</div>
                          <div style={{ fontSize: 11.5, color: '#000000' }}>{a.patient_email}</div>
                          {a.blood_type && <div style={{ fontSize: 11, color: '#000000' }}>🩸 {a.blood_type}</div>}
                        </td>
                        <td style={{ fontSize: 13 }}>{new Date(a.appointment_date+'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td style={{ fontSize: 13 }}>{a.appointment_time}</td>
                        <td style={{ fontSize: 12.5, color: '#000000' }}>{a.title || a.reason || '—'}</td>
                        <td><span className={`badge ${getStatusBadge(a.status)}`}>{a.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button className="btn btn-outline btn-sm" onClick={() => viewPatientRecords(a.patient_id)}>Records</button>
                            {a.status === 'pending' && (
                              <>
                                <button className="btn btn-green btn-sm" onClick={() => updateStatus(a.id, 'confirmed')}>Confirm</button>
                                <button className="btn btn-sm" onClick={() => updateStatus(a.id, 'denied')} style={{ background: '#ef4444', borderColor: '#dc2626', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Deny</button>
                              </>
                            )}
                            {a.status === 'confirmed' && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(a.id, 'completed')}>Done</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── SCHEDULE ── */}
        {activePage === 'schedule' && (
          <div>
            <div className="page-header"><h1>My Schedule & Availability</h1><p>Block dates when you are unavailable</p></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
              <div className="card">
                <div className="card-title" style={{ marginBottom: 16 }}>Availability Calendar</div>
                <div className="form-group">
                  <label className="form-label">Block Reason (optional)</label>
                  <input className="form-input" placeholder="E.g., Public holiday, Conference, Leave..." value={blockReason} onChange={e => setBlockReason(e.target.value)} />
                </div>
                <p style={{ fontSize: 12, color: '#000000', marginBottom: 14 }}>Click any future date to block/unblock it.</p>
                <ScheduleCalendar blockedDates={blockedDates} onToggleBlock={toggleBlock} />
              </div>
              <div className="card">
                <div className="card-title" style={{ marginBottom: 12 }}>Blocked Dates ({blockedDates.length})</div>
                {blockedDates.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px 0' }}><div className="emoji">✅</div><h3>All dates open</h3></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
                    {blockedDates.sort((a,b) => a.schedule_date.localeCompare(b.schedule_date)).map(b => (
                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--red-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#000000' }}>{new Date(b.schedule_date+'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                          {b.reason && <div style={{ fontSize: 11.5, color: '#000000' }}>{b.reason}</div>}
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleBlock(b.schedule_date, true)} style={{ color: '#000000' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── CHAT (full parity with patient chat) ── */}
        {activePage === 'chat' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div className="page-header" style={{ marginBottom: 0 }}><h1>Messages</h1><p>Chat with patients, admins and other doctors</p></div>
              <button className="btn btn-primary" onClick={() => setShowNewChat(true)}>+ New Message</button>
            </div>

            <div className="chat-layout">
              {/* Sidebar */}
              <div className="chat-sidebar">
                <div className="chat-sidebar-header">
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#000000' }}>Conversations</span>
                  {unreadCount > 0 && <span className="nav-badge" style={{ position: 'static' }}>{unreadCount} unread</span>}
                </div>
                <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f0' }}>
                  <input className="form-input" placeholder="Search..." style={{ fontSize: 12.5, padding: '7px 10px' }}
                    value={chatSearch} onChange={e => setChatSearch(e.target.value)} />
                </div>
                <div className="chat-list">
                  {filteredConvos.length === 0 ? (
                    <div className="empty-state" style={{ padding: '30px 16px' }}><div className="emoji">💬</div><h3>No conversations</h3><p>Start a new message</p></div>
                  ) : filteredConvos.map(c => {
                    const isActive = selectedChat?.other_user_id === c.other_user_id && selectedChat?.other_user_role === c.other_user_role;
                    return (
                      <div key={`${c.other_user_role}:${c.other_user_id}`}
                        className={`chat-item ${isActive ? 'active' : ''}`}
                        style={{ position: 'relative' }}
                        onClick={() => selectChat(c)}>
                        <Avatar name={c.other_user_name} role={c.other_user_role} />
                        <div className="chat-item-info" style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span className="chat-item-name">{c.other_user_name}</span>
                            <RoleBadge role={c.other_user_role} />
                          </div>
                          <div className="chat-item-last" style={{ color: '#000000', fontSize: 11.5 }}>{c.last_message || 'Start a conversation'}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                          {c.last_message_time && <span style={{ fontSize: 10.5, color: '#000000' }}>{fmt(c.last_message_time)}</span>}
                          {c.unread_count > 0 && <span className="nav-badge" style={{ position: 'static' }}>{c.unread_count}</span>}
                          <button
                            onClick={e => { e.stopPropagation(); deleteConversation(c); }}
                            disabled={deletingConvo === c.other_user_id}
                            title="Delete conversation"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#000000', fontSize: 13, padding: '2px 4px', borderRadius: 4, transition: 'color 0.15s' }}
                            onMouseOver={e => e.currentTarget.style.color = '#e74c3c'}
                            onMouseOut={e => e.currentTarget.style.color = '#ccc'}>🗑</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chat main */}
              <div className="chat-main">
                {!selectedChat ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, background: '#fafafa' }}>
                    <div style={{ fontSize: '3rem' }}>💬</div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#000000' }}>Select a conversation</div>
                    <div style={{ fontSize: 13, color: '#000000' }}>or start a new one</div>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowNewChat(true)}>New Message</button>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #f0f0f0', background: 'white' }}>
                      <Avatar name={selectedChat.other_user_name} role={selectedChat.other_user_role} size={40} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#000000' }}>{selectedChat.other_user_name}</div>
                        <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <RoleBadge role={selectedChat.other_user_role} />
                          {selectedChat.department && <span style={{ color: '#000000' }}>· {selectedChat.department}</span>}
                        </div>
                      </div>
                      <button onClick={() => deleteConversation(selectedChat)}
                        style={{ background: '#fff0f0', border: '1px solid #fdd', color: '#000000', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                        🗑 Delete Chat
                      </button>
                    </div>

                    {/* Messages */}
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
                              color: isMine ? 'white' : '#1a1a2e',
                              boxShadow: isMine ? '0 2px 8px rgba(67,97,238,0.25)' : '0 2px 8px rgba(0,0,0,0.08)',
                              border: isMine ? 'none' : '1px solid #f0f0f0',
                              fontSize: 13.5, lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                            }}>{msg.message}</div>
                            <div style={{ fontSize: 10, color: '#000000', marginTop: 3, marginLeft: isMine ? 0 : 4, marginRight: isMine ? 4 : 0 }}>
                              {fmt(msg.created_at)}
                              {isMine && <span style={{ marginLeft: 4, color: msg.is_read ? '#2563EB' : '#ccc' }}>{msg.is_read ? '✓✓' : '✓'}</span>}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div style={{ padding: '12px 28px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 12, alignItems: 'flex-end', background: 'white', overflow: 'visible' }}>
                      <textarea rows={1} placeholder={`Message ${selectedChat.other_user_name}...`}
                        value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={handleChatKey}
                        style={{ flex: 1, resize: 'none', borderRadius: 20, padding: '9px 16px', fontSize: 13.5, border: '1.5px solid #e0e0e0', outline: 'none', fontFamily: 'inherit' }} />
                      <button onClick={sendChatMessage} disabled={!chatInput.trim() || chatSending}
                        style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: chatInput.trim() ? '#2563EB' : '#D1D5DB', color: 'white', fontSize: 14, cursor: chatInput.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
                        {chatSending ? '…' : '↑'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* New Chat Modal */}
            {showNewChat && (
              <div className="modal-overlay" onClick={() => setShowNewChat(false)}>
                <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                  <div className="modal-header"><span className="modal-title">New Message</span><button className="modal-close" onClick={() => setShowNewChat(false)}>✕</button></div>
                  <input className="form-input" placeholder="Search by name or department..." autoFocus value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ marginBottom: 16 }} />
                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {Object.keys(groupedAvailable).length === 0 ? (
                      <div className="empty-state"><div className="emoji">🔍</div><h3>No users found</h3></div>
                    ) : Object.entries(groupedAvailable).map(([group, users]) => (
                      <div key={group}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '10px 0 6px' }}>{group}</div>
                        {users.map(u => (
                          <div key={`${u.role}:${u.id}`} onClick={() => startNewChat(u)}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, border: '1px solid #f0f0f0', transition: 'background 0.1s' }}
                            onMouseOver={e => e.currentTarget.style.background = '#fafafa'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <Avatar name={u.name} role={u.role} size={36} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{u.name}</div>
                              <div style={{ fontSize: 12, color: '#000000' }}>{u.department || u.email || ROLE_LABELS[u.role]}</div>
                            </div>
                            <RoleBadge role={u.role} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AI DIAGNOSES ── */}
        {activePage === 'diagnoses' && (
          <div>
            <div className="page-header"><h1>AI Diagnoses from Patients</h1><p>Review diagnoses that patients have shared with you</p></div>
            {diagnoses.length === 0 ? (
              <div className="card"><div className="empty-state"><div className="emoji">🤖</div><h3>No diagnoses received</h3><p>Patients can send their AI diagnosis reports to you from their Diagnosis page</p></div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {diagnoses.map(d => (
                  <div key={d.id} className="card">
                    <div className="flex-between" style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 600 }}>From: {d.patient_name}</div>
                      <span style={{ fontSize: 12, color: '#000000' }}>{new Date(d.created_at).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#000000', marginBottom: 8 }}>
                      <strong>Symptoms:</strong> {d.symptoms}
                      {d.duration && <> · <strong>Duration:</strong> {d.duration}</>}
                      {d.severity && <> · <span className={`badge badge-${d.severity==='mild'?'green':d.severity==='moderate'?'amber':'red'}`}>{d.severity}</span></>}
                    </div>
                    <div style={{ background: 'var(--grey-50)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, color: '#000000', lineHeight: 1.7, maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>{d.diagnosis}</div>
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}
                      onClick={() => { startNewChat({ id: d.patient_id, name: d.patient_name, role: 'patient' }); setActivePage('chat'); }}>
                      💬 Message Patient
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PATIENT RECORDS ── */}
      {/* Add Health Record Modal */}
      {showRecordModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowRecordModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">💓 Add Health Vitals for {selectedPatient.patient?.name}</h3>
              <button className="modal-close" onClick={() => setShowRecordModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddRecord}>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input type="date" className="form-input" value={recordForm.record_date}
                  onChange={e => setRecordForm({ ...recordForm, record_date: e.target.value })} required />
              </div>
              <div className="form-grid">
                {[
                  { key: 'weight', label: 'Weight (kg)', type: 'number', placeholder: '70' },
                  { key: 'height', label: 'Height (cm)', type: 'number', placeholder: '175' },
                  { key: 'blood_pressure', label: 'Blood Pressure', type: 'text', placeholder: '120/80' },
                  { key: 'heart_rate', label: 'Heart Rate (bpm)', type: 'number', placeholder: '72' },
                  { key: 'blood_sugar', label: 'Blood Sugar (mg/dL)', type: 'number', placeholder: '100' },
                  { key: 'temperature', label: 'Temperature (°C)', type: 'number', placeholder: '36.5' },
                ].map(f => (
                  <div className="form-group" key={f.key}>
                    <label className="form-label">{f.label}</label>
                    <input className="form-input" type={f.type} placeholder={f.placeholder}
                      value={recordForm[f.key]}
                      onChange={e => setRecordForm({ ...recordForm, [f.key]: e.target.value })} />
                  </div>
                ))}
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows={2} placeholder="Any clinical notes..."
                  value={recordForm.notes}
                  onChange={e => setRecordForm({ ...recordForm, notes: e.target.value })}
                  style={{ resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowRecordModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Medication Modal */}
      {showMedModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowMedModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">💊 Prescribe Medication for {selectedPatient.patient?.name}</h3>
              <button className="modal-close" onClick={() => setShowMedModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddMedication}>
              <div className="form-group">
                <label className="form-label">Medication Name *</label>
                <input className="form-input" placeholder="e.g. Paracetamol" value={medForm.name}
                  onChange={e => setMedForm({ ...medForm, name: e.target.value })} required />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Dosage</label>
                  <input className="form-input" placeholder="e.g. 500mg" value={medForm.dosage}
                    onChange={e => setMedForm({ ...medForm, dosage: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Frequency</label>
                  <select className="form-input" value={medForm.frequency}
                    onChange={e => setMedForm({ ...medForm, frequency: e.target.value })}>
                    <option value="">Select...</option>
                    {['Once daily', 'Twice daily', 'Three times daily', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'As needed', 'Weekly'].map(f =>
                      <option key={f} value={f}>{f}</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input type="date" className="form-input" value={medForm.start_date}
                    onChange={e => setMedForm({ ...medForm, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input type="date" className="form-input" value={medForm.end_date}
                    onChange={e => setMedForm({ ...medForm, end_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Instructions/Notes</label>
                <textarea className="form-input" rows={2} placeholder="e.g. Take after meals..."
                  value={medForm.notes}
                  onChange={e => setMedForm({ ...medForm, notes: e.target.value })}
                  style={{ resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowMedModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Prescribe Medication</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PATIENT RECORDS ── */}
      {activePage === 'patientRecords' && selectedPatient && (() => {
          const { patient, healthRecords, medications, appointmentHistory, sharedDiagnoses } = selectedPatient;
          const latest = healthRecords[0];
          return (
            <div>
              <button className="btn btn-outline btn-sm" style={{ marginBottom: 18 }} onClick={() => setActivePage('appointments')}>← Back to Appointments</button>

              {/* Patient banner */}
              <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #2d2d4e)', borderRadius: 14, padding: '20px 24px', color: 'white', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#2563EB', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>
                  {patient.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{patient.name}</div>
                  <div style={{ fontSize: 13, color: '#000000', marginBottom: 8 }}>
                    <span>📧 {patient.email}</span>
                    {patient.phone && <span>📞 {patient.phone}</span>}
                    {patient.date_of_birth && <span>🎂 {new Date(patient.date_of_birth+'T00:00:00').toLocaleDateString('en', { year:'numeric', month:'long', day:'numeric' })}</span>}
                    {patient.blood_type && <span style={{ background: '#e74c3c', padding: '1px 10px', borderRadius: 20, fontWeight: 700 }}>🩸 {patient.blood_type}</span>}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* Latest Vitals */}
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 14 }}>📊 Latest Vitals</div>
                  {!latest ? (
                    <div className="empty-state" style={{ padding: '20px 0' }}><h3>No vitals recorded</h3></div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        ['⚖️ Weight',        latest.weight        ? `${latest.weight} kg`       : '—'],
                        ['📏 Height',        latest.height        ? `${latest.height} cm`       : '—'],
                        ['🩺 Blood Pressure', latest.blood_pressure || '—'],
                        ['❤️ Heart Rate',    latest.heart_rate    ? `${latest.heart_rate} bpm`  : '—'],
                        ['🩸 Blood Sugar',   latest.blood_sugar   ? `${latest.blood_sugar} mg/dL`: '—'],
                        ['🌡️ Temperature',   latest.temperature   ? `${latest.temperature}°C`   : '—'],
                      ].map(([k,v], i) => (
                        <div key={i} style={{ background: 'var(--grey-50)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--grey-200)' }}>
                          <div style={{ fontSize: 11, color: '#000000', marginBottom: 3 }}>{k}</div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: v === '—' ? '#ccc' : '#1a1a2e' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {latest?.notes && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: '#EFF6FF', borderRadius: 8, fontSize: 12.5, color: '#000000', borderLeft: '3px solid #2563EB' }}>
                      📝 {latest.notes}
                    </div>
                  )}
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowRecordModal(true)}>+ Add Vitals</button>
                    <button className="btn btn-outline btn-sm" onClick={() => { setRecordForm({ record_date: new Date().toISOString().split('T')[0], weight: '', height: '', blood_pressure: '', heart_rate: '', blood_sugar: '', temperature: '', notes: '' }); setShowRecordModal(true); }}>Reset Form</button>
                  </div>
                </div>

                {/* Medications */}
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 14 }}>💊 Current Medications</div>
                  {medications.length === 0 ? (
                    <div className="empty-state" style={{ padding: '20px 0' }}><h3>No medications recorded</h3></div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {medications.map(m => (
                        <div key={m.id} style={{ padding: '10px 14px', background: 'var(--grey-50)', borderRadius: 8, border: '1px solid var(--grey-200)' }}>
                          <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 3 }}>💊 {m.name}</div>
                          <div style={{ fontSize: 12, color: '#000000' }}>{[m.dosage, m.frequency].filter(Boolean).join(' · ')}</div>
                          {m.notes && <div style={{ fontSize: 11.5, color: '#000000', marginTop: 3 }}>{m.notes}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowMedModal(true)}>+ Add Medication</button>
                    <button className="btn btn-outline btn-sm" onClick={() => { setMedForm({ name: '', dosage: '', frequency: '', start_date: '', end_date: '', notes: '' }); setShowMedModal(true); }}>Reset Form</button>
                  </div>
                </div>
              </div>

              {/* Appointment history */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-title" style={{ marginBottom: 14 }}>📅 Appointment History with You</div>
                {!appointmentHistory?.length ? (
                  <div className="empty-state" style={{ padding: '20px 0' }}><h3>No appointment history</h3></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {appointmentHistory.map(a => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--grey-50)', borderRadius: 8, border: '1px solid var(--grey-200)' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{a.title || 'Appointment'}</div>
                          <div style={{ fontSize: 12, color: '#000000' }}>{new Date(a.appointment_date+'T00:00:00').toLocaleDateString('en', { weekday:'short', month:'short', day:'numeric', year:'numeric' })} at {a.appointment_time}</div>
                          {a.description && <div style={{ fontSize: 12, color: '#000000', marginTop: 2 }}>{a.description}</div>}
                        </div>
                        <span className={`badge ${getStatusBadge(a.status)}`}>{a.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shared AI diagnoses */}
              {sharedDiagnoses?.length > 0 && (
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 14 }}>🤖 AI Diagnoses Shared by Patient</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {sharedDiagnoses.map(d => (
                      <div key={d.id} style={{ padding: '12px 14px', background: '#f8f9ff', borderRadius: 10, border: '1px solid #e0e5ff' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                          <span className={`badge badge-${d.severity==='mild'?'green':d.severity==='moderate'?'amber':'red'}`}>{d.severity}</span>
                          <span style={{ fontSize: 12, color: '#000000' }}>{new Date(d.created_at).toLocaleString()}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Symptoms: {d.symptoms}</div>
                        <div style={{ fontSize: 12.5, color: '#000000', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{d.diagnosis}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </main>
    </div>
  );
}