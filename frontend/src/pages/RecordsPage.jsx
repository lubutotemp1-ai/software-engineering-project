import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function RecordsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [medications, setMedications] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [profileRes, apptRes, healthRes, medRes, subRes] = await Promise.all([
          axios.get('/api/auth/me'),
          axios.get('/api/appointments'),
          axios.get('/api/health'),
          axios.get('/api/health/medications'),
          axios.get('/api/payments/subscription'),
        ]);
        setProfile(profileRes.data);
        setAppointments(apptRes.data);
        setHealthRecords(healthRes.data);
        setMedications(medRes.data);
        setSubscription(subRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handlePurchasePlan = async (planId) => {
    if (subscription?.plan_id === planId) {
      alert('You are already on this plan!');
      return;
    }
    
    setPurchasing(true);
    try {
      const response = await axios.post('/api/payments/create-checkout-session', { plan_id: planId });
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (err) {
      alert('Failed to create checkout session: ' + (err.response?.data?.error || err.message));
      setPurchasing(false);
    }
  };

  if (loading) return <div className="spinner" />;

  const completedAppts = appointments.filter(a => a.status === 'completed' || a.status === 'confirmed');
  const latestRecord = healthRecords[0];

  const calculateBMI = () => {
    if (!latestRecord?.weight || !latestRecord?.height) return null;
    const bmi = (latestRecord.weight / ((latestRecord.height / 100) ** 2)).toFixed(1);
    let category = '';
    if (bmi < 18.5) category = 'Underweight';
    else if (bmi < 25) category = 'Normal';
    else if (bmi < 30) category = 'Overweight';
    else category = 'Obese';
    return { bmi, category };
  };

  const bmiData = calculateBMI();

  return (
    <div>
      <div className="page-header">
        <h1>📋 Patient Records</h1>
        <p>Your complete medical profile and history</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, alignItems: 'start' }}>
        {/* Profile Card */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563EB, #60A5FA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', margin: '0 auto 16px', color: 'white',
            fontWeight: 700,
          }}>
            {profile?.name?.charAt(0).toUpperCase()}
          </div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 4, color: '#111827', fontWeight: 700 }}>{profile?.name}</h2>
          <p style={{ color: '#4B5563', fontSize: '0.85rem', marginBottom: 20 }}>{profile?.email}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
            {[
              { label: '📞 Phone', value: profile?.phone || 'Not set' },
              { label: '🎂 Date of Birth', value: profile?.date_of_birth ? new Date(profile.date_of_birth + 'T00:00:00').toLocaleDateString() : 'Not set' },
              { label: '🩸 Blood Type', value: profile?.blood_type || 'Not set' },
              { label: '📅 Member Since', value: profile?.created_at && !isNaN(new Date(profile.created_at).getTime()) ? new Date(profile.created_at).toLocaleDateString() : 'Not set' },
            ].map((item, i) => (
              <div key={i} style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 12px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '0.75rem', color: '#4B5563', marginBottom: 3, fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: '0.90rem', fontWeight: 500, color: '#111827' }}>{item.value}</div>
              </div>
            ))}
          </div>

          {bmiData && (
            <div style={{
              marginTop: 16, padding: '14px',
              background: bmiData.category === 'Normal' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              borderRadius: 10,
              border: `1px solid ${bmiData.category === 'Normal' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
            }}>
              <div style={{ fontSize: '0.75rem', color: '#4B5563', fontWeight: 600 }}>📊 BMI (Latest)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: bmiData.category === 'Normal' ? '#10B981' : '#F59E0B', marginTop: 4 }}>{bmiData.bmi}</div>
              <div style={{ fontSize: '0.78rem', color: '#4B5563', marginTop: 2 }}>{bmiData.category}</div>
            </div>
          )}
        </div>

        {/* Summary Stats + Records */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { icon: '📅', label: 'Total Appointments', value: appointments.length, color: 'rgba(37, 99, 235, 0.1)', borderColor: 'rgba(37, 99, 235, 0.2)' },
              { icon: '💓', label: 'Health Records', value: healthRecords.length, color: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' },
              { icon: '💊', label: 'Medications', value: medications.length, color: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)' },
            ].map((s, i) => (
              <div key={i} style={{
                background: s.color, borderRadius: 12, padding: '16px',
                textAlign: 'center', border: `1px solid ${s.borderColor}`
              }}>
                <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#111827' }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#4B5563', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Latest Vitals Summary */}
          {latestRecord && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 14, color: '#111827', fontWeight: 700 }}>💓 Latest Vitals
                <span style={{ fontSize: '0.75rem', color: '#4B5563', fontWeight: 400, marginLeft: 8 }}>
                  {new Date(latestRecord.record_date).toLocaleDateString()}
                </span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { label: 'Weight', value: latestRecord.weight ? `${latestRecord.weight} kg` : '—', icon: '⚖️' },
                  { label: 'Blood Pressure', value: latestRecord.blood_pressure || '—', icon: '🩺' },
                  { label: 'Heart Rate', value: latestRecord.heart_rate ? `${latestRecord.heart_rate} bpm` : '—', icon: '❤️' },
                  { label: 'Blood Sugar', value: latestRecord.blood_sugar ? `${latestRecord.blood_sugar} mg/dL` : '—', icon: '🩸' },
                  { label: 'Temperature', value: latestRecord.temperature ? `${latestRecord.temperature}°C` : '—', icon: '🌡️' },
                  { label: 'Height', value: latestRecord.height ? `${latestRecord.height} cm` : '—', icon: '📏' },
                ].map((v, i) => (
                  <div key={i} style={{ background: 'rgba(16, 185, 129, 0.05)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#4B5563', fontWeight: 600 }}>{v.icon} {v.label}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#10B981', marginTop: 4 }}>{v.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Medications */}
          {medications.length > 0 && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 14, color: '#111827' }}>💊 Current Medications</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {medications.map(m => (
                  <div key={m.id} style={{
                    background: 'rgba(245, 158, 11, 0.1)', borderRadius: 20, padding: '6px 14px',
                    fontSize: '0.83rem', color: '#92400e', border: '1px solid rgba(245, 158, 11, 0.3)',
                    fontWeight: 600
                  }}>
                    💊 {m.name} {m.dosage && `• ${m.dosage}`} {m.frequency && `• ${m.frequency}`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appointment History */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 14, color: '#111827' }}>📅 Appointment History</h3>
            {appointments.length === 0 ? (
              <p style={{ color: '#4B5563', fontSize: '0.88rem' }}>No appointments on record.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Doctor</th><th>Department</th><th>Date</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.slice(0, 5).map(a => (
                      <tr key={a.id}>
                        <td>{a.doctor_name}</td>
                        <td>{a.department}</td>
                        <td>{new Date(a.appointment_date).toLocaleDateString()}</td>
                        <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Plans Section */}
      <div style={{ marginTop: 40, marginBottom: 20 }}>
        <div className="page-header">
          <h2>💎 Subscription Plans</h2>
          <p>Choose the perfect plan for your healthcare needs</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {/* Free Plan */}
          <div className="card" style={{
            borderTop: '3px solid #F3F4F6',
            transition: 'all 0.3s ease',
            cursor: 'default'
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 30px rgba(37, 99, 235, 0.1)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 8 }}>Free Plan</h3>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2563EB', marginBottom: 20 }}>$0<span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#4B5563' }}>/mo</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <div style={{ fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>✓ <span style={{ fontWeight: 600 }}>7 AI Diagnosis uses</span></div>
              <div style={{ fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>✓ <span style={{ fontWeight: 600 }}>10 Health Education uses</span></div>
              <div style={{ fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>✓ <span style={{ fontWeight: 600 }}>Basic health tracking</span></div>
              <div style={{ fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>✓ <span style={{ fontWeight: 600 }}>Limited appointments</span></div>
            </div>
            <button style={{
              width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #E5E7EB',
              background: 'white', color: '#2563EB', fontWeight: 600, fontSize: '0.9rem',
              cursor: 'pointer', transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}>
              Current Plan
            </button>
          </div>

          {/* Pro Plan */}
          <div className="card" style={{
            borderTop: '3px solid #3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            transition: 'all 0.3s ease',
            cursor: 'default',
            position: 'relative'
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(59, 130, 246, 0.15)'; e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}>
            <div style={{
              position: 'absolute', top: '-10px', right: 16,
              background: '#3B82F6', color: 'white', padding: '4px 12px',
              borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>POPULAR</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 8 }}>Pro Plan</h3>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#3B82F6', marginBottom: 20 }}>$25<span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#4B5563' }}>/mo</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <div style={{ fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>✓ <span style={{ fontWeight: 600 }}>50 AI Diagnosis uses</span></div>
              <div style={{ fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>✓ <span style={{ fontWeight: 600 }}>100 Health Education uses</span></div>
              <div style={{ fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>✓ <span style={{ fontWeight: 600 }}>Full health tracking</span></div>
              <div style={{ fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>✓ <span style={{ fontWeight: 600 }}>Unlimited appointments</span></div>
            </div>
            <button style={{
              width: '100%', padding: '10px 16px', borderRadius: '8px', border: 'none',
              background: '#3B82F6', color: 'white', fontWeight: 600, fontSize: '0.9rem',
              cursor: 'pointer', transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#2563EB'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#3B82F6'; }}>
              Upgrade Now
            </button>
          </div>

          {/* Plus Plan */}
          <div className="card" style={{
            borderTop: '3px solid #F59E0B',
            transition: 'all 0.3s ease',
            cursor: 'default'
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 30px rgba(245, 158, 11, 0.1)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 8 }}>Plus Plan</h3>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#F59E0B', marginBottom: 20 }}>$75<span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#4B5563' }}>/mo</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <div style={{ fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>✓ <span style={{ fontWeight: 600 }}>150 AI Diagnosis uses</span></div>
              <div style={{ fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>✓ <span style={{ fontWeight: 600 }}>300 Health Education uses</span></div>
              <div style={{ fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>✓ <span style={{ fontWeight: 600 }}>Priority support</span></div>
              <div style={{ fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>✓ <span style={{ fontWeight: 600 }}>Advanced analytics</span></div>
            </div>
            <button style={{
              width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #F59E0B',
              background: 'white', color: '#F59E0B', fontWeight: 600, fontSize: '0.9rem',
              cursor: 'pointer', transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}>
              Upgrade Now
            </button>
          </div>

          {/* Max Plan */}
          <div className="card" style={{
            borderTop: '3px solid #10B981',
            transition: 'all 0.3s ease',
            cursor: 'default'
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 30px rgba(16, 185, 129, 0.1)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 8 }}>Max Plan</h3>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10B981', marginBottom: 20 }}>$120<span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#4B5563' }}>/mo</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <div style={{ fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>✓ <span style={{ fontWeight: 600 }}>500 AI Diagnosis uses</span></div>
              <div style={{ fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>✓ <span style={{ fontWeight: 600 }}>1000 Health Education uses</span></div>
              <div style={{ fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>✓ <span style={{ fontWeight: 600 }}>24/7 Premium support</span></div>
              <div style={{ fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>✓ <span style={{ fontWeight: 600 }}>Dedicated account manager</span></div>
            </div>
            <button style={{
              width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #10B981',
              background: 'white', color: '#10B981', fontWeight: 600, fontSize: '0.9rem',
              cursor: 'pointer', transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}>
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
