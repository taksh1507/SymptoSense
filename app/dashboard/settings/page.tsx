'use client';

import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import AppShell from '@/app/components/AppShell';

export default function SettingsPage() {
  const { data: session } = useSession();

  const userName = session?.user?.name || 'User';
  const userEmail = session?.user?.email || '';
  const userImage = session?.user?.image || null;
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <AppShell>
      <div className="mobile-padding" style={{ padding: '28px 32px', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-1)', letterSpacing: '-0.5px' }}>Settings</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', marginTop: '4px' }}>Manage your account and preferences</p>
        </div>

        {/* Profile Card */}
        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '20px' }}>Profile</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            {userImage ? (
              <Image src={userImage} alt={userName} width={56} height={56} style={{ borderRadius: '50%', objectFit: 'cover' }} unoptimized />
            ) : (
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '18px' }}>{initials}</div>
            )}
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-1)' }}>{userName}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>{userEmail}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-faint)' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-2)', fontWeight: '600' }}>Full Name</span>
              <span style={{ fontSize: '14px', color: 'var(--text-3)' }}>{userName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-faint)' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-2)', fontWeight: '600' }}>Email</span>
              <span style={{ fontSize: '14px', color: 'var(--text-3)' }}>{userEmail}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-2)', fontWeight: '600' }}>Auth Provider</span>
              <span style={{ fontSize: '14px', color: 'var(--text-3)' }}>{userImage ? 'Google' : 'Email/Password'}</span>
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '20px' }}>About</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'App Version', value: 'v1.0.0' },
              { label: 'Database', value: 'Neon PostgreSQL' },
              { label: 'Framework', value: 'Next.js 15' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-faint)' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-2)', fontWeight: '600' }}>{item.label}</span>
                <span style={{ fontSize: '14px', color: 'var(--text-3)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card" style={{ padding: '24px', border: '1px solid var(--red-border)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Account</h2>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="btn"
            style={{ background: 'var(--red)', color: 'white', padding: '10px 20px', fontSize: '14px', fontWeight: '600', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </AppShell>
  );
}
