'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useApp } from '../context/AppContext';

const Icons = {
  Home: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  FileText: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  Settings: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v2M17 3.34l-1 1.73M22 8.93l-1.73 1M22 12h-2M21.07 16l-1.73-1M17 20.66l-1-1.73M12 22v-2M7 20.66l1-1.73M2.93 16l1.73-1M2 12h2M2.93 8l1.73 1M7 3.34l1 1.73"/>
    </svg>
  ),
  LogOut: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Activity: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  HeartPulse: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>
    </svg>
  ),
  X: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Menu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/>
    </svg>
  ),
};

function NavLink({ id, icon, label, active, onClick }: {
  id: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`nav-link${active ? ' active' : ''}`}
      style={{ width: '100%' }}
    >
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
    </button>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { language, triageScreen, cancelTest } = useApp();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';

  const isTestActive = triageScreen === 'questions' || triageScreen === 'loading';

  // Derive display name and initials from session
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'User';
  const userEmail = session?.user?.email || '';
  const userImage = session?.user?.image || null;
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleHome = () => {
    if (isTestActive) cancelTest();
    router.push('/dashboard');
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div style={{
        padding: '18px 18px 14px',
        borderBottom: '1px solid #F1F5F9',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #FC8181, #E53E3E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', flexShrink: 0,
            boxShadow: '0 2px 8px rgb(229 62 62 / 0.3)',
          }}>
            <Icons.HeartPulse />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: '14.5px', fontWeight: '800',
              color: '#1A202C', letterSpacing: '-0.3px',
              whiteSpace: 'nowrap',
            }}>
              Sympto<span style={{ color: '#E53E3E' }}>Sense</span>
            </div>
          </div>
          {isMobileMenuOpen && (
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#A0AEC0', cursor: 'pointer' }}
            >
              <Icons.X />
            </button>
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav style={{
        flex: 1,
        padding: '10px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        overflowY: 'auto',
      }}>
        <NavLink
          id="nav-home"
          icon={<Icons.Home />}
          label={langKey === 'hi' ? 'मुख्य पृष्ठ' : langKey === 'mr' ? 'मुख्यपृष्ठ' : 'Home'}
          active={pathname === '/dashboard'}
          onClick={handleHome}
        />
        <NavLink
          id="nav-reports"
          icon={<Icons.FileText />}
          label={langKey === 'hi' ? 'पिछली रिपोर्ट' : langKey === 'mr' ? 'जुने अहवाल' : 'Past Reports'}
          active={pathname === '/dashboard/reports'}
          onClick={() => { router.push('/dashboard/reports'); setIsMobileMenuOpen(false); }}
        />
        <NavLink
          id="nav-settings"
          icon={<Icons.Settings />}
          label={langKey === 'hi' ? 'सेटिंग्स' : langKey === 'mr' ? 'सेटिंग्ज' : 'Settings'}
          active={pathname === '/dashboard/settings'}
          onClick={() => { router.push('/dashboard/settings'); setIsMobileMenuOpen(false); }}
        />

        {isTestActive && (
          <div style={{ marginTop: '12px', padding: '12px 13px', borderRadius: '10px', background: '#FFF5F5', border: '1.5px solid #FEB2B2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
              <span style={{ color: '#E53E3E' }}><Icons.Activity /></span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#C53030' }}>
                {langKey === 'hi' ? 'परीक्षण प्रगति पर है' : langKey === 'mr' ? 'चाचणी प्रगतिपथावर आहे' : 'Test in Progress'}
              </span>
            </div>
            <button onClick={() => { cancelTest(); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#E53E3E', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
              <Icons.X /> {langKey === 'hi' ? 'परीक्षण रद्द करें' : langKey === 'mr' ? 'चाचणी रद्द करा' : 'Cancel test'}
            </button>
          </div>
        )}
      </nav>

      {/* User section */}
      <div style={{ padding: '10px 10px', borderTop: '1px solid #F1F5F9', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', marginBottom: '6px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          {userImage ? (
            <Image src={userImage} alt={userName} width={32} height={32} style={{ borderRadius: '50%', objectFit: 'cover' }} unoptimized />
          ) : (
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #FC8181, #E53E3E)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '11px', flexShrink: 0 }}>{initials}</div>
          )}
          </div>
        </div>
        <NavLink id="nav-mobile-logout" icon={<Icons.LogOut />} label={langKey === 'hi' ? 'लॉग आउट' : langKey === 'mr' ? 'लॉग आउट' : 'Log out'} onClick={handleLogout} />
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)', flexDirection: 'row' }}>
      
      {/* ── Desktop Sidebar (Hidden on mobile via CSS) ── */}
      <aside className="hide-mobile" style={{
        width: '232px', minWidth: '232px', height: '100vh', background: '#FFFFFF',
        borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        flexShrink: 0, overflowY: 'auto', boxShadow: 'var(--shadow-sm)', zIndex: 10,
      }}>
        <SidebarContent />
      </aside>

      {/* ── Mobile Mobile Nav overlay ── */}
      {isMobileMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }} onClick={() => setIsMobileMenuOpen(false)}>
          <div 
            style={{ width: '260px', height: '100%', background: 'white', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent />
          </div>
        </div>
      )}

      {/* ── Layout Wrapper ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0 }}>
        
        {/* ── Mobile Header (Visible only on mobile via CSS) ── */}
        <header className="show-mobile" style={{
          height: '56px', background: 'white', borderBottom: '1px solid var(--border)',
          alignItems: 'center', padding: '0 16px', flexShrink: 0,
        }}>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            style={{ background: 'none', border: 'none', color: '#1A202C', cursor: 'pointer', padding: '8px 0', marginRight: '16px' }}
          >
            <Icons.Menu />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
               <Icons.HeartPulse />
             </div>
             <span style={{ fontSize: '14px', fontWeight: '800', color: '#1A202C' }}>Sympto<span style={{ color: 'var(--red)' }}>Sense</span></span>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            {userImage ? (
              <Image src={userImage} alt={userName} width={30} height={30} style={{ borderRadius: '50%', objectFit: 'cover' }} unoptimized />
            ) : (
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '11px' }}>{initials}</div>
            )}
          </div>
        </header>

        {/* ── Main content area ── */}
        <main className="mobile-main" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: 'var(--bg)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
