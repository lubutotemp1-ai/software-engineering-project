import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function HealthTracker() {
  const [records, setRecords] = useState([]);
  const [medications, setMedications] = useState([]);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showMedModal, setShowMedModal] = useState(false);
  const [activeTab, setActiveTab] = useState('vitals');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  const [recordForm, setRecordForm] = useState({
    record_date: new Date().toISOString().split('T')[0],
    weight: '', height: '', blood_pressure: '',
    heart_rate: '', blood_sugar: '', temperature: '', notes: ''
  });

  const [medForm, setMedForm] = useState({
    name: '', dosage: '', frequency: '', start_date: '', end_date: '', notes: ''
  });

  const fetchAll = async () => {
    try {
      const [rRes, mRes] = await Promise.all([
        axios.get('/api/health'),
        axios.get('/api/health/medications'),
      ]);
      setRecords(rRes.data);
      setMedications(mRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAddRecord = async (e) => {
    e.preventDefault();
    try {
      // Validate required fields
      if (!recordForm.record_date) {
        alert('Please select a date');
        return;
      }
      
      await axios.post('/api/health', recordForm);
      setSuccess('Health record saved!');
      setShowRecordModal(false);
      setRecordForm({ record_date: new Date().toISOString().split('T')[0], weight: '', height: '', blood_pressure: '', heart_rate: '', blood_sugar: '', temperature: '', notes: '' });
      fetchAll();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving health record:', err);
      alert(err.response?.data?.error || 'Failed to save health record. Please try again.');
    }
  };

  const handleAddMed = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/health/medications', medForm);
      setSuccess('Medication added!');
      setShowMedModal(false);
      setMedForm({ name: '', dosage: '', frequency: '', start_date: '', end_date: '', notes: '' });
      fetchAll();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    await axios.delete(`/api/health/${id}`);
    fetchAll();
  };

  const deleteMed = async (id) => {
    if (!window.confirm('Remove this medication?')) return;
    await axios.delete(`/api/health/medications/${id}`);
    fetchAll();
  };

  // Prepare chart data
  const chartData = [...records].reverse().slice(-10).map(r => ({
    date: new Date(r.record_date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    weight: r.weight,
    heart_rate: r.heart_rate,
    blood_sugar: r.blood_sugar,
    temperature: r.temperature,
  }));

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>💓 Health Tracker</h1>
          <p>Monitor your vitals and manage medications</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => setShowMedModal(true)}>+ Add Medication</button>
          <button className="btn btn-primary" onClick={() => setShowRecordModal(true)}>+ Log Vitals</button>
        </div>
      </div>

      {success && <div className="alert alert-success">{success}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {['vitals', 'chart', 'medications'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activeTab === tab ? 'white' : 'transparent',
              color: activeTab === tab ? '#10B981' : '#4B5563',
              fontWeight: activeTab === tab ? 600 : 400,
              fontSize: '0.88rem',
              boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'vitals' ? '📊 Vitals' : tab === 'chart' ? '📈 Charts' : '💊 Medications'}
          </button>
        ))}
      </div>

      {/* Vitals Tab */}
      {activeTab === 'vitals' && (
        <div className="card">
          {records.length === 0 ? (
            <div className="empty-state">
              <div className="emoji">💓</div>
              <h3>No health records yet</h3>
              <p>Start logging your vitals to track trends</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowRecordModal(true)}>
                Log First Record
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Weight</th><th>Blood Pressure</th>
                    <th>Heart Rate</th><th>Blood Sugar</th><th>Temp</th><th>Notes</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id}>
                      <td>{new Date(r.record_date).toLocaleDateString()}</td>
                      <td>{r.weight ? `${r.weight} kg` : '—'}</td>
                      <td>{r.blood_pressure || '—'}</td>
                      <td>{r.heart_rate ? `${r.heart_rate} bpm` : '—'}</td>
                      <td>{r.blood_sugar ? `${r.blood_sugar} mg/dL` : '—'}</td>
                      <td>{r.temperature ? `${r.temperature}°C` : '—'}</td>
                      <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes || '—'}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteRecord(r.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Chart Tab */}
      {activeTab === 'chart' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {chartData.length < 2 ? (
            <div className="card">
              <div className="empty-state">
                <div className="emoji">📈</div>
                <h3>Not enough data for charts</h3>
                <p>Log at least 2 records to see your trends</p>
              </div>
            </div>
          ) : (
            <>
              {[
                { key: 'weight', label: 'Weight (kg)', color: '#10B981' },
                { key: 'heart_rate', label: 'Heart Rate (bpm)', color: '#ef4444' },
                { key: 'blood_sugar', label: 'Blood Sugar (mg/dL)', color: '#f59e0b' },
              ].map(({ key, label, color }) => (
                <div className="card" key={key}>
                  <h3 className="card-title" style={{ marginBottom: 16 }}>📈 {label}</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Medications Tab */}
      {activeTab === 'medications' && (
        <div className="card">
          {medications.length === 0 ? (
            <div className="empty-state">
              <div className="emoji">💊</div>
              <h3>No medications added</h3>
              <p>Track your current medications here</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowMedModal(true)}>
                Add Medication
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Medication</th><th>Dosage</th><th>Frequency</th>
                    <th>Start Date</th><th>End Date</th><th>Notes</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {medications.map(m => (
                    <tr key={m.id}>
                      <td><strong>{m.name}</strong></td>
                      <td>{m.dosage || '—'}</td>
                      <td>{m.frequency || '—'}</td>
                      <td>{m.start_date ? new Date(m.start_date).toLocaleDateString() : '—'}</td>
                      <td>{m.end_date ? new Date(m.end_date).toLocaleDateString() : '—'}</td>
                      <td>{m.notes || '—'}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteMed(m.id)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Record Modal */}
      {showRecordModal && (
        <div className="modal-overlay" onClick={() => setShowRecordModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">💓 Log Health Vitals</h3>
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
                <textarea className="form-input" rows={2} placeholder="Any notes about how you feel..."
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
      {showMedModal && (
        <div className="modal-overlay" onClick={() => setShowMedModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">💊 Add Medication</h3>
              <button className="modal-close" onClick={() => setShowMedModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddMed}>
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
                    {['Once daily', 'Twice daily', 'Three times daily', 'Every 6 hours', 'As needed', 'Weekly'].map(f =>
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
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowMedModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Medication</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
