'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';

// ── Shared SVG icons ──
const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const HeartPulse = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const ArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);

export default function SignupPage() {
  const { login } = useApp();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { name, email, password, confirmPassword } = formData;
    
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    // Mimic API call
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    
    login(); // Auto-login on signup for demo
    router.push('/dashboard');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', fontFamily: 'var(--font)' }}>
      {/* ── Left side promo panel ── */}
      <div className="auth-side-panel" style={{
        width: '400px', minWidth: '400px', background: '#111827',
        display: 'flex', flexDirection: 'column', padding: '48px 44px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(185,28,28,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(185,28,28,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Logo */}
          <button 
            onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '48px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <HeartPulse />
            </div>
            <span style={{ fontSize: '16px', fontWeight: '800', color: 'white', letterSpacing: '-0.3px' }}>
              Sympto<span style={{ color: 'var(--red-muted)' }}>Sense</span>
            </span>
          </button>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'white', lineHeight: '1.25', letterSpacing: '-0.5px', marginBottom: '16px' }}>
              Join the future of<br />smart healthcare
            </h1>
            <p style={{ fontSize: '14.5px', color: '#9CA3AF', lineHeight: '1.7', marginBottom: '40px' }}>
              Create an account to track your health history, securely stored in our PostgreSQL database.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {[
                { title: 'Personalized Triage', desc: 'Get accurate risk scores based on your health profile.' },
                { title: 'Family Accounts', desc: 'Manage symptoms for everyone in your household.' },
                { title: 'Secure Data', desc: 'Your medical insights are protected with JWT auth.' }
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px' }}>
                   <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(185,28,28,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red-muted)', flexShrink: 0 }}>
                    <CheckIcon />
                   </div>
                   <div>
                      <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'white', marginBottom: '2px' }}>{f.title}</div>
                      <div style={{ fontSize: '12.5px', color: '#6B7280', lineHeight: '1.5' }}>{f.desc}</div>
                   </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => router.push('/')}
            className="btn-ghost-red"
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px', borderRadius: '8px', fontSize: '13px',
              fontWeight: '600', alignSelf: 'flex-start', border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: '#9CA3AF'
            }}
          >
            <ArrowLeft /> Back to home
          </button>
        </div>
      </div>

      {/* ── Right side form ── */}
      <div className="auth-form-container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
        <div className="card anim-fadeup" style={{ width: '100%', maxWidth: '440px', padding: '40px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-1)', letterSpacing: '-0.5px' }}>Create account</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-3)', marginTop: '6px' }}>Get started with SymptoSense today</p>
          </div>

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-2)', marginBottom: '8px' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }}><UserIcon /></span>
                <input name="name" type="text" value={formData.name} onChange={handleChange} className="input" style={{ paddingLeft: '42px' }} placeholder="Rahul Sharma" />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-2)', marginBottom: '8px' }}>Email address</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }}><MailIcon /></span>
                <input name="email" type="email" value={formData.email} onChange={handleChange} className="input" style={{ paddingLeft: '42px' }} placeholder="name@company.com" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-2)', marginBottom: '8px' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }}><LockIcon /></span>
                  <input name="password" type="password" value={formData.password} onChange={handleChange} className="input" style={{ paddingLeft: '42px' }} placeholder="••••••" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-2)', marginBottom: '8px' }}>Confirm</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }}><LockIcon /></span>
                  <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} className="input" style={{ paddingLeft: '42px' }} placeholder="••••••" />
                </div>
              </div>
            </div>

            {error && <div className="alert-high" style={{ padding: '10px 14px', borderRadius: '8px' }}>{error}</div>}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '14px', marginTop: '10px' }}>
              {loading ? <div className="spinner" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : 'Create your account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-3)', marginTop: '24px' }}>
            Already have an account?{' '}
            <button 
              onClick={() => router.push('/login')}
              style={{ background: 'none', border: 'none', color: 'var(--red)', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
