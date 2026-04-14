'use client';

import { useRouter } from 'next/navigation';
import PublicNav from './components/PublicNav';

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
  { icon: <Zap />, color: '#B91C1C', bg: '#FEF2F2', title: 'Instant Triage', desc: 'Our AI engine analyzes 8 key symptom indicators and returns a calibrated risk score in seconds.' },
  { icon: <ShieldCheck />, color: '#1D4ED8', bg: '#EFF6FF', title: 'Risk Score Engine', desc: 'Weighted scoring model (Mild=1, Moderate=2, Severe=3) combined with duration and symptom-specific multipliers.' },
  { icon: <Database />, color: '#15803D', bg: '#F0FDF4', title: 'PostgreSQL History', desc: 'Every test is persisted to a secure PostgreSQL database, giving you a full audit trail of your health assessments.' },
  { icon: <Globe />, color: '#7C3AED', bg: '#F5F3FF', title: 'Multilingual', desc: 'Native support for English, Hindi (हिन्दी), and Marathi (मराठी) — language preference saved per account.' },
  { icon: <ClipboardList />, color: '#B45309', bg: '#FFFBEB', title: 'Detailed Reports', desc: 'Past test results with date, risk level, score, and symptoms. Queryable from the dashboard at any time.' },
  { icon: <HeartPulse />, color: '#C2410C', bg: '#FFF7ED', title: 'Family Profiles', desc: 'Run assessments for yourself or a family member — each report is properly attributed and stored separately.' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Sign in or create an account', desc: 'Secure authentication. Your data is private and encrypted.' },
  { step: '02', title: 'Choose language & profile', desc: 'Select English, Hindi, or Marathi. Choose yourself or a family member.' },
  { step: '03', title: 'Answer 8 symptom questions', desc: 'Optimized questions covering severity, duration, history, and progression.' },
  { step: '04', title: 'Receive your triage report', desc: 'Instant risk score with recommendations — hospital, doctor, or home care.' },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', background: 'white', fontFamily: 'var(--font)' }}>
      <PublicNav activeLink="home" />

      {/* ── Hero ── */}
      <section className="mobile-padding" style={{
        padding: '80px 48px 72px',
        background: 'linear-gradient(160deg, #FFF5F5 0%, #FFFFFF 50%, #FFF5F5 100%)',
        textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle bg blobs */}
        <div style={{ position: 'absolute', top: '-80px', left: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(185,28,28,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', right: '-60px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(185,28,28,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '780px', margin: '0 auto' }}>
          {/* Badge */}
          <div className="badge-high" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: '700',
            marginBottom: '24px', letterSpacing: '0.02em'
          }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--red)' }} />
            Enterprise-Grade Symptom Analysis
          </div>

          <h1 style={{
            fontSize: '56px', fontWeight: '900', color: 'var(--text-1)',
            letterSpacing: '-1.8px', lineHeight: '1.05', marginBottom: '22px',
          }}>
            Smart Symptom<br />
            <span style={{ color: 'var(--red)' }}>Triage</span> System
          </h1>
          <p style={{
            fontSize: '19px', color: 'var(--text-3)', lineHeight: '1.65',
            marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px',
          }}>
            Identify potential health risks instantly. Use our weighted 8-question algorithm to understand the urgency of your symptoms—available in 3 languages.
          </p>

          <div className="mobile-column" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
            <button
              id="hero-getstarted-btn"
              className="btn btn-primary"
              onClick={() => router.push('/signup')}
              style={{ padding: '14px 32px', fontSize: '15px', gap: '8px', boxShadow: '0 8px 20px -4px rgba(185, 28, 28, 0.4)' }}
            >
              Start Free Assessment <ArrowRight />
            </button>
            <button
              id="hero-signin-btn"
              className="btn btn-outline"
              onClick={() => router.push('/login')}
              style={{ padding: '14px 32px', fontSize: '15px' }}
            >
              Sign in to Dashboard
            </button>
          </div>

          {/* Trust line */}
          <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {['Decision support only', 'No personal data sold', 'Modern Tech Stack'].map((t) => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-4)', fontWeight: '600' }}>
                <CheckCircle /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Dashboard preview card */}
        <div className="anim-fadeup hide-mobile" style={{ maxWidth: '900px', margin: '64px auto 0', position: 'relative', zIndex: 1 }}>
          <div style={{
            background: 'white', borderRadius: '16px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
          }}>
            {/* Mock browser chrome */}
            <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#EF4444' }} />
              <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#F59E0B' }} />
              <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#10B981' }} />
              <div style={{ flex: 1, background: 'white', borderRadius: '6px', height: '24px', marginLeft: '12px', display: 'flex', alignItems: 'center', paddingLeft: '12px', border: '1px solid var(--border-faint)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace' }}>symptosense.io/dashboard</span>
              </div>
            </div>
            {/* Mock UI content */}
            <div style={{ display: 'flex', height: '240px' }}>
              {/* Sidebar */}
              <div style={{ width: '180px', background: 'white', borderRight: '1px solid var(--border-faint)', padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: 'var(--red-light)' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--red)' }} />
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--red)' }}>Home</span>
                </div>
                {['Reports', 'Support', 'Settings'].map((n) => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--border)' }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>{n}</span>
                  </div>
                ))}
              </div>
              {/* Main */}
              <div style={{ flex: 1, padding: '20px 24px', textAlign: 'left' }}>
                <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-1)', marginBottom: '12px' }}>Dashboard Overview</div>
                {/* Alert */}
                <div style={{ background: 'var(--red-light)', border: '1.5px solid var(--red-border)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: 'var(--red)', fontWeight: '600', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <Zap /> Strong Alert: High risk activity detected.
                </div>
                {/* Cards row */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  {[['22/30', 'Risk Score'], ['Completed', 'Triage Status']].map(([v, l]) => (
                    <div key={l} style={{ flex: 1, background: 'white', borderRadius: '10px', border: '1px solid var(--border)', padding: '12px' }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-4)', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase' }}>{l}</div>
                      <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-1)' }}>{v}</div>
                    </div>
                  ))}
                </div>
                {/* Start button */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--red)', color: 'white', padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: '800' }}>
                   Analyze Symptoms Now
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mobile-padding" id="features" style={{ padding: '80px 48px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--red)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>System Architecture</div>
            <h2 style={{ fontSize: '36px', fontWeight: '900', color: 'var(--text-1)', letterSpacing: '-1px', marginBottom: '16px' }}>
              Everything you need for smart triage
            </h2>
            <p style={{ fontSize: '17px', color: 'var(--text-3)', maxWidth: '540px', margin: '0 auto' }}>
              Robust full-stack health platform — Flask API, PostgreSQL persistence, and Next.js performance.
            </p>
          </div>

          <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="card card-lift" style={{ padding: '28px' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '12px',
                  background: f.bg, color: f.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '20px',
                }}>{f.icon}</div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '10px' }}>{f.title}</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-3)', lineHeight: '1.7' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mobile-padding" id="how-it-works" style={{ padding: '80px 48px', background: 'white' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--red)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>The Workflow</div>
            <h2 style={{ fontSize: '36px', fontWeight: '900', color: 'var(--text-1)', letterSpacing: '-1px' }}>
              Results in under 3 minutes
            </h2>
          </div>

          <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {HOW_IT_WORKS.map((s, i) => (
              <div key={i} className="card" style={{ padding: '28px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{
                  fontSize: '14px', fontWeight: '900', color: 'var(--red)',
                  background: 'var(--red-light)', border: '1.5px solid var(--red-border)',
                  width: '42px', height: '42px', borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{s.step}</div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '8px' }}>{s.title}</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-3)', lineHeight: '1.65' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="mobile-padding" style={{
        padding: '80px 48px',
        background: 'linear-gradient(135deg, #FC8181 0%, #B91C1C 50%, #7F1D1D 100%)',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: '36px', fontWeight: '900', color: 'white', letterSpacing: '-1px', marginBottom: '16px' }}>
          Ready to assess your symptoms?
        </h2>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.85)', marginBottom: '40px' }}>
          Free. Private. Accurate decision support at your fingertips.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <button
            id="cta-getstarted-btn"
            onClick={() => router.push('/signup')}
            className="btn"
            style={{
              background: 'white', color: 'var(--red)', border: 'none',
              padding: '16px 36px', borderRadius: '12px', fontSize: '16px',
              fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              transition: 'all 0.2s',
            }}
          >
            Start Free Assessment <ArrowRight />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mobile-padding mobile-column" style={{ padding: '40px 48px', background: 'var(--text-1)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="mobile-column" style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <HeartPulse />
            </div>
            <span style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>
                Sympto<span style={{ color: 'var(--red)' }}>Sense</span>
            </span>
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono, monospace' }}>
                Next.js / Flask / PostgreSQL · v1.0.4
            </div>
        </div>
        <div style={{ maxWidth: '1100px', margin: '20px auto 0', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            ⚠️ SymptoSense is a decision support tool and is not a replacement for professional medical advice, diagnosis, or treatment.
        </div>
      </footer>

    </div>
  );
}
