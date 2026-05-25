import React, { useState } from 'react';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import AppointmentsPage from './pages/AppointmentsPage';
import HealthTracker from './pages/HealthTracker';
import EducationPage from './pages/EducationPage';
import RecordsPage from './pages/RecordsPage';
import AdminDashboard from './pages/AdminDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import ChatPage from './pages/ChatPage';
import DiagnosisPage from './pages/DiagnosisPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function AppContent() {
  const { user, loading, logout } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [authView, setAuthView] = useState('landing');

  React.useEffect(() => {
    // Handle browser back/forward buttons
    const handlePopState = () => {
      if (authView === 'login') setAuthView('landing');
      else if (authView === 'register') setAuthView('landing');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [authView]);

  React.useEffect(() => {
    // Push history state when navigating
    if (authView === 'login') {
      window.history.pushState({ view: 'login' }, 'Login');
    } else if (authView === 'register') {
      window.history.pushState({ view: 'register' }, 'Register');
    } else if (authView === 'landing') {
      window.history.pushState({ view: 'landing' }, 'Landing');
    }
  }, [authView]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--grey-50)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🏥</div>
          <div className="spinner" style={{ margin: '0 auto' }} />
          <p style={{ color: 'var(--grey-400)', marginTop: 12, fontSize: '14px' }}>Loading Health Easy Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authView === 'landing') {
      return (
        <LandingPage 
          onSignIn={() => setAuthView('login')} 
          onGetStarted={() => setAuthView('register')} 
        />
      );
    }
    return authView === 'login'
      ? <LoginPage onSwitch={() => setAuthView('register')} onBack={() => setAuthView('landing')} />
      : <RegisterPage onSwitch={() => setAuthView('login')} onBack={() => setAuthView('landing')} />;
  }

  if (user.role === 'admin') return <AdminDashboard user={user} onLogout={logout} />;
  if (user.role === 'doctor') return <DoctorDashboard user={user} onLogout={logout} />;

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':        return <Dashboard setActivePage={setActivePage} />;
      case 'appointments':     return <AppointmentsPage />;
      case 'health':           return <HealthTracker />;
      case 'diagnosis':        return <DiagnosisPage />;
      case 'chat':             return <ChatPage />;
      case 'education':        return <EducationPage />;
      case 'records':          return <RecordsPage />;
      case 'change-password':  return <ChangePasswordPage />;
      default:                 return <Dashboard setActivePage={setActivePage} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="main-content">{renderPage()}</main>
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}
