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
  Lock,
} from 'lucide-react';

export default function Sidebar({ activePage, setActivePage }) {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

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
  ];

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : 'P';

  return (
    <>
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
      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
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
            <button key={item.id} className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
              title={item.label}>
              <span className="nav-icon">
                <item.icon size={16} strokeWidth={1.5} />
              </span>
              {item.label}
              {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">Patient</div>
            </div>
          </div>
          <button 
            className="nav-item" 
            onClick={() => setActivePage('change-password')}
            style={{ width: '100%' }}
            title="Change your password"
          >
            <span className="nav-icon">
              <Lock size={16} strokeWidth={1.5} />
            </span>
            Change Password
          </button>
          <button className="nav-item" onClick={logout} style={{ width: '100%' }}>
            <span className="nav-icon">
              <LogOut size={16} strokeWidth={1.5} />
            </span>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}