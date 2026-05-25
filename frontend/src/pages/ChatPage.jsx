import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Send,
  Trash2,
  Search,
  Plus,
  MessageCircle,
  User,
  X,
  MoreVertical
} from 'lucide-react';

// Role-based colors for professional theme
const ROLE_COLORS = {
  patient: '#2563EB',
  doctor: '#10B981',
  admin: '#F59E0B'
};

const ROLE_BG = {
  patient: 'rgba(37, 99, 235, 0.1)',
  doctor: 'rgba(16, 185, 129, 0.1)',
  admin: 'rgba(245, 158, 11, 0.1)'
};

const ROLE_LABELS = { patient: 'Patient', doctor: 'Doctor', admin: 'Admin' };

function Avatar({ name, role, size = 38 }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: ROLE_BG[role] || '#F3F4F6',
      color: ROLE_COLORS[role] || '#4B5563',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
      border: `2px solid ${ROLE_COLORS[role] || '#D1D5DB'}`,
    }}>{initials}</div>
  );
}

function RoleBadge({ role }) {
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 12,
      background: ROLE_BG[role] || '#F3F4F6',
      color: ROLE_COLORS[role] || '#4B5563',
      fontWeight: 700, border: `1px solid ${ROLE_COLORS[role] || '#D1D5DB'}`
    }}>{ROLE_LABELS[role]}</span>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected]           = useState(null);
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [sending, setSending]             = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showNewModal, setShowNewModal]   = useState(false);
  const [searchTerm, setSearchTerm]       = useState('');
  const [userSearch, setUserSearch]       = useState('');
  const [deletingConvo, setDeletingConvo] = useState(null);
  const pollingRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Clear all chat state when user changes (logout/login)
  useEffect(() => {
    if (!user) {
      setConversations([]);
      setSelected(null);
      setMessages([]);
      setInput('');
      setShowNewModal(false);
      setSearchTerm('');
      setUserSearch('');
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    fetchConversations();
    fetchAvailableUsers();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (selected) {
      pollingRef.current = setInterval(() => fetchMessages(selected.other_user_id, selected.other_user_role), 5000);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [selected]);

  const fetchConversations = async () => {
    try {
      const res = await axios.get('/api/chat/conversations');
      const seen = new Set();
      const unique = (res.data || []).filter(c => {
        const key = `${c.other_user_role}:${c.other_user_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setConversations(unique);
    } catch (err) {
      console.error('Error fetching conversations:', err.response?.data?.error || err.message);
      setConversations([]);
    } finally { 
      setLoadingConvos(false); 
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const res = await axios.get('/api/chat/users');
      setAvailableUsers(res.data || []);
    } catch (err) {
      console.error('Error fetching available users:', err.response?.data?.error || err.message);
      setAvailableUsers([]);
    }
  };

  const fetchMessages = async (otherUserId, otherRole) => {
    try {
      const res = await axios.get(`/api/chat/messages/${otherUserId}?otherRole=${otherRole || ''}`);
      setMessages(res.data || []);
      fetchConversations();
    } catch (err) {
      console.error('Error fetching messages:', err.response?.data?.error || err.message);
      setMessages([]);
    }
  };

  const selectConversation = (convo) => {
    setSelected(convo);
    setSearchTerm('');
    fetchMessages(convo.other_user_id, convo.other_user_role);
  };

  const startNewChat = (targetUser) => {
    const existing = conversations.find(c =>
      c.other_user_id === targetUser.id && c.other_user_role === targetUser.role
    );
    if (existing) {
      selectConversation(existing);
    } else {
      setSelected({
        other_user_id: targetUser.id,
        other_user_name: targetUser.name,
        other_user_role: targetUser.role,
        department: targetUser.department,
        last_message: null,
        unread_count: 0,
      });
      setMessages([]);
    }
    setShowNewModal(false);
    setUserSearch('');
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selected || sending) return;
    setSending(true);
    try {
      await axios.post('/api/chat/send', {
        receiverId: selected.other_user_id,
        receiverRole: selected.other_user_role,
        message: input.trim(),
      });
      setInput('');
      fetchMessages(selected.other_user_id, selected.other_user_role);
      fetchConversations();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send message.');
    } finally { setSending(false); }
  };

  const deleteConversation = async (convo) => {
    if (!window.confirm(`Delete your entire conversation with ${convo.other_user_name}? This cannot be undone.`)) return;
    setDeletingConvo(convo.other_user_id);
    try {
      await axios.delete(`/api/chat/conversation/${convo.other_user_id}?otherRole=${convo.other_user_role}`);
      if (selected?.other_user_id === convo.other_user_id) {
        setSelected(null);
        setMessages([]);
      }
      fetchConversations();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete conversation.');
    } finally { setDeletingConvo(null); }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); }
  };

  const fmt = (ts) => {
    const d = new Date(ts);
    const diff = Date.now() - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  };

  const filteredUsers = availableUsers.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.department || '').toLowerCase().includes(userSearch.toLowerCase())
  );
  const groupedUsers = filteredUsers.reduce((acc, u) => {
    const g = ROLE_LABELS[u.role] + 's';
    if (!acc[g]) acc[g] = [];
    acc[g].push(u);
    return acc;
  }, {});

  const filteredConvos = conversations.filter(c =>
    !searchTerm || c.other_user_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group messages by date
  const groupMessagesByDate = (msgs) => {
    const groups = [];
    let lastDate = null;
    for (const msg of msgs) {
      const d = new Date(msg.created_at).toDateString();
      if (d !== lastDate) { groups.push({ type: 'date', label: d === new Date().toDateString() ? 'Today' : d }); lastDate = d; }
      groups.push({ type: 'msg', msg });
    }
    return groups;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageCircle size={24} strokeWidth={1.5} />
            Messages
          </h1>
          <p>Chat with your care team</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
          <Plus size={16} strokeWidth={2} />
          New Message
        </button>
      </div>

      <div className="chat-layout">
        {/* ── Sidebar ── */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <span style={{ fontSize: 13, fontWeight: 700, color: '#000000' }}>Conversations</span>
            <span style={{ fontSize: 11.5, color: '#000000' }}>{conversations.length} chats</span>
          </div>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #E5E7EB' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} strokeWidth={1.5} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#000000' }} />
              <input className="form-input" placeholder="Search conversations..." style={{ fontSize: 12.5, padding: '7px 10px 7px 32px' }}
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="chat-list">
            {loadingConvos ? (
              <div className="spinner" style={{ marginTop: 40 }} />
            ) : filteredConvos.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 16px' }}>
                <MessageCircle size={32} strokeWidth={1.5} style={{ marginBottom: 8, opacity: 0.5, color: '#000000' }} />
                <h3>No conversations</h3>
                <p>Start a new message</p>
              </div>
            ) : (
              filteredConvos.map(c => {
                const isActive = selected?.other_user_id === c.other_user_id && selected?.other_user_role === c.other_user_role;
                return (
                  <div key={`${c.other_user_role}:${c.other_user_id}`}
                    className={`chat-item ${isActive ? 'active' : ''}`}
                    style={{ position: 'relative' }}
                    onClick={() => selectConversation(c)}>
                    <Avatar name={c.other_user_name} role={c.other_user_role} />
                    <div className="chat-item-info" style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span className="chat-item-name">{c.other_user_name}</span>
                        <RoleBadge role={c.other_user_role} />
                      </div>
                      <div className="chat-item-last">
                        {c.last_message || 'Start a conversation'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      {c.last_message_time && (
                        <span style={{ fontSize: 10.5, color: isActive ? '#4B5563' : '#9CA3AF' }}>{fmt(c.last_message_time)}</span>
                      )}
                      {c.unread_count > 0 && (
                        <span className="nav-badge" style={{ position: 'static' }}>{c.unread_count}</span>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); deleteConversation(c); }}
                        disabled={deletingConvo === c.other_user_id}
                        title="Delete conversation"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: isActive ? '#4B5563' : '#9CA3AF', fontSize: 13, padding: '2px 4px', borderRadius: 4,
                          transition: 'color 0.15s',
                        }}
                        onMouseOver={e => e.currentTarget.style.color = '#EF4444'}
                        onMouseOut={e => e.currentTarget.style.color = isActive ? '#4B5563' : '#9CA3AF'}
                      ><Trash2 size={14} strokeWidth={1.5} /></button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Chat Main ── */}
        <div className="chat-main">
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, background: '#F9FAFB' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <MessageCircle size={28} strokeWidth={1.5} style={{ color: '#4B5563' }} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Select a conversation</div>
              <div style={{ fontSize: 13, color: '#4B5563' }}>or start a new one</div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowNewModal(true)}>
                <Plus size={14} strokeWidth={2} />
                New Message
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="chat-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #E5E7EB', background: '#ffffff' }}>
                <Avatar name={selected.other_user_name} role={selected.other_user_role} size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{selected.other_user_name}</div>
                  <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <RoleBadge role={selected.other_user_role} />
                    {selected.department && <span style={{ color: '#4B5563' }}>· {selected.department}</span>}
                  </div>
                </div>
                <button
                  onClick={() => deleteConversation(selected)}
                  title="Delete conversation"
                  style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#000000', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                  Delete
                </button>
              </div>

              {/* Messages */}
              <div className="chat-messages" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 4, background: '#F9FAFB' }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#000000', fontSize: 13, padding: 20 }}>
                    No messages yet. Say hello! 👋
                  </div>
                )}
                {groupMessagesByDate(messages).map((item, i) => {
                  if (item.type === 'date') {
                    return (
                      <div key={i} style={{ textAlign: 'center', margin: '12px 0 4px', fontSize: 11, color: '#000000', fontWeight: 700, opacity: 0.6 }}>
                        ── {item.label} ──
                      </div>
                    );
                  }
                  const msg = item.msg;
                  const isMine = msg.sender_id === user.id && msg.sender_role === user.role;
                  return (
                    <div key={msg.id || i} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMine ? 'flex-end' : 'flex-start',
                      marginBottom: 6,
                    }}>
                      {/* Sender label on their messages */}
                      {!isMine && (
                        <div style={{ fontSize: 10.5, color: '#000000', marginBottom: 3, marginLeft: 4, fontWeight: 600 }}>
                          {selected.other_user_name}
                        </div>
                      )}
                      <div style={{
                        maxWidth: '70%',
                        padding: '10px 14px',
                        borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isMine ? '#2563EB' : '#ffffff',
                        color: isMine ? '#ffffff' : '#111827',
                        boxShadow: isMine ? '0 2px 8px rgba(37, 99, 235, 0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
                        border: isMine ? 'none' : '1px solid #E5E7EB',
                        fontSize: 13.5,
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {msg.message}
                      </div>
                      <div style={{
                        fontSize: 10, color: '#000000', marginTop: 3,
                        marginLeft: isMine ? 0 : 4,
                        marginRight: isMine ? 4 : 0,
                      }}>
                        {fmt(msg.created_at)}
                        {isMine && (
                          <span style={{ marginLeft: 4, color: msg.is_read ? '#2563EB' : '#9CA3AF', opacity: 0.7 }}>
                            {msg.is_read ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="chat-input-row" style={{ padding: '12px 16px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10, alignItems: 'flex-end', background: '#ffffff', position: 'relative', zIndex: 10 }}>
                <textarea
                  className="chat-input"
                  rows={1}
                  placeholder={`Message ${selected.other_user_name}...`}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  style={{ flex: 1, resize: 'none', borderRadius: 20, padding: '9px 16px', fontSize: 13.5, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#000000' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  type="button"
                  title="Send message"
                  style={{
                    width: 40, height: 40, borderRadius: '50%', border: 'none',
                    background: input.trim() ? '#2563EB' : '#E5E7EB',
                    color: input.trim() ? '#ffffff' : '#4B5563',
                    fontSize: 16, cursor: input.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.2s', position: 'relative', zIndex: 11,
                  }}>
                  {sending ? '…' : <Send size={18} strokeWidth={2} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── New Chat Modal ── */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={18} strokeWidth={2} />
                New Message
              </span>
              <button className="modal-close" onClick={() => setShowNewModal(false)}>
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Search size={16} strokeWidth={1.5} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#000000' }} />
              <input className="form-input" placeholder="Search by name or department..." autoFocus
                value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ paddingLeft: 36 }} />
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {Object.keys(groupedUsers).length === 0 ? (
                <div className="empty-state">
                  <Search size={32} strokeWidth={1.5} style={{ marginBottom: 8, opacity: 0.5, color: '#000000' }} />
                  <h3>No users found</h3>
                </div>
              ) : (
                Object.entries(groupedUsers).map(([group, users]) => (
                  <div key={group}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '10px 0 6px' }}>{group}</div>
                    {users.map(u => (
                      <div key={`${u.role}:${u.id}`} onClick={() => startNewChat(u)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, border: '1px solid #E5E7EB', transition: 'background 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.background = '#F3F4F6'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <Avatar name={u.name} role={u.role} size={36} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#000000' }}>{u.name}</div>
                          <div style={{ fontSize: 12, color: '#000000' }}>{u.department || u.email || ROLE_LABELS[u.role]}</div>
                        </div>
                        <RoleBadge role={u.role} />
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}