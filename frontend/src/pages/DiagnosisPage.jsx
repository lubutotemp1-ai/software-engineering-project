import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import AiUsagePanel from '../components/AiUsagePanel';

const SEVERITY = [
  { value: 'mild',      label: 'Mild',      color: '#27ae60', bg: '#eafaf1', desc: 'Minor discomfort, can continue daily activities' },
  { value: 'moderate',  label: 'Moderate',  color: '#f39c12', bg: '#fef9ee', desc: 'Noticeable symptoms, some limitation' },
  { value: 'severe',    label: 'Severe',    color: '#e74c3c', bg: '#fdf0ef', desc: 'Significant symptoms, difficulty with activities' },
  { value: 'emergency', label: 'Emergency', color: '#c0392b', bg: '#fce8e6', desc: 'Seek immediate medical attention' },
];

const SEV_META = SEVERITY.reduce((a, s) => { a[s.value] = s; return a; }, {});

/**
 * Parses the plain-text AI response into labelled sections.
 * Looks for lines like "Overview:", "Possible Conditions:", etc.
 */
function parseDiagnosisText(text) {
  if (!text) return [];
  const SECTION_ICONS = {
    'overview':             { icon: '📋', label: 'Overview' },
    'possible conditions':  { icon: '🩺', label: 'Possible Conditions' },
    'recommended next steps': { icon: '📌', label: 'Recommended Next Steps' },
    'warning signs':        { icon: '⚠️', label: 'Warning Signs' },
    'self-care tips':       { icon: '💊', label: 'Self-Care Tips' },
    'disclaimer':           { icon: '⚖️', label: 'Disclaimer' },
  };

  const lines = text.split('\n');
  const sections = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check if this line is a section header (ends with : or matches a known keyword)
    const lower = line.toLowerCase().replace(/:$/, '').trim();
    const match = Object.keys(SECTION_ICONS).find(k => lower === k || lower.startsWith(k));

    if (match) {
      if (current) sections.push(current);
      current = { ...SECTION_ICONS[match], content: [] };
    } else if (current) {
      current.content.push(line);
    } else {
      // Text before any header — put in a generic intro section
      if (!sections.length) sections.push({ icon: '📋', label: 'Assessment', content: [] });
      sections[sections.length - 1].content.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

function DiagnosisReport({ diagnosis }) {
  const sections = parseDiagnosisText(diagnosis.diagnosis);
  const sev = SEV_META[diagnosis.severity] || SEV_META.mild;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Severity banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: sev.bg, border: `1px solid ${sev.color}33`,
        borderRadius: '10px 10px 0 0', padding: '10px 16px',
        borderBottom: `2px solid ${sev.color}`,
      }}>
        <span style={{ fontSize: 20 }}>
          {sev.value === 'emergency' ? '🚨' : sev.value === 'severe' ? '🔴' : sev.value === 'moderate' ? '🟡' : '🟢'}
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: sev.color }}>Severity: {sev.label}</div>
          <div style={{ fontSize: 11.5, color: '#888' }}>{sev.desc}</div>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#aaa' }}>
          {new Date(diagnosis.created_at).toLocaleString()}
        </span>
      </div>

      {/* Sections */}
      {sections.length === 0 ? (
        <div style={{ padding: 16, fontSize: 13.5, color: '#555', whiteSpace: 'pre-wrap', lineHeight: 1.7, background: 'white', border: '1px solid #f0f0f0', borderTop: 'none', borderRadius: '0 0 10px 10px' }}>
          {diagnosis.diagnosis}
        </div>
      ) : (
        sections.map((sec, i) => (
          <div key={i} style={{
            background: sec.label === 'Disclaimer' ? '#fffdf0' : sec.label === 'Warning Signs' ? '#fff8f8' : 'white',
            border: '1px solid #f0f0f0', borderTop: 'none',
            borderRadius: i === sections.length - 1 ? '0 0 10px 10px' : 0,
            padding: '14px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{sec.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#1a1a2e' }}>{sec.label}</span>
            </div>
            <div style={{ fontSize: 13.5, color: '#444', lineHeight: 1.75, paddingLeft: 24 }}>
              {sec.content.map((line, j) => {
                // Detect list items like "1. ...", "- ...", "• ..."
                const isList = /^(\d+[\.\)]|[-•*])\s/.test(line);
                if (isList) {
                  return (
                    <div key={j} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <span style={{ color: '#2563EB', flexShrink: 0, marginTop: 1 }}>▸</span>
                      <span>{line.replace(/^(\d+[\.\)]|[-•*])\s/, '')}</span>
                    </div>
                  );
                }
                return <p key={j} style={{ margin: '0 0 6px 0' }}>{line}</p>;
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function DiagnosisPage() {
  const { user } = useAuth();
  const [symptoms, setSymptoms]         = useState('');
  const [duration, setDuration]         = useState('');
  const [severity, setSeverity]         = useState('mild');
  const [loading, setLoading]           = useState(false);
  const [diagnosis, setDiagnosis]       = useState(null);
  const [history, setHistory]           = useState([]);
  const [doctors, setDoctors]           = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [sending, setSending]           = useState(false);
  const [sendSuccess, setSendSuccess]   = useState('');
  const [activeTab, setActiveTab]       = useState('new');
  const [expandedHistory, setExpandedHistory] = useState(null);
  const usageRefreshRef = useRef(null);

  useEffect(() => {
    fetchHistory();
    axios.get('/api/doctors').then(r => setDoctors(r.data)).catch(() => {});
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get('/api/diagnosis/history');
      setHistory(res.data);
    } catch {}
  };

  const handleDiagnose = async (e) => {
    e.preventDefault();
    if (!symptoms.trim()) return;
    setLoading(true);
    setDiagnosis(null);
    try {
      const res = await axios.post('/api/diagnosis/check', { symptoms, duration, severity });
      // Support both response shapes
      const diag = res.data.diagnosis || res.data;
      setDiagnosis(diag);
      fetchHistory();
      usageRefreshRef.current?.();
    } catch (err) {
      if (err.response?.status === 402) {
        alert(err.response?.data?.error || 'AI monthly limit reached. Upgrade your plan to continue.');
        usageRefreshRef.current?.();
      } else {
        alert(err.response?.data?.error || 'Failed to get AI diagnosis.');
      }
    } finally { setLoading(false); }
  };

  const handleSendToDoctor = async (diagObj) => {
    const doc = diagObj ? diagObj : diagnosis;
    if (!selectedDoctor || !doc) return;
    setSending(true);
    try {
      await axios.post(`/api/diagnosis/${doc.id}/send-to-doctor`, { doctorId: selectedDoctor });
      setSendSuccess('Diagnosis sent to doctor successfully!');
      fetchHistory();
      if (diagnosis?.id === doc.id) setDiagnosis(prev => ({ ...prev, sent_to_doctor: 1 }));
      setTimeout(() => setSendSuccess(''), 4000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send diagnosis.');
    } finally { setSending(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this diagnosis?')) return;
    try {
      await axios.delete(`/api/diagnosis/${id}`);
      fetchHistory();
      if (diagnosis?.id === id) setDiagnosis(null);
    } catch {}
  };

  const sev = SEV_META[severity] || SEV_META.mild;

  return (
    <div>
      <div className="page-header">
        <h1>🤖 AI Health Diagnosis</h1>
        <p>Get a preliminary symptom assessment powered by Gemini AI</p>
      </div>

      <AiUsagePanel refreshRef={usageRefreshRef} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid #e8e8e8' }}>
        {[{ id: 'new', label: '🔍 New Assessment' }, { id: 'history', label: `📂 History (${history.length})` }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '10px 20px', background: 'none', border: 'none',
            borderBottom: activeTab === t.id ? '2px solid #2563EB' : '2px solid transparent',
            color: activeTab === t.id ? '#2563EB' : '#aaa',
            fontWeight: 600, fontSize: 13.5, cursor: 'pointer', marginBottom: -1, transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'new' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Form */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 18 }}>Symptom Assessment</div>
              <form onSubmit={handleDiagnose}>
                <div className="form-group">
                  <label className="form-label">Describe your symptoms *</label>
                  <textarea className="form-input" rows={4}
                    placeholder="E.g., I have a persistent headache on the right side of my head, accompanied by mild fever and fatigue for the past 3 days..."
                    value={symptoms} onChange={e => setSymptoms(e.target.value)} required
                    style={{ minHeight: 110, resize: 'vertical' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Duration</label>
                    <input className="form-input" placeholder="E.g., 2 days, 1 week"
                      value={duration} onChange={e => setDuration(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Severity</label>
                    <select className="form-input" value={severity} onChange={e => setSeverity(e.target.value)}>
                      {SEVERITY.map(s => <option key={s.value} value={s.value}>{s.label} — {s.desc}</option>)}
                    </select>
                  </div>
                </div>

                {/* Severity indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: sev.bg, borderRadius: 8, marginBottom: 14, border: `1px solid ${sev.color}33` }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: sev.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: sev.color, fontWeight: 600 }}>{sev.label}:</span>
                  <span style={{ fontSize: 12, color: '#666' }}>{sev.desc}</span>
                </div>

                <button type="submit" className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', height: 44, fontSize: 14 }}
                  disabled={loading || !symptoms.trim()}>
                  {loading
                    ? <><span className="spinner-sm" style={{ marginRight: 8 }} /> Analyzing symptoms...</>
                    : '🔍 Get AI Diagnosis'}
                </button>
              </form>
            </div>

            {/* Result */}
            {loading && (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }} />
                <div style={{ fontWeight: 600, color: '#555', marginBottom: 6 }}>Analyzing your symptoms...</div>
                <div style={{ fontSize: 12.5, color: '#aaa' }}>Gemini AI is reviewing your input. This usually takes 5–15 seconds.</div>
              </div>
            )}

            {diagnosis && !loading && (
              <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1.5px solid #DBEAFE' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>AI Diagnosis Report</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => handleDelete(diagnosis.id)}
                      style={{ color: '#e74c3c', borderColor: '#e74c3c', fontSize: 12 }}>🗑 Delete</button>
                  </div>
                </div>

                <div style={{ padding: 18 }}>
                  <DiagnosisReport diagnosis={diagnosis} />
                </div>

                {sendSuccess && (
                  <div style={{ margin: '0 18px 12px', padding: '10px 14px', background: '#eafaf1', color: '#27ae60', borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
                    ✅ {sendSuccess}
                  </div>
                )}

                {/* Send to Doctor */}
                {!diagnosis.sent_to_doctor ? (
                  <div style={{ margin: '0 18px 18px', padding: '14px', background: '#f8f9ff', borderRadius: 10, border: '1px solid #e0e5ff' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#2563EB', marginBottom: 10 }}>📤 Share with a Doctor</div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <select className="form-input" style={{ flex: 1 }} value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}>
                        <option value="">Select a doctor...</option>
                        {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name} — {d.department || d.specialization}</option>)}
                      </select>
                      <button className="btn btn-primary btn-sm" onClick={() => handleSendToDoctor(null)} disabled={!selectedDoctor || sending} style={{ whiteSpace: 'nowrap' }}>
                        {sending ? '...' : '📤 Send'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ margin: '0 18px 18px', padding: '10px 14px', background: '#eafaf1', borderRadius: 8, fontSize: 12.5, color: '#27ae60', fontWeight: 500 }}>
                    ✅ Already sent to {diagnosis.sent_to_doctor_name || 'a doctor'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 14 }}>How It Works</div>
              {[
                { n: '1', icon: '✍️', t: 'Describe symptoms', d: 'Be as detailed as possible — location, duration, what makes it better or worse.' },
                { n: '2', icon: '🤖', t: 'AI analyzes input', d: 'Gemini AI reviews your symptoms and suggests possible conditions and next steps.' },
                { n: '3', icon: '📋', t: 'Review assessment', d: 'Read through possible conditions, warning signs, and recommended actions.' },
                { n: '4', icon: '👨‍⚕️', t: 'Share with doctor', d: 'Optionally send the report directly to your doctor for professional review.' },
              ].map(s => (
                <div key={s.n} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>{s.t}</div>
                    <div style={{ fontSize: 12, color: '#999', lineHeight: 1.5 }}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ background: '#fff8f8', border: '1px solid #fdd' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e74c3c', marginBottom: 8 }}>⚠️ Important Disclaimer</div>
              <div style={{ fontSize: 12, color: '#c0392b', lineHeight: 1.6 }}>
                This AI assessment is for <strong>informational purposes only</strong> and is NOT a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for any medical concerns.
              </div>
            </div>

            {history.length > 0 && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span className="card-title">Recent Diagnoses</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('history')}>View all</button>
                </div>
                {history.slice(0, 3).map(h => {
                  const hs = SEV_META[h.severity] || SEV_META.mild;
                  return (
                    <div key={h.id} onClick={() => setDiagnosis(h)}
                      style={{ padding: '10px 12px', background: diagnosis?.id === h.id ? '#f0f4ff' : '#fafafa', borderRadius: 8, border: `1px solid ${diagnosis?.id === h.id ? '#c7d2ff' : '#f0f0f0'}`, cursor: 'pointer', marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.symptoms}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: hs.color, background: hs.bg, padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>{hs.label}</span>
                        <span style={{ fontSize: 11, color: '#bbb' }}>{new Date(h.created_at).toLocaleDateString()}</span>
                        {h.sent_to_doctor === 1 && <span style={{ fontSize: 10, color: '#27ae60', background: '#eafaf1', padding: '1px 6px', borderRadius: 10 }}>Sent</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          {history.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="emoji">🤖</div>
                <h3>No diagnosis history</h3>
                <p>Run your first assessment to see it here</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {history.map(h => {
                const hs = SEV_META[h.severity] || SEV_META.mild;
                const isExpanded = expandedHistory === h.id;
                return (
                  <div key={h.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Card header */}
                    <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: isExpanded ? '1px solid #f0f0f0' : 'none', cursor: 'pointer', background: isExpanded ? '#fafbff' : 'white' }}
                      onClick={() => setExpandedHistory(isExpanded ? null : h.id)}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: hs.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.symptoms}</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
                          <span style={{ fontSize: 11, color: hs.color, background: hs.bg, padding: '1px 8px', borderRadius: 10, fontWeight: 600 }}>{hs.label}</span>
                          {h.duration && <span style={{ fontSize: 11.5, color: '#aaa' }}>Duration: {h.duration}</span>}
                          <span style={{ fontSize: 11, color: '#bbb' }}>{new Date(h.created_at).toLocaleString()}</span>
                          {h.sent_to_doctor === 1 && <span style={{ fontSize: 10, color: '#27ae60', background: '#eafaf1', padding: '1px 8px', borderRadius: 10, fontWeight: 600 }}>✓ Sent to {h.sent_to_doctor_name || 'doctor'}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); handleDelete(h.id); }} style={{ color: '#e74c3c', fontSize: 12 }}>🗑 Delete</button>
                        <span style={{ color: '#aaa', fontSize: 16 }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div style={{ padding: '0 18px 18px' }}>
                        <div style={{ marginTop: 14 }}>
                          <DiagnosisReport diagnosis={h} />
                        </div>
                        {!h.sent_to_doctor && (
                          <div style={{ marginTop: 14, padding: '12px 14px', background: '#f8f9ff', borderRadius: 10, border: '1px solid #e0e5ff' }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#2563EB', marginBottom: 8 }}>📤 Share with a Doctor</div>
                            <div style={{ display: 'flex', gap: 10 }}>
                              <select className="form-input" style={{ flex: 1 }}
                                value={diagnosis?.id === h.id ? selectedDoctor : ''}
                                onChange={e => { setDiagnosis(h); setSelectedDoctor(e.target.value); }}>
                                <option value="">Select a doctor...</option>
                                {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name} — {d.department || d.specialization}</option>)}
                              </select>
                              <button className="btn btn-primary btn-sm" disabled={!selectedDoctor || sending}
                                onClick={() => { setDiagnosis(h); handleSendToDoctor(h); }}>
                                {sending ? '...' : '📤 Send'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}