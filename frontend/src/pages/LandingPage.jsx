import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Brain, 
  MessageCircle, 
  Activity, 
  Shield, 
  Sparkles,
  ChevronRight,
  ArrowRight,
  Heart,
  Zap,
  Star
} from 'lucide-react';

export default function LandingPage({ onGetStarted, onSignIn }) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e) => setMousePosition({ x: e.clientX, y: e.clientY });
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const features = [
    { icon: Calendar,     title: 'Smart Appointment Booking', description: 'Book visits instantly with real-time doctor availability',          color: '#4A90E2', delay: 0   },
    { icon: Brain,        title: 'AI-Powered Diagnosis',       description: 'Get instant health insights powered by advanced AI',                color: '#9B59B6', delay: 0.1 },
    { icon: MessageCircle,title: 'Direct Doctor Messaging',    description: '24/7 consultation access with your healthcare providers',           color: '#3498DB', delay: 0.2 },
    { icon: Activity,     title: 'Health Tracking',            description: 'Monitor your vitals and track your wellness journey',               color: '#4CAF50', delay: 0.3 },
    { icon: Shield,       title: 'Secure & Private',           description: 'HIPAA compliant platform with end-to-end encryption',               color: '#E74C3C', delay: 0.4 },
    { icon: Sparkles,     title: 'Personalized Care',          description: 'AI-driven health recommendations tailored to you',                  color: '#F39C12', delay: 0.5 },
  ];

  const stats = [
    { value: '98%',  label: 'Satisfaction',  icon: Star          },
    { value: '24/7', label: 'Support',       icon: Zap           },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      position: 'relative', overflow: 'hidden',
      fontFamily: 'Montserrat, sans-serif'
    }}>
      {/* Particles */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(30)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: Math.random() * 6 + 2 + 'px', height: Math.random() * 6 + 2 + 'px',
            background: 'rgba(255,255,255,0.3)', borderRadius: '50%',
            left: Math.random() * 100 + '%', top: Math.random() * 100 + '%',
            animation: `float ${Math.random() * 10 + 10}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`, filter: 'blur(1px)'
          }} />
        ))}
      </div>

      {/* Mouse follower */}
      <div style={{
        position: 'fixed', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgb(230, 0, 255) 0%, transparent 15%)',
        borderRadius: '50%', pointerEvents: 'none',
        transform: `translate(${mousePosition.x - 300}px, ${mousePosition.y - 300}px)`,
        transition: 'transform 0.3s ease-out', zIndex: 1
      }} />

      {/* ── Header ── */}
      <header style={{
        position: 'relative', zIndex: 10, padding: '24px 48px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        animation: 'fadeInDown 0.8s cubic-bezier(0.4,0,0.2,1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
          <Activity size={32} strokeWidth={2} />
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>Health Easy Portal</div>
            <div style={{ fontSize: '11px', opacity: 0.9, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Your all-in-one health platform
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Sign In */}
          <button onClick={onSignIn} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)',
            padding: '10px 24px', borderRadius: '50px', color: 'white',
            fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            fontFamily: 'Montserrat, sans-serif', transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',

          }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(157, 0, 255, 0.74)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.8)'; e.currentTarget.style.transform = 'translateY(-2px)'; }} 
          onMouseEnter={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            Sign In
          </button>

          {/* Get Started → Register */}
          <button onClick={onGetStarted} style={{
            background: 'transparent', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.3)', padding: '12px 28px',
            borderRadius: '50px', color: 'white', fontWeight: 600, fontSize: '15px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            fontFamily: 'Montserrat, sans-serif', transition: 'all 0.3s ease',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}
          onMouseOver={e => {e.currentTarget.style.background = 'rgb(0, 0, 255)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 30px rgba(0,0,0,0.15)'; }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 30px rgba(0,0,0,0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'; }}>
            Get Started <ArrowRight size={18} />
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{
        position: 'relative', zIndex: 2, padding: '80px 48px 120px',
        textAlign: 'center', maxWidth: '1200px', margin: '0 auto'
      }}>
        <div style={{ animation: 'fadeInUp 1s cubic-bezier(0.4,0,0.2,1)', animationFillMode: 'backwards', animationDelay: '0.2s' }}>
          <h1 style={{
            fontSize: '64px', fontWeight: 800, color: 'white', marginBottom: '24px',
            lineHeight: 1.1, letterSpacing: '-0.03em', textShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            Transform Your<br />
            <span style={{
              background: 'linear-gradient(90deg, #fff, #f093fb)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              animation: 'shimmer 3s ease-in-out infinite'
            }}>
              Healthcare Experience
            </span>
          </h1>

          <p style={{
            fontSize: '20px', color: 'rgba(255,255,255,0.9)', maxWidth: '700px',
            margin: '0 auto 48px', lineHeight: 1.6, fontWeight: 400
          }}>
            Connect with healthcare professionals, track your health, and get AI-powered 
            insights all in one secure platform.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {/* Start Free Trial → Register */}
            <button onClick={onGetStarted} style={{
              background: 'transparent', backdropFilter: 'blur(10px)',
              border: '1px rgba(255,255,255,0.3) solid',color: '#ffffff',
              padding: '16px 40px', borderRadius: '50px', fontSize: '16px', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
              fontFamily: 'Montserrat, sans-serif', transition: 'all 0.3s ease',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 30px rgba(0,0,0,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'; }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(0, 0, 255, 0.74)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}>
              Start Free Trial <Sparkles size={20} />
            </button>

            {/* Sign In → Login */}
            <button onClick={onSignIn} style={{
              background: 'transparent', color: 'white',
              border: '2px solid rgba(255,255,255,0.4)', padding: '16px 40px',
              borderRadius: '50px', fontSize: '16px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '10px',
              fontFamily: 'Montserrat, sans-serif', backdropFilter: 'blur(10px)', transition: 'all 0.3s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.8)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              Sign In <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '48px', marginTop: '80px', flexWrap: 'wrap',
          animation: 'fadeInUp 1s cubic-bezier(0.4,0,0.2,1)', animationFillMode: 'backwards', animationDelay: '0.6s'
        }}>
          {stats.map((stat, idx) => (
            <div key={idx} style={{
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: '24px',
              padding: '24px 32px', minWidth: '180px', textAlign: 'center',
              animation: `gentleFloat ${3 + idx * 0.5}s ease-in-out infinite`,
              animationDelay: `${idx * 0.2}s`, transition: 'all 0.3s ease', cursor: 'default'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = 'translateY(-8px) scale(1.05)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <stat.icon size={28} color="white" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '36px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>{stat.value}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ position: 'relative', zIndex: 2, padding: '80px 48px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '80px', animation: 'fadeInUp 1s cubic-bezier(0.4,0,0.2,1)', animationFillMode: 'backwards' }}>
          <h2 style={{ fontSize: '48px', fontWeight: 700, color: 'white', marginBottom: '16px', letterSpacing: '-0.02em' }}>Everything You Need</h2>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', maxWidth: '600px', margin: '0 auto' }}>
            Comprehensive healthcare tools designed to make your life easier
          </p>
        </div>

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            const isEven = idx % 2 === 0;
            return (
              <div key={idx} style={{
                position: 'relative', width: '100%', maxWidth: '600px',
                marginLeft: isEven ? '0' : 'auto', marginRight: isEven ? 'auto' : '0',
                animation: `slideIn${isEven ? 'Left' : 'Right'} 0.8s cubic-bezier(0.4,0,0.2,1)`,
                animationFillMode: 'backwards', animationDelay: `${feature.delay}s`
              }}>
                <div style={{
                  background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.2)', borderRadius: '28px',
                  padding: '32px 40px', display: 'flex', alignItems: 'center', gap: '24px',
                  transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)', cursor: 'default',
                  position: 'relative', overflow: 'hidden'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = `translateX(${isEven ? '12px' : '-12px'}) scale(1.02)`; e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,0,0,0.3)'; e.currentTarget.style.borderColor = feature.color; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateX(0) scale(1)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}>
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${feature.color}20, transparent)`, opacity: 0, transition: 'opacity 0.4s ease', pointerEvents: 'none' }} className="hover-gradient" />
                  <div style={{ width: '80px', height: '80px', background: `linear-gradient(135deg, ${feature.color}, ${feature.color}dd)`, borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 8px 24px ${feature.color}40`, position: 'relative', zIndex: 1 }}>
                    <Icon size={36} color="white" strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                    <h3 style={{ fontSize: '22px', fontWeight: 700, color: 'white', marginBottom: '8px', letterSpacing: '-0.01em' }}>{feature.title}</h3>
                    <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, margin: 0 }}>{feature.description}</p>
                  </div>
                  <ChevronRight size={24} color="white" style={{ opacity: 0.6, transition: 'all 0.3s ease', position: 'relative', zIndex: 1 }} className="arrow-icon" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: 'relative', zIndex: 2, padding: '120px 48px', textAlign: 'center' }}>
        <div style={{
          background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255,255,255,0.2)', borderRadius: '32px',
          padding: '80px 60px', maxWidth: '900px', margin: '0 auto',
          animation: 'scaleIn 1s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 20px 80px rgba(0,0,0,0.2)'
        }}>
          <Sparkles size={48} color="white" style={{ marginBottom: '24px', animation: 'pulse 2s ease-in-out infinite' }} />
          <h2 style={{ fontSize: '42px', fontWeight: 800, color: 'white', marginBottom: '20px', letterSpacing: '-0.02em' }}>
            Ready to Transform Your Health?
          </h2>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)', maxWidth: '600px', margin: '0 auto 40px' }}>
            Join the family to have a better healthcare experience through our platform.
          </p>

          {/* Get Started Free → Register */}
          <button onClick={onGetStarted} style={{
            background: 'white', color: '#667eea', border: 'none',
            padding: '20px 50px', borderRadius: '50px', fontSize: '18px', fontWeight: 700,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '12px',
            fontFamily: 'Montserrat, sans-serif', transition: 'all 0.3s ease',
            boxShadow: '0 12px 40px rgba(0,0,0,0.3)'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)'; e.currentTarget.style.boxShadow = '0 16px 50px rgba(0,0,0,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)'; }}>
            Get Started Free <ArrowRight size={22} />
          </button>

          {/* Already have an account → Login */}
          <div style={{ marginTop: '20px' }}>
            <button onClick={onSignIn} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)',
              fontSize: '14px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
              fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: '3px',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'white'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}>
              Already have an account? Sign in
            </button>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes fadeInDown  { from{opacity:0;transform:translateY(-30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeInUp    { from{opacity:0;transform:translateY(30px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes slideInLeft { from{opacity:0;transform:translateX(-60px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideInRight{ from{opacity:0;transform:translateX(60px)}  to{opacity:1;transform:translateX(0)} }
        @keyframes scaleIn     { from{opacity:0;transform:scale(0.9)}        to{opacity:1;transform:scale(1)}      }
        @keyframes float       { 0%,100%{transform:translateY(0) translateX(0)} 25%{transform:translateY(-20px) translateX(10px)} 50%{transform:translateY(-10px) translateX(-10px)} 75%{transform:translateY(-15px) translateX(5px)} }
        @keyframes gentleFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes pulse       { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        @keyframes shimmer     { 0%{background-position:-200% center} 100%{background-position:200% center} }
        div:hover .hover-gradient { opacity: 1 !important; }
        div:hover .arrow-icon     { opacity: 1 !important; transform: translateX(4px); }
        @media (max-width: 768px) {
          h1 { font-size: 36px !important; }
          h2 { font-size: 28px !important; }
          header { padding: 16px 20px !important; }
        }
      `}</style>
    </div>
  );
}