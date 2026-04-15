'use client';

import { useRouter } from 'next/navigation';
import PublicNav from './PublicNav';

const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const Shield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
  </svg>
);
const Code2 = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>
  </svg>
);
const Heart = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const Users = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const TECH_STACK = [
  { layer: 'Frontend', tech: 'Next.js 15 (App Router)', detail: 'React server & client components, Tailwind CSS v4, TypeScript', color: '#1D4ED8', bg: '#EFF6FF' },
  { layer: 'Backend API', tech: 'Next.js API Routes', detail: 'Edge-compatible route handlers: /api/question-gen, /api/sessions, /api/explanation', color: '#15803D', bg: '#F0FDF4' },
  { layer: 'Database', tech: 'Neon PostgreSQL + Prisma', detail: 'Models: User, Account, Session, TestSession — managed via Prisma ORM', color: '#7C3AED', bg: '#F5F3FF' },
  { layer: 'Auth', tech: 'NextAuth v4', detail: 'Google OAuth + email/password credentials, JWT sessions, bcrypt password hashing', color: '#B45309', bg: '#FFFBEB' },
  { layer: 'AI', tech: 'Groq (Llama 3.3 70B) + Sarvam AI', detail: 'Dynamic question generation, clinical reasoning, multilingual TTS/STT/translation', color: '#7C3AED', bg: '#F5F3FF' },
];

const VALUES = [
  { icon: <Shield />, color: '#E53E3E', bg: '#FFF5F5', title: 'Safety First', desc: 'SymptoSense is a decision-support tool. It never replaces professional medical advice. Every result page includes prominent safety disclaimers.' },
  { icon: <Heart />, color: '#E53E3E', bg: '#FFF5F5', title: 'Patient-Centered', desc: 'Designed for real people across India — supports English, Hindi, and Marathi so language is never a barrier to understanding your health.' },
  { icon: <Code2 />, color: '#1D4ED8', bg: '#EFF6FF', title: 'Open Stack', desc: 'Built on proven open-source tools — Next.js, Prisma, PostgreSQL, NextAuth. No proprietary black boxes. The scoring algorithm is fully transparent.' },
  { icon: <Users />, color: '#15803D', bg: '#F0FDF4', title: 'Family-Aware', desc: "Run assessments for yourself or any family member. Each report is attributed and stored separately in the user's PostgreSQL record." },
];

export default function AboutPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', background: 'white', fontFamily: 'Inter, sans-serif' }}>
      <PublicNav activeLink="about" />

      {/* Hero */}
      <section className="mobile-padding" style={{
        padding: '64px 48px 56px',
        background: 'linear-gradient(160deg, #FFF5F5 0%, white 60%)',
        borderBottom: '1px solid #F1F5F9',
      }}>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#FFF5F5', color: '#C53030', border: '1px solid #FEB2B2',
            padding: '4px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: '600',
            marginBottom: '18px',
          }}>About SymptoSense</div>

          <h1 style={{ fontSize: '42px', fontWeight: '900', color: '#1A202C', letterSpacing: '-1px', lineHeight: '1.15', marginBottom: '18px' }}>
            Decision support for<br />
            <span style={{ color: '#E53E3E' }}>every Indian household</span>
          </h1>
          <p style={{ fontSize: '17px', color: '#4A5568', lineHeight: '1.75', maxWidth: '620px' }}>
            SymptoSense is an AI-powered symptom triage system built to help everyday users understand the urgency of their symptoms — in their own language, on any device, at any time.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="mobile-padding" style={{ padding: '64px 48px', background: 'white' }}>
        <div className="mobile-grid-1" style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#E53E3E', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '10px' }}>Our Mission</div>
            <h2 style={{ fontSize: '30px', fontWeight: '800', color: '#1A202C', letterSpacing: '-0.6px', lineHeight: '1.25', marginBottom: '16px' }}>
              Bridging the gap between symptoms and care
            </h2>
            <p style={{ fontSize: '14px', color: '#4A5568', lineHeight: '1.8', marginBottom: '14px' }}>
              Millions of people in India delay seeking medical care because they don't know if their symptoms are serious. SymptoSense gives people the context they need to make faster, better decisions.
            </p>
            <p style={{ fontSize: '14px', color: '#4A5568', lineHeight: '1.8', marginBottom: '24px' }}>
              Our triage engine uses a weighted scoring model — accounting for symptom type, severity, duration, and personal health history — to classify risk as Low, Medium, or High and recommend appropriate action.
            </p>
            <div style={{
              background: '#FFF5F5', border: '1px solid #FEB2B2', borderLeft: '4px solid #E53E3E',
              borderRadius: '9px', padding: '14px 16px', fontSize: '13px', color: '#C53030', fontWeight: '500',
            }}>
              ⚠️ SymptoSense is a <strong>decision support tool only</strong>. It does not diagnose, prescribe, or replace a licensed medical professional. Always seek emergency care for life-threatening symptoms.
            </div>
          </div>

          {/* Stats */}
          <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {[
              { num: '8', label: 'Adaptive questions', sub: 'per assessment' },
              { num: '3', label: 'Languages', sub: 'EN · हिन्दी · मराठी' },
              { num: '< 3', label: 'Minutes', sub: 'login to result' },
              { num: '3', label: 'Risk levels', sub: 'Low · Medium · High' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '22px 18px', borderRadius: '14px',
                background: 'white', border: '1px solid #E2E8F0',
                boxShadow: '0 2px 8px rgb(0 0 0 / 0.04)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#E53E3E', letterSpacing: '-1px', lineHeight: 1 }}>{s.num}</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1A202C', marginTop: '6px' }}>{s.label}</div>
                <div style={{ fontSize: '11.5px', color: '#A0AEC0', marginTop: '2px' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mobile-padding" style={{ padding: '64px 48px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#E53E3E', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '10px' }}>Our Values</div>
            <h2 style={{ fontSize: '30px', fontWeight: '800', color: '#1A202C', letterSpacing: '-0.6px' }}>
              What we stand for
            </h2>
          </div>
          <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {VALUES.map((v, i) => (
              <div key={i} className="card" style={{ padding: '24px 26px', display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                  background: v.bg, color: v.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{v.icon}</div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1A202C', marginBottom: '7px' }}>{v.title}</h3>
                  <p style={{ fontSize: '13.5px', color: '#4A5568', lineHeight: '1.65' }}>{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section style={{ padding: '64px 48px', background: 'white' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#E53E3E', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '10px' }}>Technology</div>
            <h2 style={{ fontSize: '30px', fontWeight: '800', color: '#1A202C', letterSpacing: '-0.6px', marginBottom: '10px' }}>
              Built on proven open-source tools
            </h2>
            <p style={{ fontSize: '15px', color: '#4A5568', maxWidth: '480px', margin: '0 auto' }}>
              A full-stack production architecture — no proprietary services, no vendor lock-in.
            </p>
          </div>

          <div className="mobile-grid-1" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {TECH_STACK.map((t, i) => (
              <div key={i} className="mobile-column" style={{
                display: 'flex', alignItems: 'center', gap: '20px',
                padding: '18px 22px', borderRadius: '12px',
                border: '1px solid #E2E8F0', background: 'white',
                boxShadow: '0 1px 4px rgb(0 0 0 / 0.04)',
                transition: 'box-shadow 0.2s',
              }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '10px',
                  background: t.bg, color: t.color, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '800', fontSize: '12px',
                }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#A0AEC0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{t.layer}</div>
                  <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#1A202C' }}>{t.tech}</div>
                  <div style={{ fontSize: '12.5px', color: '#718096', marginTop: '2px' }}>{t.detail}</div>
                </div>
                <div className="hide-mobile" style={{ background: t.bg, color: t.color, padding: '4px 12px', borderRadius: '999px', fontSize: '11.5px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                  {t.layer}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '64px 48px', textAlign: 'center',
        background: 'linear-gradient(135deg, #FC8181 0%, #E53E3E 60%, #C53030 100%)',
      }}>
        <h2 style={{ fontSize: '28px', fontWeight: '800', color: 'white', letterSpacing: '-0.5px', marginBottom: '10px' }}>
          Ready to try it out?
        </h2>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)', marginBottom: '28px' }}>
          Takes less than 3 minutes. Free to use. No personal data sold.
        </p>
        <button
          className="btn"
          onClick={() => router.push('/auth/login')}
          style={{ background: 'white', color: '#E53E3E', padding: '13px 28px', fontSize: '15px', fontWeight: '700', gap: '8px', boxShadow: '0 4px 14px rgb(0 0 0 / 0.15)' }}
        >
          Start Assessment <ArrowRight />
        </button>
      </section>

      {/* Footer */}
      <footer className="mobile-padding mobile-column" style={{ padding: '24px 48px', background: '#1A202C', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>Sympto<span style={{ color: '#FC8181' }}>Sense</span> <span style={{ color: '#4A5568', fontWeight: '400' }}>· v1.0.4</span></span>
        <span style={{ fontSize: '12px', color: '#4A5568', textAlign: 'center' }}>⚠️ Decision support only — not a medical diagnosis</span>
      </footer>
    </div>
  );
}
