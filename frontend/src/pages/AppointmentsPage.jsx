import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [formData, setFormData] = useState({
    doctor_id: '',
    title: '',
    description: '',
    appointment_date: '',
    appointment_time: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [errorModal, setErrorModal] = useState({ show: false, message: '' });
  const messageTimerRef = useRef(null);

  const showBanner = useCallback((type, text) => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    setMessage({ type, text });
    messageTimerRef.current = setTimeout(() => setMessage({ type: '', text: '' }), 8000);
  }, []);

  useEffect(() => () => { if (messageTimerRef.current) clearTimeout(messageTimerRef.current); }, []);

  const fetchAppointments = async () => {
    try {
      const res = await axios.get('/api/appointments');
      setAppointments(res.data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await axios.get('/api/doctors');
      setDoctors(res.data || []);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'doctor_id') {
      const doc = doctors.find(d => String(d.id) === String(value));
      setSelectedDoctor(doc || null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/appointments', formData);
      console.log('✅ Appointment booked:', response.data);
      showBanner('success', 'Appointment booked successfully!');
      setFormData({ doctor_id: '', title: '', description: '', appointment_date: '', appointment_time: '' });
      setSelectedDoctor(null);
      setShowForm(false);
      fetchAppointments();
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to book appointment.';
      console.error('❌ Error booking appointment:', errorMessage, err);
      setErrorModal({ show: true, message: errorMessage });
    }
  };

  const cancelAppointment = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await axios.delete(`/api/appointments/${id}`);
      showBanner('success', 'Appointment cancelled successfully!');
      fetchAppointments();
    } catch (err) {
      showBanner('error', err.response?.data?.error || 'Failed to cancel appointment.');
    }
  };

  // Group doctors by department
  const doctorsByDept = doctors.reduce((acc, doc) => {
    const dept = doc.department || 'General';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(doc);
    return acc;
  }, {});

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: '#000000' }}>
        <div className="spinner" />
        <p>Loading appointments...</p>
      </div>
    );
  }

  const STATUS_STYLE = {
    pending:   { bg: '#fff3cd', color: '#000000' },
    confirmed: { bg: '#d4edda', color: '#000000' },
    cancelled: { bg: '#f8d7da', color: '#000000' },
    completed: { bg: '#cce5ff', color: '#000000' },
  };

  return (
    <div style={{ padding: 20 }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, color: '#000000', fontSize: 22 }}>📅 My Appointments</h2>
        <button
          onClick={() => { setShowForm(!showForm); setSelectedDoctor(null); }}
          style={{ padding: '10px 20px', background: showForm ? '#6B7280' : '#2563EB', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          {showForm ? '✕ Cancel' : '+ Book Appointment'}
        </button>
      </div>

      {/* Message banner */}
      {message.text && (
        <div
          className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} flash-banner`}
          role="alert"
        >
          <span>{message.type === 'success' ? '✅' : '❌'} {message.text}</span>
          <button
            type="button"
            className="flash-banner-dismiss"
            onClick={() => setMessage({ type: '', text: '' })}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Error Modal Popup ── */}
      {errorModal.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            maxWidth: 450,
            width: '90%',
            padding: 0,
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #dc2626, #ef4444)',
              color: 'white',
              padding: '20px 24px',
              fontWeight: 700,
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <span style={{ fontSize: 24 }}>⚠️</span> Booking Error
            </div>

            {/* Modal Body */}
            <div style={{
              padding: '24px',
              fontSize: 15,
              color: '#333',
              lineHeight: 1.6,
            }}>
              {errorModal.message}
            </div>

            {/* Modal Footer */}
            <div style={{
              borderTop: '1px solid #e5e7eb',
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
            }}>
              <button
                onClick={() => setErrorModal({ show: false, message: '' })}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: 8,
                  background: '#f3f4f6',
                  color: '#000000',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseOver={e => e.target.style.background = '#e5e7eb'}
                onMouseOut={e => e.target.style.background = '#f3f4f6'}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Booking Form ── */}
      {showForm && (
        <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.10)', marginBottom: 28, overflow: 'hidden', border: '1px solid #e8ecff' }}>
          <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #2563EB, #60A5FA)', color: 'white' }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Book New Appointment</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>Fill in the details below to schedule your visit</div>
          </div>

          <div style={{ padding: '22px 24px' }}>
            {/* ── Step 1: Doctor Selection ── */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#000000', marginBottom: 8 }}>
                Step 1 — Select a Doctor
              </label>

              {/* Doctor cards grid */}
              {doctors.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#000000', background: '#fafafa', borderRadius: 10, border: '1px dashed #ddd' }}>
                  No doctors available in the system yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>
                  {doctors.map(doc => {
                    const isSelected = String(formData.doctor_id) === String(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, doctor_id: String(doc.id) }));
                          setSelectedDoctor(doc);
                        }}
                        style={{
                          border: isSelected ? '2px solid #2563EB' : '1.5px solid #e8e8e8',
                          borderRadius: 12,
                          padding: '14px 16px',
                          cursor: 'pointer',
                          background: isSelected ? '#99a3c0' : 'white',
                          transition: 'all 0.15s',
                          boxShadow: isSelected ? '0 0 0 3px rgba(37,99,235,0.12)' : '0 1px 4px rgba(0,0,0,0.05)',
                          position: 'relative',
                        }}
                        onMouseOver={e => { if (!isSelected) { e.currentTarget.style.border = '1.5px solid #93C5FD'; e.currentTarget.style.background = '#fafbff'; } }}
                        onMouseOut={e => { if (!isSelected) { e.currentTarget.style.border = '1.5px solid #e8e8e8'; e.currentTarget.style.background = 'white'; } }}
                      >
                        {isSelected && (
                          <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%', background: '#2563EB', color: 'white', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✓</div>
                        )}
                        {/* Avatar */}
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: isSelected ? '#2563EB' : '#DBEAFE', color: isSelected ? 'white' : '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
                          {doc.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1a1a2e', marginBottom: 4 }}>
                          Dr. {doc.name}
                        </div>
                        {doc.specialization && (
                          <div style={{ fontSize: 12, color: '#2563EB', fontWeight: 600, marginBottom: 4 }}>
                            🩺 {doc.specialization}
                          </div>
                        )}
                        {doc.department && (
                          <div style={{ fontSize: 11.5, color: '#000000', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
                              🏥 {doc.department}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Hidden actual select for form validation */}
              <select
                name="doctor_id"
                value={formData.doctor_id}
                onChange={handleChange}
                required
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                tabIndex={-1}
              >
                <option value="" />
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>

              {!formData.doctor_id && (
                <div style={{ fontSize: 12, color: '#000000', marginTop: 4 }}>👆 Click a card to select a doctor</div>
              )}
            </div>

            {/* ── Step 2: Appointment Details ── */}
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 20, marginBottom: 0 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#000000', marginBottom: 14 }}>
                Step 2 — Appointment Details
              </label>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: '#000000', marginBottom: 5 }}>Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., General Checkup, Follow-up Visit, Blood Test Review"
                  required
                  style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#4361ee'}
                  onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: '#000000', marginBottom: 5 }}>Reason / Description <span style={{ color: '#000000', fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Briefly describe your symptoms or reason for the visit..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                  onFocus={e => e.target.style.borderColor = '#4361ee'}
                  onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: '#000000', marginBottom: 5 }}>Date *</label>
                  <input
                    type="date"
                    name="appointment_date"
                    value={formData.appointment_date}
                    onChange={handleChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#2563EB'}
                    onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: '#000000', marginBottom: 5 }}>Time *</label>
                  <input
                    type="time"
                    name="appointment_time"
                    value={formData.appointment_time}
                    onChange={handleChange}
                    required
                    style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#2563EB'}
                    onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                  />
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!formData.doctor_id || !formData.title || !formData.appointment_date || !formData.appointment_time}
                style={{
                  width: '100%', padding: '13px', border: 'none', borderRadius: 10,
                  background: (formData.doctor_id && formData.title && formData.appointment_date && formData.appointment_time) ? '#2563EB' : '#BFDBFE',
                  color: 'white', fontWeight: 700, fontSize: 15, cursor: (formData.doctor_id && formData.title && formData.appointment_date && formData.appointment_time) ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s',
                }}>
                ✅ Confirm Booking
                {selectedDoctor && ` with Dr. ${selectedDoctor.name}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Appointments List ── */}
      {appointments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
          <div style={{ fontWeight: 600, color: '#000000', marginBottom: 8, fontSize: 16 }}>No appointments yet</div>
          <div style={{ color: '#000000', marginBottom: 20, fontSize: 13.5 }}>Book your first appointment to get started</div>
          <button onClick={() => setShowForm(true)}
            style={{ padding: '10px 24px', background: '#2563EB', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            + Book Appointment
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {appointments.map(apt => {
            const s = STATUS_STYLE[apt.status] || STATUS_STYLE.pending;
            return (
              <div key={apt.id} style={{ background: 'white', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                {/* Top colour bar based on status */}
                <div style={{ height: 4, background: apt.status === 'confirmed' ? '#10B981' : apt.status === 'completed' ? '#2563EB' : apt.status === 'cancelled' ? '#EF4444' : '#F59E0B' }} />
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: 15, color: '#000000' }}>{apt.title}</h4>
                      <div style={{ fontSize: 12.5, color: '#000000' }}>
                        📆 {new Date(apt.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        &nbsp;&nbsp;🕐 {apt.appointment_time}
                      </div>
                    </div>
                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: s.bg, color: s.color, textTransform: 'capitalize', flexShrink: 0 }}>
                      {apt.status}
                    </span>
                  </div>

                  {apt.description && (
                    <div style={{ fontSize: 13, color: '#000000', marginBottom: 12, padding: '8px 12px', background: '#fafafa', borderRadius: 8, borderLeft: '3px solid #e0e5ff' }}>
                      {apt.description}
                    </div>
                  )}

                  {/* Doctor info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8f9ff', borderRadius: 10, border: '1px solid #e8ecff' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#2563EB', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {(apt.doctor_name || 'D').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: '#000000' }}>
                        👨‍⚕️ Dr. {apt.doctor_name || 'Assigned Doctor'}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                        {apt.specialization && <span style={{ fontSize: 11.5, color: '#2563EB', background: '#EFF6FF', padding: '2px 9px', borderRadius: 20, fontWeight: 500 }}>🩺 {apt.specialization}</span>}
                        {apt.department    && <span style={{ fontSize: 11.5, color: '#888',    background: '#f0f0f0',  padding: '2px 9px', borderRadius: 20 }}>🏥 {apt.department}</span>}
                      </div>
                    </div>
                  </div>

                  {apt.status === 'pending' && (
                    <div style={{ marginTop: 12 }}>
                      <button onClick={() => cancelAppointment(apt.id)}
                        style={{ padding: '7px 16px', background: '#fff0f0', color: '#e74c3c', border: '1px solid #fdd', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 12.5 }}>
                        ✕ Cancel Appointment
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}