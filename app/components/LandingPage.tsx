'use client';

import { useApp } from '../context/AppContext';

// SVG Icons
const HeartPulse = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>
  </svg>
);
const ShieldCheck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);
const Zap = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const Database = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
  </svg>
);
const Globe = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const ClipboardList = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <line x1="12" y1="11" x2="16" y2="11"/><line x1="12" y1="16" x2="16" y2="16"/>
    <line x1="8" y1="11" x2="8.01" y2="11"/><line x1="8" y1="16" x2="8.01" y2="16"/>
  </svg>
);
const ArrowRight = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const CheckCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
  </svg>
);

const FEATURES = [
  { icon: <Zap />, color: '#E53E3E', bg: '#FFF5F5', title: 'Instant Triage', desc: 'Our AI engine analyzes 8 key symptom indicators and returns a calibrated risk score in seconds.' },
  { icon: <ShieldCheck />, color: '#2B6CB0', bg: '#EBF8FF', title: 'Risk Score Engine', desc: 'Weighted scoring model (Mild=1, Moderate=2, Severe=3) combined with duration and symptom-specific multipliers.' },
  { icon: <Database />, color: '#276749', bg: '#F0FFF4', title: 'PostgreSQL History', desc: 'Every test is persisted to a secure PostgreSQL database, giving you a full audit trail of your health assessments.' },
  { icon: <Globe />, color: '#6B46C1', bg: '#FAF5FF', title: 'Multilingual', desc: 'Native support for English, Hindi (हिन्दी), and Marathi (मराठी) — language preference saved per account.' },
  { icon: <ClipboardList />, color: '#B7791F', bg: '#FFFFF0', title: 'Detailed Reports', desc: 'Past test results with date, risk level, score, and symptoms. Queryable from the dashboard at any time.' },
  { icon: <HeartPulse />, color: '#C05621', bg: '#FFFAF0', title: 'Family Profiles', desc: 'Run assessments for yourself or a family member — each report is properly attributed and stored separately.' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Sign in or create an account', desc: 'Secure authentication. Your data is private and encrypted.' },
  { step: '02', title: 'Choose language & profile', desc: 'Select English, Hindi, or Marathi. Choose yourself or a family member.' },
  { step: '03', title: 'Answer 8 symptom questions', desc: 'MCQ + free-text questions covering severity, duration, history, and more.' },
  { step: '04', title: 'Receive your triage report', desc: 'Instant risk score with recommendations — hospital, doctor, or home care.' },
];

export default function LandingPage() {
  const { setScreen } = useApp();

  return (
    <div style={{ minHeight: '100vh', background: 'white' }}>

      {/* ── Navbar ── */}
      <nav className="landing-nav" style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #F1F5F9',
        padding: '0 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '62px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '9px',
            background: 'linear-gradient(135deg, #FC8181, #E53E3E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white',
          }}>
            <HeartPulse />
          </div>
          <span style={{ fontSize: '16px', fontWeight: '800', color: '#1A202C', letterSpacing: '-0.3px' }}>
            Sympto<span style={{ color: '#E53E3E' }}>Sense</span>
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[
            { label: 'Features', action: () => {} },
            { label: 'How it works', action: () => setScreen('how-it-works') },
            { label: 'About', action: () => setScreen('about') },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                padding: '8px 16px', borderRadius: '8px', fontSize: '14px',
                fontWeight: '500', color: '#4A5568', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#E53E3E'; e.currentTarget.style.background = '#FFF5F5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#4A5568'; e.currentTarget.style.background = 'none'; }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            id="nav-signin-btn"
            className="btn btn-outline"
            onClick={() => setScreen('login')}
            style={{ padding: '8px 18px' }}
          >
            Sign in
          </button>
          <button
            id="nav-getstarted-btn"
            className="btn btn-red"
            onClick={() => setScreen('login')}
            style={{ padding: '8px 18px' }}
          >
            Get started <ArrowRight />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        padding: '80px 48px 72px',
        background: 'linear-gradient(160deg, #FFF5F5 0%, #FFFFFF 50%, #FFF5F5 100%)',
        textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle bg blobs */}
        <div style={{ position: 'absolute', top: '-80px', left: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(252,129,129,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', right: '-60px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(252,129,129,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '720px', margin: '0 auto' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#FFF5F5', color: '#C53030', border: '1px solid #FEB2B2',
            padding: '5px 14px', borderRadius: '999px', fontSize: '12.5px', fontWeight: '600',
            marginBottom: '24px',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#E53E3E' }} />
            AI-Powered · Flask / PostgreSQL / Next.js
          </div>

          <h1 style={{
            fontSize: '52px', fontWeight: '900', color: '#1A202C',
            letterSpacing: '-1.5px', lineHeight: '1.1', marginBottom: '20px',
          }}>
            Smart Symptom<br />
            <span style={{ color: '#E53E3E' }}>Triage</span> System
          </h1>
          <p style={{
            fontSize: '18px', color: '#4A5568', lineHeight: '1.7',
            marginBottom: '36px', maxWidth: '560px', margin: '0 auto 36px',
          }}>
            Answer 8 targeted questions. Get an instant AI-powered risk score with actionable medical recommendations — in your language.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              id="hero-getstarted-btn"
              className="btn btn-red"
              onClick={() => setScreen('login')}
              style={{ padding: '13px 28px', fontSize: '15px', gap: '8px' }}
            >
              Start Free Assessment <ArrowRight />
            </button>
            <button
              id="hero-signin-btn"
              className="btn btn-outline"
              onClick={() => setScreen('login')}
              style={{ padding: '13px 28px', fontSize: '15px' }}
            >
              Sign in to Dashboard
            </button>
          </div>

          {/* Trust line */}
          <div style={{ marginTop: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {['Decision support only', 'No personal data sold', 'Open-source stack'].map((t) => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#718096' }}>
                <CheckCircle /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Dashboard preview card */}
        <div style={{ maxWidth: '860px', margin: '56px auto 0', position: 'relative', zIndex: 1 }}>
          <div style={{
            background: 'white', borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 25px 60px -12px rgb(0 0 0 / 0.12), 0 0 0 1px rgb(0 0 0 / 0.03)',
            overflow: 'hidden',
          }}>
            {/* Mock browser chrome */}
            <div style={{ background: '#F7FAFC', borderBottom: '1px solid #E2E8F0', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FC8181' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F6E05E' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#68D391' }} />
              <div style={{ flex: 1, background: '#EDF2F7', borderRadius: '5px', height: '22px', marginLeft: '10px', display: 'flex', alignItems: 'center', paddingLeft: '10px' }}>
                <span style={{ fontSize: '11px', color: '#A0AEC0', fontFamily: 'monospace' }}>localhost:3000 · SymptoSense Dashboard</span>
              </div>
            </div>
            {/* Mock UI content */}
            <div style={{ display: 'flex', height: '220px' }}>
              {/* Sidebar */}
              <div style={{ width: '160px', background: 'white', borderRight: '1px solid #F1F5F9', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', borderRadius: '7px', background: '#FFF5F5' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#E53E3E' }} />
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#E53E3E' }}>Home</span>
                </div>
                {['Past Reports', 'Settings'].map((n) => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#CBD5E0' }} />
                    <span style={{ fontSize: '11px', color: '#A0AEC0' }}>{n}</span>
                  </div>
                ))}
              </div>
              {/* Main */}
              <div style={{ flex: 1, padding: '16px 20px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#1A202C', marginBottom: '10px' }}>Good morning, Rahul Sharma</div>
                {/* Alert */}
                <div style={{ background: '#FFF5F5', border: '1px solid #FEB2B2', borderLeft: '3px solid #E53E3E', borderRadius: '7px', padding: '8px 12px', fontSize: '11px', color: '#C53030', marginBottom: '10px' }}>
                  ⚠ High Risk Detected — last score 22/30
                </div>
                {/* Cards row */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  {[['Self', 'Active Profile'], ['2 days ago', 'Last Test'], ['Today', 'Recommended']].map(([v, l]) => (
                    <div key={l} style={{ flex: 1, background: 'white', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '10px' }}>
                      <div style={{ fontSize: '9px', color: '#A0AEC0', fontWeight: '600', marginBottom: '3px', textTransform: 'uppercase' }}>{l}</div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#1A202C' }}>{v}</div>
                    </div>
                  ))}
                </div>
                {/* Start button */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#E53E3E', color: 'white', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' }}>
                  ▶ Start Triage Test
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '80px 48px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#E53E3E', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Features</div>
            <h2 style={{ fontSize: '34px', fontWeight: '800', color: '#1A202C', letterSpacing: '-0.8px', marginBottom: '12px' }}>
              Everything you need for smart triage
            </h2>
            <p style={{ fontSize: '16px', color: '#4A5568', maxWidth: '520px', margin: '0 auto' }}>
              Built on a production-grade stack — Flask API, PostgreSQL database, and Next.js frontend.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="card feature-card" style={{ padding: '26px', cursor: 'default' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '11px',
                  background: f.bg, color: f.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '16px',
                }}>{f.icon}</div>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1A202C', marginBottom: '8px' }}>{f.title}</h3>
                <p style={{ fontSize: '13.5px', color: '#4A5568', lineHeight: '1.65' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={{ padding: '80px 48px', background: 'white' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#E53E3E', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>How it works</div>
            <h2 style={{ fontSize: '34px', fontWeight: '800', color: '#1A202C', letterSpacing: '-0.8px' }}>
              From login to results in under 3 minutes
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {HOW_IT_WORKS.map((s, i) => (
              <div key={i} className="card" style={{ padding: '24px 26px', display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
                <div style={{
                  fontSize: '13px', fontWeight: '800', color: '#E53E3E',
                  background: '#FFF5F5', border: '1px solid #FEB2B2',
                  width: '38px', height: '38px', borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{s.step}</div>
                <div>
                  <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: '#1A202C', marginBottom: '5px' }}>{s.title}</h3>
                  <p style={{ fontSize: '13.5px', color: '#4A5568', lineHeight: '1.6' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" style={{ padding: '80px 48px', background: '#FFF5F5' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#E53E3E', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>About</div>
            <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#1A202C', letterSpacing: '-0.7px', marginBottom: '16px', lineHeight: '1.2' }}>
              Decision support, not a diagnosis
            </h2>
            <p style={{ fontSize: '14px', color: '#4A5568', lineHeight: '1.75', marginBottom: '14px' }}>
              SymptoSense is a clinical decision-support tool designed to help users understand the urgency of their symptoms. It is <strong>not a replacement for professional medical advice</strong>.
            </p>
            <p style={{ fontSize: '14px', color: '#4A5568', lineHeight: '1.75', marginBottom: '24px' }}>
              Built with Flask (Python) as the backend API, PostgreSQL for persistent report storage, and Next.js for the frontend — this system is designed as a full-stack demonstration of a healthcare triage workflow.
            </p>
            <div style={{
              background: 'white', border: '1px solid #FEB2B2', borderLeft: '4px solid #E53E3E',
              borderRadius: '9px', padding: '14px 16px', fontSize: '13px', color: '#C53030', fontWeight: '500',
            }}>
              ⚠️ Always seek emergency care immediately if you believe you are experiencing a medical emergency.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { label: 'Tech Stack', value: 'Next.js 16 · Flask 3 · PostgreSQL 15' },
              { label: 'Supported Languages', value: 'English · हिन्दी · मराठी' },
              { label: 'Questions per test', value: '8 adaptive questions' },
              { label: 'Risk scoring', value: 'Severity × Duration × Symptom weight' },
              { label: 'Data storage', value: 'PostgreSQL user_reports table' },
              { label: 'Version', value: 'v1.0.4 (Demo / Mock data)' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'white', borderRadius: '9px', border: '1px solid #E2E8F0', gap: '16px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#718096' }}>{item.label}</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#1A202C', textAlign: 'right' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{
        padding: '72px 48px',
        background: 'linear-gradient(135deg, #FC8181 0%, #E53E3E 50%, #C53030 100%)',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: '32px', fontWeight: '800', color: 'white', letterSpacing: '-0.7px', marginBottom: '12px' }}>
          Ready to assess your symptoms?
        </h2>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', marginBottom: '30px' }}>
          Takes less than 3 minutes. No medical training required.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
          <button
            id="cta-getstarted-btn"
            onClick={() => setScreen('login')}
            style={{
              background: 'white', color: '#E53E3E', border: 'none',
              padding: '13px 28px', borderRadius: '10px', fontSize: '15px',
              fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 14px rgb(0 0 0 / 0.15)',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgb(0 0 0 / 0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgb(0 0 0 / 0.15)'; }}
          >
            Get Started — It&apos;s Free <ArrowRight />
          </button>
          <button
            id="cta-signin-btn"
            onClick={() => setScreen('login')}
            style={{
              background: 'rgba(255,255,255,0.15)', color: 'white',
              border: '1.5px solid rgba(255,255,255,0.4)',
              padding: '13px 28px', borderRadius: '10px', fontSize: '15px',
              fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
          >
            Sign in to your account
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: '28px 48px', background: '#1A202C', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>Sympto<span style={{ color: '#FC8181' }}>Sense</span></span>
          <span style={{ color: '#4A5568', fontSize: '13px' }}>v1.0.4 · Demo Build · Mock Data Only</span>
        </div>
        <span style={{ fontSize: '12px', color: '#4A5568' }}>
          Built with Flask · PostgreSQL · Next.js · ⚠️ Decision support only — not a medical diagnosis
        </span>
      </footer>

    </div>
  );
}
