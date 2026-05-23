import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import AiUsagePanel from '../components/AiUsagePanel';

const SUGGESTED = [
  'What are the symptoms of diabetes?',
  'How can I lower my blood pressure naturally?',
  'What is a healthy BMI range?',
  'How much water should I drink daily?',
  'What foods are good for heart health?',
  'How can I improve my sleep quality?',
  'What causes high cholesterol?',
  'How do I manage stress effectively?',
];

const HISTORY_KEY = 'health_edu_history';

/**
 * Converts the AI markdown response into clean React elements.
 * Handles: ### headings, **bold**, * / - bullet lists, numbered lists,
 * horizontal rules (***  ---), and plain paragraphs.
 */
function MarkdownMessage({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let listBuffer = [];   // pending bullet items
  let numBuffer  = [];   // pending numbered items
  let key = 0;

  const flushList = () => {
    if (listBuffer.length) {
      elements.push(
        <ul key={key++} style={{ margin: '8px 0 10px 4px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {listBuffer.map((item, i) => (
            <li key={i} style={{ fontSize: 13.5, color: '#2d2d2d', lineHeight: 1.65 }}>
              <InlineMarkdown text={item} />
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
    if (numBuffer.length) {
      elements.push(
        <ol key={key++} style={{ margin: '8px 0 10px 4px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {numBuffer.map((item, i) => (
            <li key={i} style={{ fontSize: 13.5, color: '#2d2d2d', lineHeight: 1.65 }}>
              <InlineMarkdown text={item} />
            </li>
          ))}
        </ol>
      );
      numBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    // Skip blank lines (flush any pending lists first)
    if (!line) {
      flushList();
      continue;
    }

    // Horizontal rule: ***, ---, ___
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line)) {
      flushList();
      elements.push(<hr key={key++} style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '12px 0' }} />);
      continue;
    }

    // ### Heading (H3)
    if (line.startsWith('### ')) {
      flushList();
      const txt = line.replace(/^###\s+/, '');
      elements.push(
        <div key={key++} style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '14px 0 6px', display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 3, height: 16, borderRadius: 3, background: '#2563EB', flexShrink: 0, display: 'inline-block' }} />
          <InlineMarkdown text={txt} />
        </div>
      );
      continue;
    }

    // ## Heading (H2)
    if (line.startsWith('## ')) {
      flushList();
      const txt = line.replace(/^##\s+/, '');
      elements.push(
        <div key={key++} style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', margin: '16px 0 8px' }}>
          <InlineMarkdown text={txt} />
        </div>
      );
      continue;
    }

    // Bullet list: * item  or  - item  or  • item
    if (/^[*\-•]\s+/.test(line)) {
      if (numBuffer.length) flushList();
      listBuffer.push(line.replace(/^[*\-•]\s+/, ''));
      continue;
    }

    // Numbered list: 1. item  or  1) item
    if (/^\d+[\.\)]\s+/.test(line)) {
      if (listBuffer.length) flushList();
      numBuffer.push(line.replace(/^\d+[\.\)]\s+/, ''));
      continue;
    }

    // Plain paragraph
    flushList();
    elements.push(
      <p key={key++} style={{ margin: '0 0 8px 0', fontSize: 13.5, color: '#2d2d2d', lineHeight: 1.7 }}>
        <InlineMarkdown text={line} />
      </p>
    );
  }

  flushList(); // flush any remaining list items

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>{elements}</div>;
}

/**
 * Handles inline markdown: **bold**, *italic*, `code`
 */
function InlineMarkdown({ text }) {
  if (!text) return null;

  // Split on **bold**, *italic*, `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ fontWeight: 700, color: '#1a1a2e' }}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={i} style={{ background: '#EFF6FF', color: '#2563EB', padding: '1px 5px', borderRadius: 4, fontSize: '0.9em' }}>{part.slice(1, -1)}</code>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function EducationPage() {
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hi! I'm your AI Health Assistant powered by Gemini. Ask me any health question and I'll explain it clearly. For serious concerns, always consult a real doctor." }
  ]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [history, setHistory]       = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const chatEndRef = useRef(null);
  const usageRefreshRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      setHistory(saved);
    } catch {}
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveToHistory = (question, answer) => {
    const entry = { id: Date.now(), question, answer, timestamp: new Date().toISOString() };
    const updated = [entry, ...history].slice(0, 50);
    setHistory(updated);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
    return entry;
  };

  const sendMessage = async (question) => {
    const q = question || input.trim();
    if (!q || loading) return;
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);
    try {
      const res = await axios.post('/api/education/ask', { question: q });
      const answer = res.data.answer;
      setMessages(prev => [...prev, { role: 'ai', text: answer }]);
      saveToHistory(q, answer);
      usageRefreshRef.current?.();
    } catch (err) {
      const msg = err.response?.status === 402
        ? (err.response?.data?.error || 'Monthly AI limit reached. Upgrade your plan to continue.')
        : '⚠️ Could not get a response. Please check the backend and your Gemini API key.';
      setMessages(prev => [...prev, { role: 'ai', text: msg }]);
      if (err.response?.status === 402) usageRefreshRef.current?.();
    } finally { setLoading(false); }
  };

  const loadSession = (entry) => {
    setActiveSession(entry.id);
    setMessages([
      { role: 'ai', text: "Hi! I'm your AI Health Assistant. Ask me anything about health." },
      { role: 'user', text: entry.question },
      { role: 'ai', text: entry.answer },
    ]);
    setShowHistory(false);
  };

  const clearHistory = () => {
    if (window.confirm('Clear all conversation history?')) {
      setHistory([]);
      setActiveSession(null);
      localStorage.removeItem(HISTORY_KEY);
    }
  };

  const startNew = () => {
    setActiveSession(null);
    setMessages([{ role: 'ai', text: "Hi! I'm your AI Health Assistant. Ask me any health question!" }]);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Health Education AI</h1>
          <p>Ask any health question — powered by Google Gemini</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {activeSession && (
            <button className="btn btn-outline btn-sm" onClick={startNew}>+ New Chat</button>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => setShowHistory(!showHistory)}>
            📜 History {history.length > 0 && `(${history.length})`}
          </button>
        </div>
      </div>

      <AiUsagePanel refreshRef={usageRefreshRef} />

      <div style={{ display: 'grid', gridTemplateColumns: showHistory ? '1fr 300px' : '1fr', gap: 16 }}>
        {/* ── Main Chat ── */}
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #f0f0f0' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid #f5f5f5', background: 'white' }}>
            <div style={{ width: 38, height: 38, background: '#eef0ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: '2px solid #c7d2ff' }}>🤖</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1a1a2e' }}>Gemini Health Assistant</div>
              <div style={{ fontSize: 11.5, color: '#27ae60', fontWeight: 500 }}>● Online</div>
            </div>
            {activeSession && (
              <span style={{ marginLeft: 'auto', fontSize: 11, background: '#EFF6FF', color: '#2563EB', padding: '2px 10px', borderRadius: 10, fontWeight: 500 }}>
                Session loaded from history
              </span>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16, background: '#fafbff' }}>
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                  {/* Label */}
                  <div style={{ fontSize: 10.5, color: '#bbb', marginBottom: 4, fontWeight: 500, paddingLeft: isUser ? 0 : 4, paddingRight: isUser ? 4 : 0 }}>
                    {isUser ? 'You' : '🤖 Gemini Health Assistant'}
                  </div>

                  {isUser ? (
                    /* User bubble — simple blue pill */
                    <div style={{
                      maxWidth: '72%', background: '#2563EB', color: 'white',
                      padding: '10px 16px', borderRadius: '18px 18px 4px 18px',
                      fontSize: 13.5, lineHeight: 1.6, boxShadow: '0 2px 8px rgba(67,97,238,0.2)',
                    }}>
                      {msg.text}
                    </div>
                  ) : (
                    /* AI response — structured card */
                    <div style={{
                      maxWidth: '88%', background: 'white',
                      border: '1px solid #e8ecff', borderRadius: '4px 18px 18px 18px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                      overflow: 'hidden',
                    }}>
                      {/* Thin blue top stripe */}
                      <div style={{ height: 3, background: 'linear-gradient(90deg, #2563EB, #60A5FA)' }} />
                      <div style={{ padding: '14px 18px' }}>
                        <MarkdownMessage text={msg.text} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading bubble */}
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 10.5, color: '#bbb', marginBottom: 4, paddingLeft: 4 }}>🤖 Gemini Health Assistant</div>
                <div style={{ background: 'white', border: '1px solid #e8ecff', borderRadius: '4px 18px 18px 18px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0,1,2].map(d => (
                      <div key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563EB', animation: `bounce 1.2s ${d*0.2}s infinite ease-in-out`, opacity: 0.7 }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 13, color: '#aaa' }}>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggested questions (shown only on first load) */}
          {messages.length <= 1 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid #f0f0f0', background: 'white', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SUGGESTED.slice(0, 4).map(q => (
                <button key={q} onClick={() => sendMessage(q)} style={{
                  padding: '5px 12px', borderRadius: 20, border: '1px solid #dde', background: 'white',
                  fontSize: 12, color: '#666', cursor: 'pointer', transition: 'all 0.15s',
                }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.background = '#EFF6FF'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#dde'; e.currentTarget.style.color = '#666'; e.currentTarget.style.background = 'white'; }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 10, alignItems: 'flex-end', background: 'white' }}>
            <textarea
              rows={1}
              placeholder="Ask a health question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              style={{
                flex: 1, resize: 'none', borderRadius: 22, padding: '9px 16px',
                fontSize: 13.5, border: '1.5px solid #e0e0e0', outline: 'none',
                fontFamily: 'inherit', lineHeight: 1.5, transition: 'border-color 0.2s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#2563EB'}
              onBlur={e => e.currentTarget.style.borderColor = '#e0e0e0'}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width: 42, height: 42, borderRadius: '50%', border: 'none',
                background: input.trim() && !loading ? '#2563EB' : '#D1D5DB',
                color: 'white', fontSize: 18, cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.2s', boxShadow: input.trim() ? '0 2px 8px rgba(67,97,238,0.3)' : 'none',
              }}>
              ↑
            </button>
          </div>
        </div>

        {/* ── History Panel ── */}
        {showHistory && (
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #f0f0f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 160px)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>Conversation History</span>
              {history.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={clearHistory} style={{ color: '#e74c3c', fontSize: 11.5 }}>Clear all</button>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              {history.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px 0' }}>
                  <div className="emoji">📜</div>
                  <h3>No history yet</h3>
                  <p>Your questions will appear here</p>
                </div>
              ) : (
                history.map(entry => (
                  <div key={entry.id} onClick={() => loadSession(entry)}
                    style={{
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 8,
                      border: `1px solid ${activeSession === entry.id ? '#c7d2ff' : '#f0f0f0'}`,
                      background: activeSession === entry.id ? '#f0f4ff' : '#fafafa',
                      transition: 'all 0.15s',
                    }}
                    onMouseOver={e => { if (activeSession !== entry.id) e.currentTarget.style.background = '#f5f5f5'; }}
                    onMouseOut={e => { if (activeSession !== entry.id) e.currentTarget.style.background = '#fafafa'; }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a2e', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.question}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                      {entry.answer.replace(/[#*`_]/g, '').slice(0, 60)}...
                    </div>
                    <div style={{ fontSize: 11, color: '#ccc' }}>
                      {new Date(entry.timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bounce animation for loading dots */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}