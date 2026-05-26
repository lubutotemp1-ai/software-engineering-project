import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  FileText,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  Lock,
  Zap,
  X
} from 'lucide-react';
import hospitalSvg from '../images/hospital-svgrepo-com (1).svg';

export default function AdminSidebar({ activePage, setActivePage, user, onLogout }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'doctors', label: 'Doctors', icon: Stethoscope },
    { id: 'appointments', label: 'Appointments', icon: FileText },
    { id: 'ai-usage', label: 'AI Usage', icon: Zap },
    { id: 'chat', label: 'Messages', icon: Users },
    { id: 'change-password', label: 'Change Password', icon: Lock },
  ];

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : 'A';

  return (
    <>
      {/* Mobile toggle button */}
      {isMobile && (
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 1000,
            background: '#F59E0B',
            border: 'none',
            borderRadius: '8px',
            padding: '10px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isMobileOpen ? <X size={20} strokeWidth={2} color="white" /> : <Menu size={20} strokeWidth={2} color="white" />}
        </button>
      )}

      {/* Mobile overlay */}
      {isMobile && isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 998,
          }}
        />
      )}

      <aside
        className="sidebar"
        style={{
          width: isMobile ? (isMobileOpen ? '260px' : '0px') : (isExpanded ? '260px' : '80px'),
          transition: isMobile ? 'transform 0.3s ease, width 0.3s ease' : 'width 0.3s ease',
          transform: isMobile && isMobileOpen ? 'translateX(0)' : (isMobile ? 'translateX(-100%)' : 'translateX(0)'),
          position: isMobile ? 'fixed' : 'relative',
          top: isMobile ? 0 : 'auto',
          left: isMobile ? 0 : 'auto',
          height: isMobile ? '100vh' : 'auto',
          zIndex: isMobile ? 999 : 'auto',
          overflow: isMobile ? 'auto' : 'visible',
        }}
      >
        <div className="sidebar-logo" style={{ justifyContent: isExpanded ? 'space-between' : 'center', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isExpanded && (
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, flex: 1 }}>
              <img src={hospitalSvg} alt="Hospital" style={{ width: 18, height: 18 }} />
              Health Portal
            </h2>
          )}
          {!isMobile && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="sidebar-toggle-btn"
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                cursor: 'pointer',
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F59E0B',
                borderRadius: '6px',
                transition: 'all 0.2s',
                minWidth: '40px',
                minHeight: '40px',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'}
              title={isExpanded ? 'Collapse Menu' : 'Expand Menu'}
              aria-label={isExpanded ? 'Collapse Menu' : 'Expand Menu'}
              aria-expanded={isExpanded}
            >
              {isExpanded ? <ChevronLeft size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
            </button>
          )}
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
        {isExpanded && <span style={{ fontSize: 12, color: '#9CA3AF', paddingLeft: '16px' }}>Admin Dashboard</span>}

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button key={item.id} className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => {
                setActivePage(item.id);
                if (isMobile) setIsMobileOpen(false);
              }}
              title={!isExpanded ? item.label : undefined}>
              <span className="nav-icon">
                <item.icon size={16} strokeWidth={1.5} />
              </span>
              {isExpanded && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" style={{ justifyContent: isExpanded ? 'flex-start' : 'center' }}>
            <div className="sidebar-avatar">{initials}</div>
            {isExpanded && (
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user?.name}</div>
                <div className="sidebar-user-role">Admin</div>
              </div>
            )}
          </div>
          <button
            className="nav-item"
            onClick={() => {
              onLogout();
              if (isMobile) setIsMobileOpen(false);
            }}
            style={{ width: '100%' }}
            title={!isExpanded ? 'Sign Out' : undefined}
          >
            <span className="nav-icon">
              <LogOut size={16} strokeWidth={1.5} />
            </span>
            {isExpanded && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
