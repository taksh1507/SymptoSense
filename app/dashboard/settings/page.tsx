'use client';

import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import AppShell from '@/app/components/AppShell';
import { useApp } from '@/app/context/AppContext';

interface Strings {
  title: string; sub: string; profile: string; fullName: string; email: string; authProvider: string;
  notifications: string; notifSub: string; phoneLabel: string; phoneNote: string; phonePlaceholder: string;
  phoneInvalid: string; phoneEmpty: string; phoneSaved: string; phoneSaving: string; savePhone: string; saved: string;
  about: string; appVersion: string; database: string; framework: string; account: string; signOut: string;
}

const STRINGS: Record<'en' | 'hi' | 'mr', Strings> = {
  en: {
    title: 'Settings',
    sub: 'Manage your account and preferences',
    profile: 'Profile',
    fullName: 'Full Name',
    email: 'Email',
    authProvider: 'Auth Provider',
    notifications: 'Notifications & Follow-ups',
    notifSub: 'Where should follow-up reminders reach you?',
    phoneLabel: 'Phone number (WhatsApp)',
    phoneNote: 'Used for follow-up reminders once WhatsApp is enabled. Email reminders use your email above and are free.',
    phonePlaceholder: '+91 98765 43210',
    phoneInvalid: 'Enter a valid phone number (8–15 digits).',
    phoneEmpty: 'Enter a phone number.',
    phoneSaved: 'Phone number saved.',
    phoneSaving: 'Saving…',
    savePhone: 'Save phone',
    saved: 'Saved',
    about: 'About',
    appVersion: 'App Version',
    database: 'Database',
    framework: 'Framework',
    account: 'Account',
    signOut: 'Sign Out',
  },
  hi: {
    title: 'सेटिंग्स',
    sub: 'अपने खाते और प्राथमिकताएं प्रबंधित करें',
    profile: 'प्रोफ़ाइल',
    fullName: 'पूरा नाम',
    email: 'ईमेल',
    authProvider: 'प्रमाणीकरण प्रदाता',
    notifications: 'सूचनाएं और फॉलो-अप',
    notifSub: 'फॉलो-अप रिमाइंडर आप तक कहां पहुंचाए जाएं?',
    phoneLabel: 'फोन नंबर (व्हाट्सएप)',
    phoneNote: 'व्हाट्सएप सक्षम होने पर केवल फॉलो-अप रिमाइंडर के लिए उपयोग होगा। ईमेल रिमाइंडर ऊपर दिए गए ईमेल पर मुफ्त हैं।',
    phonePlaceholder: '+91 98765 43210',
    phoneInvalid: 'मान्य फोन नंबर दर्ज करें (8–15 अंक)।',
    phoneEmpty: 'फोन नंबर दर्ज करें।',
    phoneSaved: 'फोन नंबर सहेजा गया।',
    phoneSaving: 'सहेजा जा रहा है…',
    savePhone: 'फोन सहेजें',
    saved: 'सहेजा गया',
    about: 'परिचय',
    appVersion: 'ऐप संस्करण',
    database: 'डेटाबेस',
    framework: 'फ्रेमवर्क',
    account: 'खाता',
    signOut: 'लॉग आउट',
  },
  mr: {
    title: 'सेटिंग्ज',
    sub: 'तुमचे खाते आणि प्राधान्ये व्यवस्थापित करा',
    profile: 'प्रोफाइल',
    fullName: 'पूर्ण नाव',
    email: 'ईमेल',
    authProvider: 'प्रमाणीकरण प्रदाता',
    notifications: 'सूचना आणि फॉलो-अप',
    notifSub: 'फॉलो-अप रिमाइंडर तुमच्यापर्यंत कुठे पोहोचवायचे?',
    phoneLabel: 'फोन नंबर (व्हाट्सअॅप)',
    phoneNote: 'व्हाट्सअॅप सक्षम झाल्यावर फक्त फॉलो-अप रिमाइंडरसाठी वापरला जाईल. ईमेल रिमाइंडर वर दिलेल्या ईमेलवर मोफत आहेत.',
    phonePlaceholder: '+91 98765 43210',
    phoneInvalid: 'वैध फोन नंबर प्रविष्ट करा (8–15 अंक).',
    phoneEmpty: 'फोन नंबर प्रविष्ट करा.',
    phoneSaved: 'फोन नंबर जतन झाला.',
    phoneSaving: 'जतन होत आहे…',
    savePhone: 'फोन जतन करा',
    saved: 'जतन झाले',
    about: 'माहिती',
    appVersion: 'अॅप आवृत्ती',
    database: 'डेटाबेस',
    framework: 'फ्रेमवर्क',
    account: 'खाते',
    signOut: 'लॉग आउट',
  },
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const { language } = useApp();
  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';
  const t = STRINGS[langKey];

  const userName = session?.user?.name || 'User';
  const userEmail = session?.user?.email || '';
  const userImage = session?.user?.image || null;
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/profile')
      .then(async (r) => (r.ok ? ((await r.json()) as { phone?: string }) : {}))
      .then((p) => {
        if (p && typeof p.phone === 'string') setPhone(p.phone);
      })
      .catch(() => {});
  }, []);

  const savePhone = async () => {
    const digits = phone.replace(/[\s().-]/g, '');
    if (!digits) {
      setError(t.phoneEmpty);
      return;
    }
    if (!/^\+?[0-9]{8,15}$/.test(digits)) {
      setError(t.phoneInvalid);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || t.phoneInvalid);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError(t.phoneInvalid);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="mobile-padding" style={{ padding: '28px 32px', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-1)', letterSpacing: '-0.5px' }}>{t.title}</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-3)', marginTop: '4px' }}>{t.sub}</p>
          </div>

          {/* Profile Card */}
          <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '20px' }}>{t.profile}</h2>
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
                <span style={{ fontSize: '14px', color: 'var(--text-2)', fontWeight: '600' }}>{t.fullName}</span>
                <span style={{ fontSize: '14px', color: 'var(--text-3)' }}>{userName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-2)', fontWeight: '600' }}>{t.email}</span>
                <span style={{ fontSize: '14px', color: 'var(--text-3)' }}>{userEmail}</span>
              </div>
            </div>
          </div>

          {/* Notifications Card */}
          <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{t.notifications}</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 18px 0' }}>{t.notifSub}</p>
            <label htmlFor="phone" style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-2)', marginBottom: '8px' }}>
              {t.phoneLabel}
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <input
                id="phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder={t.phonePlaceholder}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                style={{ maxWidth: '300px' }}
              />
              <button className="btn btn-primary" onClick={savePhone} disabled={saving} style={{ fontSize: '13px', padding: '10px 18px' }}>
                {saving ? t.phoneSaving : saved ? `✓ ${t.saved}` : t.savePhone}
              </button>
            </div>
            {error && <p style={{ fontSize: '12.5px', color: 'var(--red)', margin: '10px 0 0 0' }}>{error}</p>}
            <p style={{ fontSize: '11.5px', color: 'var(--text-4)', margin: '12px 0 0 0', lineHeight: '1.5' }}>{t.phoneNote}</p>
          </div>

          {/* About Card */}
          <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '20px' }}>{t.about}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: t.appVersion, value: 'v1.1.0' },
                { label: t.database, value: 'Neon PostgreSQL' },
                { label: t.framework, value: 'Next.js 15' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-faint)' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-2)', fontWeight: '600' }}>{item.label}</span>
                  <span style={{ fontSize: '14px', color: 'var(--text-3)' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Account Card */}
          <div className="card" style={{ padding: '24px', border: '1px solid var(--red-border)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>{t.account}</h2>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="btn"
              style={{ background: 'var(--red)', color: 'white', padding: '10px 20px', fontSize: '14px', fontWeight: '600', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {t.signOut}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}