'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';

// ── Shared SVG icons ──
const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const EyeIcon = ({ off }: { off?: boolean }) => off
  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
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

export default function LoginPage() {
  const { login } = useApp();
  const router = useRouter();
  const [email, setEmail]       = useState('rahul.sharma@example.com');
  const [password, setPassword] = useState('demo1234');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    login();
    router.push('/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      fontFamily: 'var(--font)',
    }}>
      {/* ── Left brand panel ── matches sidebar palette ── */}
      <div className="auth-side-panel" style={{
        width: '400px', minWidth: '400px',
        background: '#111827',
        display: 'flex', flexDirection: 'column',
        padding: '48px 44px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle bg accent */}
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(185,28,28,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(185,28,28,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '48px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'var(--red)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white',
            }}>
              <HeartPulse />
            </div>
            <span style={{ fontSize: '16px', fontWeight: '800', color: 'white', letterSpacing: '-0.3px' }}>
              Sympto<span style={{ color: 'var(--red-muted)' }}>Sense</span>
            </span>
          </div>

          {/* Heading */}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'white', lineHeight: '1.25', letterSpacing: '-0.5px', marginBottom: '12px' }}>
              Smart Symptom<br />Triage System
            </h1>
            <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: '1.7', marginBottom: '36px' }}>
              AI-powered health assessment built on Flask, PostgreSQL, and Next.js.
            </p>

            {/* Feature list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                '8-question adaptive triage engine',
                'Risk scoring with weighted symptoms',
                'PostgreSQL-backed report history',
                'Multilingual: EN · हिन्दी · मराठी',
              ].map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                    background: 'rgba(185,28,28,0.25)', border: '1px solid rgba(185,28,28,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--red-muted)',
                  }}>
                    <CheckIcon />
                  </div>
                  <span style={{ fontSize: '13.5px', color: '#9CA3AF', lineHeight: '1.5' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom back link */}
          <button
            onClick={() => router.push('/')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#4B5563', fontSize: '13px', fontFamily: 'var(--font)',
              fontWeight: '500', padding: 0, marginTop: '32px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#9CA3AF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#4B5563')}
          >
            <ArrowLeft /> Back to home
          </button>
        </div>
      </div>

      {/* ── Right: sign-in form ── */}
      <div className="auth-form-container" style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px',
        background: 'var(--bg)',
      }}>
        {/* Form card — same style as dashboard cards */}
        <div className="card anim-fadeup" style={{
          width: '100%', maxWidth: '400px',
          padding: '36px 32px',
        }}>
          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: '800', color: 'var(--text-1)', letterSpacing: '-0.4px' }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', marginTop: '5px' }}>
              Sign in to your health dashboard
            </p>
          </div>

          <form onSubmit={handleLogin}>
            {/* Email field */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-2)', marginBottom: '7px' }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }}>
                  <MailIcon />
                </span>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '40px' }}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password field */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-2)' }}>
                  Password
                </label>
                <button
                  type="button"
                  style={{ fontSize: '12px', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500' }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }}>
                  <LockIcon />
                </span>
                <input
                  id="password-input"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '40px', paddingRight: '42px' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: '2px',
                  }}
                >
                  <EyeIcon off={showPass} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="alert-high" style={{ marginBottom: '16px', borderRadius: 'var(--radius)' }}>
                {error}
              </div>
            )}

            {/* Submit button — identical style to dashboard primary buttons */}
            <button
              id="login-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '12px', fontSize: '14px', marginBottom: '18px' }}
            >
              {loading
                ? <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                : 'Sign in to Dashboard'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ fontSize: '11.5px', color: 'var(--text-4)', fontWeight: '500' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>

            <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-3)' }}>
              Don&apos;t have an account?{' '}
              <button
                id="signup-link"
                type="button"
                onClick={() => router.push('/signup')}
                style={{ color: 'var(--red)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 'var(--text-sm)' }}
              >
                Create account
              </button>
            </p>
          </form>

          {/* Demo credentials — same card background as description boxes in dashboard */}
          <div style={{
            marginTop: '24px',
            padding: '12px 14px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: '12.5px',
            color: 'var(--text-3)',
          }}>
            <span style={{ fontWeight: '600', color: 'var(--text-2)' }}>Demo credentials</span><br />
            Email is pre-filled · Password: <code style={{ background: 'var(--border-faint)', padding: '1px 5px', borderRadius: '4px', fontSize: '12px' }}>demo1234</code> · Click Sign in
          </div>
        </div>
      </div>
    </div>
  );
}
