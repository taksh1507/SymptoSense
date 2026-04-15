'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const HeartPulse = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);

    const registerRes = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const registerData = await registerRes.json();

    if (!registerRes.ok) {
      setError(registerData.error || 'Failed to create account');
      setLoading(false);
      return;
    }

    const result = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError('Account created! Please sign in.');
      router.push('/auth/login');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', fontFamily: 'var(--font)' }}>
      {/* Left panel */}
      <div className="auth-side-panel" style={{
        width: '400px', minWidth: '400px', background: '#111827',
        display: 'flex', flexDirection: 'column', padding: '48px 44px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(185,28,28,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(185,28,28,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '48px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
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
                { title: 'Secure Data', desc: 'Your medical insights are protected with JWT auth.' },
              ].map((f) => (
                <div key={f.title} style={{ display: 'flex', gap: '14px' }}>
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

          <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', alignSelf: 'flex-start', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#9CA3AF', cursor: 'pointer', fontFamily: 'inherit' }}>
            <ArrowLeft /> Back to home
          </button>
        </div>
      </div>

      {/* Right form */}
      <div className="auth-form-container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
        <div className="card anim-fadeup" style={{ width: '100%', maxWidth: '440px', padding: '40px' }}>
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-1)', letterSpacing: '-0.5px' }}>Create account</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-3)', marginTop: '6px' }}>Get started with SymptoSense today</p>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '13px', marginBottom: '20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#1a1a1a', fontFamily: 'inherit' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign up with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>or sign up with email</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-2)', marginBottom: '8px' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }}><UserIcon /></span>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" style={{ paddingLeft: '42px' }} placeholder="Rahul Sharma" />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-2)', marginBottom: '8px' }}>Email address</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }}><MailIcon /></span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" style={{ paddingLeft: '42px' }} placeholder="name@example.com" required />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-2)', marginBottom: '8px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }}><LockIcon /></span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" style={{ paddingLeft: '42px' }} placeholder="Min. 8 characters" required minLength={8} />
              </div>
            </div>

            {error && <div className="alert-high" style={{ padding: '10px 14px', borderRadius: '8px' }}>{error}</div>}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '14px', marginTop: '4px' }}>
              {loading ? <div className="spinner" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : 'Create your account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-3)', marginTop: '24px' }}>
            Already have an account?{' '}
            <button onClick={() => router.push('/auth/login')} style={{ background: 'none', border: 'none', color: 'var(--red)', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px' }}>
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
