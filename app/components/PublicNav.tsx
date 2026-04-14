'use client';

import { useRouter } from 'next/navigation';

interface PublicNavProps {
  activeLink?: 'home' | 'how-it-works' | 'about';
}

const HeartPulse = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>
  </svg>
);
const ArrowRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

export default function PublicNav({ activeLink }: PublicNavProps) {
  const router = useRouter();

  const NAV_LINKS = [
    { key: 'home',         label: 'Home',         href: '/' },
    { key: 'how-it-works', label: 'How it works', href: '/how-it-works' },
    { key: 'about',        label: 'About',        href: '/about' },
  ];

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-faint)',
      padding: '0 48px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: '62px',
      fontFamily: 'var(--font)',
    }}>
      {/* Logo */}
      <button
        onClick={() => router.push('/')}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', padding: 0 }}
      >
        <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <HeartPulse />
        </div>
        <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-1)', letterSpacing: '-0.3px' }}>
          Sympto<span style={{ color: 'var(--red)' }}>Sense</span>
        </span>
      </button>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {NAV_LINKS.map((link) => {
          const isActive = activeLink === link.key;
          return (
            <button
              key={link.key}
              onClick={() => router.push(link.href)}
              style={{
                background: isActive ? 'var(--red-light)' : 'none',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                padding: '8px 14px', borderRadius: '8px',
                fontSize: '14px', fontWeight: isActive ? '600' : '500',
                color: isActive ? 'var(--red)' : 'var(--text-3)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-light)'; } }}
              onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'none'; } }}
            >
              {link.label}
            </button>
          );
        })}
      </div>

      {/* CTA buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button className="btn btn-outline" onClick={() => router.push('/login')} style={{ padding: '8px 17px' }}>Sign in</button>
        <button className="btn btn-primary" onClick={() => router.push('/signup')} style={{ padding: '8px 17px', gap: '6px' }}>Get started <ArrowRight /></button>
      </div>
    </nav>
  );
}
