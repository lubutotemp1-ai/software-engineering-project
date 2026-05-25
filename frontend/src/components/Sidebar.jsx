import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  HeartPulse,
  Bot,
  MessagesSquare,
  BookOpen,
  FileText,
  LogOut,
  Menu,
  ChevronLeft,
  Lock
} from 'lucide-react';
import hospitalSvg from '../images/hospital-svgrepo-com (1).svg';

export default function Sidebar({ activePage, setActivePage }) {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await axios.get('/api/chat/unread-count');
        setUnreadCount(res.data.count);
      } catch {}
    };
    fetchUnread();
    const iv = setInterval(fetchUnread, 30000);
    return () => clearInterval(iv);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'health', label: 'Health Tracker', icon: HeartPulse },
    { id: 'diagnosis', label: 'AI Diagnosis', icon: Bot },
    { id: 'chat', label: 'Messages', icon: MessagesSquare, badge: unreadCount },
    { id: 'education', label: 'Health Education', icon: BookOpen },
    { id: 'records', label: 'Records', icon: FileText },
    { id: 'change-password', label: 'Change Password', icon: Lock },
  ];

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : 'P';

  return (
    <aside className="sidebar" style={{ width: isExpanded ? '260px' : '80px', transition: 'width 0.3s ease' }}>
      <div className="sidebar-logo" style={{ justifyContent: isExpanded ? 'space-between' : 'center', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isExpanded && (
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, flex: 1 }}>
            <img src={hospitalSvg} alt="Hospital" style={{ width: 18, height: 18 }} />
            Health Portal
          </h2>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="sidebar-toggle-btn"
          style={{
            background: 'rgba(37, 99, 235, 0.1)',
            border: '1px solid rgba(37, 99, 235, 0.2)',
            cursor: 'pointer',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563EB',
            borderRadius: '6px',
            transition: 'all 0.2s',
            minWidth: '40px',
            minHeight: '40px',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.1)'}
          title={isExpanded ? 'Collapse Menu' : 'Expand Menu'}
          aria-label={isExpanded ? 'Collapse Menu' : 'Expand Menu'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? <ChevronLeft size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
        </button>
      </div>
      {!isExpanded && (
        <div style={{
          fontSize: '10px',
          color: '#9CA3AF',
          textAlign: 'center',
          paddingTop: '4px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Menu
        </div>
      )}
      {isExpanded && <span style={{ fontSize: 12, color: '#9CA3AF', paddingLeft: '16px' }}>Patient Dashboard</span>}

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button key={item.id} className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => setActivePage(item.id)}
            title={!isExpanded ? item.label : undefined}>
            <span className="nav-icon">
              <item.icon size={16} strokeWidth={1.5} />
            </span>
            {isExpanded && <span>{item.label}</span>}
            {item.badge > 0 && isExpanded && <span className="nav-badge">{item.badge}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" style={{ justifyContent: isExpanded ? 'flex-start' : 'center' }}>
          <div className="sidebar-avatar">{initials}</div>
          {isExpanded && (
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">Patient</div>
            </div>
          )}
        </div>
        <button className="nav-item" onClick={logout} style={{ width: '100%' }} title={!isExpanded ? 'Sign Out' : undefined}>
          <span className="nav-icon">
            <LogOut size={16} strokeWidth={1.5} />
          </span>
          {isExpanded && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}