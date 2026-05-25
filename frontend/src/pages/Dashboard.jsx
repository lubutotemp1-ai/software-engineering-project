import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Dashboard({ setActivePage }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ appointments: 0, records: 0, medications: 0 });
  const [subscription, setSubscription] = useState(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [latestRecord, setLatestRecord] = useState(null);
  const [tips, setTips] = useState([]);
  const [tipIndex, setTipIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apptRes, healthRes, latestRes, medsRes, tipsRes, subRes] = await Promise.all([
          axios.get('/api/appointments'),
          axios.get('/api/health'),
          axios.get('/api/health/latest'),
          axios.get('/api/health/medications'),
          axios.get('/api/education/tips'),
          axios.get('/api/payments/subscription'),
        ]);
        const allAppts = apptRes.data;
        const today = new Date().toISOString().split('T')[0];
        const upcoming = allAppts.filter(a => a.appointment_date >= today && a.status !== 'cancelled');
        setUpcomingAppointments(upcoming.slice(0, 3));
        setStats({ appointments: allAppts.length, records: healthRes.data.length, medications: medsRes.data.length });
        setLatestRecord(latestRes.data);
        setTips(tipsRes.data);
        setSubscription(subRes.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  // Auto-rotate tips
  useEffect(() => {
    if (tips.length === 0) return;
    const iv = setInterval(() => setTipIndex(i => (i + 1) % tips.length), 6000);
    return () => clearInterval(iv);
  }, [tips]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getStatusBadge = (status) => {
    const map = { pending: 'badge-amber', confirmed: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red' };
    return map[status] || 'badge-grey';
  };

  if (loading) return <div className="spinner" />;

  const currentTip = tips[tipIndex];

  return (
    <div>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2563EB, #60A5FA)', borderRadius: 'var(--radius-lg)', padding: '24px 28px', color: 'white', marginBottom: 24, position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: 4 }}>
            {getGreeting()}, {user?.name?.split(' ')[0]}
          </h1>
          <p style={{ color: 'rgba(0, 0, 0, 0.9)', fontSize: '13.5px' }}>Here's your health summary for today.</p>
        </div>
        {subscription && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '20px',
            padding: '8px 16px',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span style={{ fontSize: '20px' }}>💎</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Plan</div>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>{subscription.name}</div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { icon: '📅', label: 'Appointments', value: stats.appointments, bg: 'var(--blue-bg)', color: 'var(--blue)' },
          { icon: '💓', label: 'Health Records', value: stats.records, bg: 'var(--green-bg)', color: 'var(--green)' },
          { icon: '💊', label: 'Medications', value: stats.medications, bg: 'var(--amber-bg)', color: 'var(--amber)' },
          { icon: '🤖', label: 'AI Diagnosis', value: 'Active', bg: 'var(--grey-100)', color: 'var(--grey-600)' },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-icon" style={{ background: s.bg }}>
              <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
            </div>
            <div className="stat-info">
              <h3 style={{ fontSize: typeof s.value === 'string' ? '14px' : '22px', color: s.color }}>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Daily Tip */}
      {currentTip && (
        <div style={{ marginBottom: 20 }}>
          <div className="tip-card" style={{ position: 'relative' }}>
            <div className="tip-icon-wrap">{currentTip.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                Daily Tip · {currentTip.category}
              </div>
              <p style={{ fontSize: '13.5px', color: 'var(--grey-700)', lineHeight: 1.5 }}>{currentTip.tip}</p>
            </div>
            <div style={{ display: 'flex', gap: 4, position: 'absolute', bottom: 10, right: 14 }}>
              {tips.map((_, i) => (
                <div key={i} onClick={() => setTipIndex(i)} style={{ width: i === tipIndex ? 16 : 6, height: 6, borderRadius: 3, background: i === tipIndex ? 'var(--green)' : 'var(--green-border)', cursor: 'pointer', transition: 'all 0.3s' }} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Upcoming Appointments */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Upcoming Appointments</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setActivePage('appointments')}>View all →</button>
          </div>
          {upcomingAppointments.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div className="emoji">📅</div>
              <h3>No upcoming appointments</h3>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => setActivePage('appointments')}>Book Now</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingAppointments.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--grey-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--grey-200)' }}>
                  <div style={{ width: 38, height: 38, background: 'var(--blue-bg)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--blue)', lineHeight: 1.1 }}>{new Date(a.appointment_date + 'T00:00:00').toLocaleDateString('en', { month: 'short' })}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--blue)' }}>{new Date(a.appointment_date + 'T00:00:00').getDate()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--grey-800)' }}>Dr. {a.doctor_name}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--grey-400)' }}>{a.department} · {a.appointment_time}</div>
                  </div>
                  <span className={`badge ${getStatusBadge(a.status)}`}>{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Latest Vitals */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Latest Vitals</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setActivePage('health')}>Track →</button>
          </div>
          {!latestRecord ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div className="emoji">💓</div>
              <h3>No records yet</h3>
              <button className="btn btn-green btn-sm" style={{ marginTop: 10 }} onClick={() => setActivePage('health')}>Add Record</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Weight', value: latestRecord.weight ? `${latestRecord.weight} kg` : '—', icon: '⚖️' },
                { label: 'Blood Pressure', value: latestRecord.blood_pressure || '—', icon: '🩺' },
                { label: 'Heart Rate', value: latestRecord.heart_rate ? `${latestRecord.heart_rate} bpm` : '—', icon: '❤️' },
                { label: 'Blood Sugar', value: latestRecord.blood_sugar ? `${latestRecord.blood_sugar} mg/dL` : '—', icon: '🩸' },
                { label: 'Temperature', value: latestRecord.temperature ? `${latestRecord.temperature}°C` : '—', icon: '🌡️' },
                { label: 'Recorded', value: new Date(latestRecord.record_date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' }), icon: '📆' },
              ].map((v, i) => (
                <div key={i} style={{ background: 'var(--grey-50)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', border: '1px solid var(--grey-200)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--grey-400)', marginBottom: 2 }}>{v.icon} {v.label}</div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--grey-800)' }}>{v.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title" style={{ marginBottom: 14 }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: '📅 Book Appointment', page: 'appointments', cls: 'btn-primary' },
            { label: '🤖 AI Diagnosis', page: 'diagnosis', cls: 'btn-green' },
            { label: '💬 Messages', page: 'chat', cls: 'btn-outline' },
            { label: '📚 Health AI', page: 'education', cls: 'btn-outline' },
            { label: '💓 Log Vitals', page: 'health', cls: 'btn-outline' },
          ].map(a => (
            <button key={a.page} className={`btn ${a.cls}`} onClick={() => setActivePage(a.page)}>{a.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
