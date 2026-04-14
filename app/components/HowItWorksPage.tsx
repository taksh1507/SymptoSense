'use client';

import { useRouter } from 'next/navigation';
import PublicNav from './PublicNav';

const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const LogIn = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
    <polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
  </svg>
);
const Globe = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const ClipboardList = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <line x1="12" y1="11" x2="16" y2="11"/><line x1="12" y1="16" x2="16" y2="16"/>
    <line x1="8" y1="11" x2="8.01" y2="11"/><line x1="8" y1="16" x2="8.01" y2="16"/>
  </svg>
);
const BarChart = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
const User = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const STEPS = [
  {
    num: '01', icon: <LogIn />, color: '#E53E3E', bg: '#FFF5F5', border: '#FEB2B2',
    title: 'Create an account or sign in',
    desc: 'Your account secures access to your personal dashboard and report history. Passwords are hashed with bcrypt; authentication is handled by Flask with JWT tokens.',
    detail: [
      'Email + password login (bcrypt hashed)',
      'JWT session token stored securely',
      'POST /api/auth/login → Flask backend',
    ],
    code: 'POST /api/auth/login\n{"email": "user@example.com", "password": "••••"}\n→ 200 OK | {"token": "eyJ..."}',
  },
  {
    num: '02', icon: <Globe />, color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE',
    title: 'Choose your language & profile',
    desc: 'Pick English, Hindi (हिन्दी), or Marathi (मराठी). Then select whether you are running the test for yourself or for a family member. These preferences are saved to the user_preferences PostgreSQL table.',
    detail: [
      'Language selection persisted to DB',
      'Profile: Self or Family Member',
      'PATCH /api/user/preferences',
    ],
    code: 'PATCH /api/user/preferences\n{"language": "Hindi", "testFor": "self"}\n→ Saved to user_preferences table',
  },
  {
    num: '03', icon: <ClipboardList />, color: '#B45309', bg: '#FFFBEB', border: '#FDE68A',
    title: 'Answer 8 adaptive symptom questions',
    desc: 'The question engine covers primary symptoms, severity, duration, breathing difficulty, medical history, body temperature, exposure, and free-text notes. MCQ and multi-select questions are weighted differently in the scoring model.',
    detail: [
      '8 questions: MCQ, multi-select, free text',
      'Covers: symptoms, severity, duration, history',
      'Each answer carries a point weight',
    ],
    code: '// Symptom weight mapping\n{"fever": 2, "chestPain": 5,\n "headache": 2, "cough": 1}\n\n// Severity multiplier\n{"mild": 1, "moderate": 2, "severe": 3}',
  },
  {
    num: '04', icon: <BarChart />, color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0',
    title: 'AI engine calculates your risk score',
    desc: 'Your answers are sent to the Flask backend where the triage engine applies the risk-scoring formula. The final score (0–30) determines your risk level: Low (0–9), Medium (10–19), High (20–30).',
    detail: [
      'Formula: Severity × Duration × Weight',
      'Special rules for chestPain + duration > 1 day',
      'Score normalized to 0–30 scale',
    ],
    code: '// Risk engine pseudocode\nrisk = sum(severity × duration × weight)\nif (chestPain && days > 1): risk += 5\nlevel = risk >= 20 ? "HIGH"\n      : risk >= 10 ? "MEDIUM" : "LOW"',
  },
  {
    num: '05', icon: <User />, color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE',
    title: 'Receive your report & recommendations',
    desc: 'Your triage result is displayed with a risk gauge, recommended action (Emergency care / Doctor visit / Home rest), and a detailed breakdown of all your answers. Every test is saved to the PostgreSQL user_reports table.',
    detail: [
      'Risk gauge: Low 🟢 / Medium 🟡 / High 🔴',
      'Recommendation: Hospital / Doctor / Home',
      'Report saved: INSERT INTO user_reports ...',
    ],
    code: 'INSERT INTO user_reports\n(user_id, score, risk_level, symptoms, created_at)\nVALUES (:uid, :score, :level, :syms, NOW())',
  },
];

const FAQ = [
  { q: 'Is SymptoSense a replacement for a doctor?', a: 'No. SymptoSense is a decision-support tool only. It helps you understand the urgency of your symptoms and suggests whether to seek emergency care, see a doctor, or manage at home. Always consult a qualified medical professional for any health concerns.' },
  { q: 'How is my data stored?', a: 'Your test results are stored in a PostgreSQL database keyed to your user account. No data is sold or shared with third parties. The system is designed for demo use with mock data only in this build.' },
  { q: 'Which symptoms does it detect?', a: 'The triage covers: fever, chest pain, headache, cough, fatigue, nausea, shortness of breath, pre-existing conditions (diabetes, hypertension, asthma, heart disease), recent travel, and known illness exposure.' },
  { q: 'What does a "High Risk" result mean?', a: 'A High Risk result (score 20–30) indicates potentially serious symptoms that should be evaluated by a medical professional immediately. The system will recommend seeking emergency care or visiting a hospital urgently.' },
];

export default function HowItWorksPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', background: 'white', fontFamily: 'Inter, sans-serif' }}>
      <PublicNav activeLink="how-it-works" />

      {/* Hero */}
      <section style={{
        padding: '64px 48px 56px',
        background: 'linear-gradient(160deg, #FFF5F5 0%, white 60%)',
        borderBottom: '1px solid #F1F5F9',
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#FFF5F5', color: '#C53030', border: '1px solid #FEB2B2',
            padding: '4px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', marginBottom: '18px',
          }}>How It Works</div>
          <h1 style={{ fontSize: '42px', fontWeight: '900', color: '#1A202C', letterSpacing: '-1px', lineHeight: '1.15', marginBottom: '16px' }}>
            From login to<br />
            <span style={{ color: '#E53E3E' }}>results in 5 steps</span>
          </h1>
          <p style={{ fontSize: '17px', color: '#4A5568', lineHeight: '1.7' }}>
            SymptoSense guides you through a simple, structured workflow. Here's exactly what happens at each stage — including the underlying Flask API calls and PostgreSQL queries.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="mobile-padding" style={{ padding: '72px 48px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {STEPS.map((step, i) => (
            <div key={i} className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div className="mobile-column" style={{ display: 'flex', alignItems: 'stretch', minHeight: '200px' }}>
                {/* Step number col */}
                <div style={{
                  width: '68px', background: step.bg,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'flex-start', padding: '24px 0 0',
                  borderRight: `1px solid ${step.border}`, flexShrink: 0,
                }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'white', border: `1.5px solid ${step.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: '800', color: step.color,
                  }}>{step.num}</div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: '2px', flex: 1, background: step.border, marginTop: '10px', opacity: 0.5 }} />
                  )}
                </div>

                {/* Content col */}
                <div className="mobile-column" style={{ flex: 1, padding: '24px 28px', display: 'flex', gap: '24px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ color: step.color }}>{step.icon}</div>
                      <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#1A202C' }}>{step.title}</h2>
                    </div>
                    <p style={{ fontSize: '13.5px', color: '#4A5568', lineHeight: '1.7', marginBottom: '14px' }}>{step.desc}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {step.detail.map((d, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#718096' }}>
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: step.color, flexShrink: 0 }} />
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Code block */}
                  <div className="hide-mobile" style={{ width: '260px', flexShrink: 0 }}>
                    <div className="code-block" style={{ height: '100%', fontSize: '10.5px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {step.code}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Scoring formula deep-dive */}
      <section className="mobile-padding" style={{ padding: '72px 48px', background: 'white' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#E53E3E', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '10px' }}>Risk Scoring</div>
            <h2 style={{ fontSize: '30px', fontWeight: '800', color: '#1A202C', letterSpacing: '-0.6px', marginBottom: '10px' }}>
              How the triage score is calculated
            </h2>
            <p style={{ fontSize: '15px', color: '#4A5568' }}>The algorithm is transparent and deterministic — no black box.</p>
          </div>

          <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Weights table */}
            <div className="card" style={{ padding: '22px 24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1A202C', marginBottom: '14px' }}>Symptom Weights</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    {['Symptom', 'Weight'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: '11px', fontWeight: '700', color: '#A0AEC0', textTransform: 'uppercase', borderBottom: '1px solid #F1F5F9' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[['Chest Pain', '×5 ⚠️'], ['Fever', '×2'], ['Headache', '×2'], ['Breathing Difficulty', '×4'], ['Fatigue / Nausea', '×1'], ['Pre-existing Condition', '+2'], ['Known Exposure', '+3']].map(([s, w], i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F8FAFC' }}>
                      <td style={{ padding: '9px 10px', color: '#4A5568' }}>{s}</td>
                      <td style={{ padding: '9px 10px', fontWeight: '700', color: w.includes('×5') ? '#E53E3E' : '#1A202C' }}>{w}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Risk levels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="card" style={{ padding: '20px 22px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1A202C', marginBottom: '14px' }}>Risk Level Thresholds</h3>
                {[
                  { range: '0 – 9', level: 'Low', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', action: 'Home care & rest' },
                  { range: '10 – 19', level: 'Medium', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', action: 'See a doctor within 24h' },
                  { range: '20 – 30', level: 'High', color: '#C53030', bg: '#FFF5F5', border: '#FEB2B2', action: 'Emergency care immediately' },
                ].map((r) => (
                  <div key={r.level} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 12px', borderRadius: '8px', background: r.bg, border: `1px solid ${r.border}`, marginBottom: '8px' }}>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: r.color, minWidth: '48px' }}>{r.range}</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: r.color }}>{r.level} Risk</div>
                      <div style={{ fontSize: '12px', color: '#718096' }}>{r.action}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="code-block" style={{ fontSize: '10.5px' }}>
                <span style={{ color: '#64748B', fontStyle: 'italic' }}>// Formula</span>{'\n'}
                <span style={{ color: '#7DD3FC' }}>risk</span> = Σ(severity × duration × weight){'\n'}
                <span style={{ color: '#7DD3FC' }}>if</span> (chestPain && days &gt; 1) risk += 5{'\n'}
                <span style={{ color: '#7DD3FC' }}>level</span> = risk≥20 ? HIGH : risk≥10 ? MED : LOW
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '72px 48px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#E53E3E', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '10px' }}>FAQ</div>
            <h2 style={{ fontSize: '30px', fontWeight: '800', color: '#1A202C', letterSpacing: '-0.6px' }}>Common questions</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {FAQ.map((item, i) => (
              <div key={i} className="card" style={{ padding: '20px 24px' }}>
                <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: '#1A202C', marginBottom: '8px' }}>Q: {item.q}</h3>
                <p style={{ fontSize: '13.5px', color: '#4A5568', lineHeight: '1.7' }}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '64px 48px', textAlign: 'center', background: 'linear-gradient(135deg, #FC8181 0%, #E53E3E 60%, #C53030 100%)' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '800', color: 'white', letterSpacing: '-0.5px', marginBottom: '10px' }}>
          Ready to start your assessment?
        </h2>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)', marginBottom: '28px' }}>
          5 steps. Under 3 minutes. Instant results.
        </p>
        <button
          className="btn"
          onClick={() => router.push('/login')}
          style={{ background: 'white', color: '#E53E3E', padding: '13px 28px', fontSize: '15px', fontWeight: '700', gap: '8px', boxShadow: '0 4px 14px rgb(0 0 0 / 0.15)' }}
        >
          Get Started <ArrowRight />
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
