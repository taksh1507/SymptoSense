'use client';
import React, { useState } from 'react';
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
const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/>
  </svg>
);
const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function PublicNav({ activeLink }: PublicNavProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const NAV_LINKS = [
    { key: 'home',         label: 'Home',         href: '/' },
    { key: 'how-it-works', label: 'How it works', href: '/how-it-works' },
    { key: 'about',        label: 'About',        href: '/about' },
  ];

  return (
    <>
      <nav 
        className="mobile-padding"
        style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-faint)',
          padding: '0 48px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '62px',
          fontFamily: 'var(--font)',
        }}
      >
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

        {/* Desktop Nav links */}
        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
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
              >
                {link.label}
              </button>
            );
          })}
        </div>

        {/* Desktop CTA buttons */}
        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn btn-outline" onClick={() => router.push('/login')} style={{ padding: '8px 17px' }}>Sign in</button>
          <button className="btn btn-primary" onClick={() => router.push('/signup')} style={{ padding: '8px 17px' }}>Get started</button>
        </div>

        {/* Mobile Burger Toggle */}
        <button 
          className="show-mobile"
          onClick={() => setIsOpen(true)}
          style={{ background: 'none', border: 'none', color: 'var(--text-1)', cursor: 'pointer', padding: '8px' }}
        >
          <MenuIcon />
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="anim-fadein" style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)' }} onClick={() => setIsOpen(false)}>
           <div className="anim-modalin" style={{ width: '280px', height: '100%', background: 'white', marginLeft: 'auto', display: 'flex', flexDirection: 'column', padding: '24px' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                <span style={{ fontWeight: '800', color: 'var(--text-1)' }}>Menu</span>
                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-4)' }}><XIcon /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {NAV_LINKS.map(link => (
                  <button 
                    key={link.key} 
                    onClick={() => { router.push(link.href); setIsOpen(false); }}
                    style={{ textAlign: 'left', padding: '12px 16px', borderRadius: '10px', background: activeLink === link.key ? 'var(--red-light)' : 'none', border: 'none', color: activeLink === link.key ? 'var(--red)' : 'var(--text-2)', fontWeight: '600', fontSize: '15px' }}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-faint)', paddingTop: '24px' }}>
                <button className="btn btn-primary" onClick={() => router.push('/signup')}>Get Started Free</button>
                <button className="btn btn-outline" onClick={() => router.push('/login')}>Sign In</button>
              </div>
           </div>
        </div>
      )}
    </>
  );
}
