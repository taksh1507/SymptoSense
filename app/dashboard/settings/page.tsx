'use client';

import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Button, Field, Notice, Section } from '@/components/ui/primitives';
import AppShell from '@/app/components/AppShell';
import { useApp, type Language } from '@/app/context/AppContext';
import { Shield, Bell, User, Globe, LogOut } from 'lucide-react';

interface Strings {
  title: string;
  sub: string;
  profile: string;
  fullName: string;
  email: string;
  notifications: string;
  notifSub: string;
  phoneLabel: string;
  phoneNote: string;
  phonePlaceholder: string;
  phoneInvalid: string;
  phoneSaved: string;
  phoneSaving: string;
  savePhone: string;
  saved: string;
  language: string;
  privacy: string;
  about: string;
  appVersion: string;
  account: string;
  signOut: string;
}

const STRINGS: Record<'en' | 'hi' | 'mr', Strings> = {
  en: {
    title: 'Settings',
    sub: 'Manage your profile, language, notification preferences, and privacy.',
    profile: 'Profile',
    fullName: 'Full Name',
    email: 'Email',
    notifications: 'Notifications & Follow-ups',
    notifSub: 'Where should follow-up reminders reach you?',
    phoneLabel: 'Phone number (WhatsApp)',
    phoneNote: 'Used for follow-up reminders once WhatsApp is enabled. Email reminders use your email above and are free.',
    phonePlaceholder: '+91 98765 43210',
    phoneInvalid: 'Enter a valid phone number with country code (e.g., +91 98765 43210).',
    phoneSaved: 'Preferences saved successfully.',
    phoneSaving: 'Saving…',
    savePhone: 'Save preferences',
    saved: 'Saved',
    language: 'Language & Accessibility',
    privacy: 'Privacy & Data Protection',
    about: 'System Information',
    appVersion: 'App Version',
    account: 'Account Actions',
    signOut: 'Sign Out',
  },
  hi: {
    title: 'सेटिंग्स',
    sub: 'अपनी प्रोफ़ाइल, भाषा, सूचना प्राथमिकताएँ और गोपनीयता प्रबंधित करें।',
    profile: 'प्रोफ़ाइल',
    fullName: 'पूरा नाम',
    email: 'ईमेल',
    notifications: 'सूचनाएं और फॉलो-अप',
    notifSub: 'फॉलो-अप रिमाइंडर आप तक कहां पहुंचाए जाएं?',
    phoneLabel: 'फोन नंबर (व्हाट्सएप)',
    phoneNote: 'व्हाट्सएप सक्षम होने पर केवल फॉलो-अप रिमाइंडर के लिए उपयोग होगा। ईमेल रिमाइंडर ऊपर दिए गए ईमेल पर मुफ्त हैं।',
    phonePlaceholder: '+91 98765 43210',
    phoneInvalid: 'देश कोड के साथ मान्य फोन नंबर दर्ज करें (जैसे +91 98765 43210)।',
    phoneSaved: 'प्राथमिकताएं सफलतापूर्वक सहेजी गईं।',
    phoneSaving: 'सहेजा जा रहा है…',
    savePhone: 'प्राथमिकताएं सहेजें',
    saved: 'सहेजा गया',
    language: 'भाषा और सुगमता',
    privacy: 'गोपनीयता और डेटा सुरक्षा',
    about: 'प्रणाली की जानकारी',
    appVersion: 'ऐप संस्करण',
    account: 'खाता क्रियाएं',
    signOut: 'लॉग आउट',
  },
  mr: {
    title: 'सेटिंग्ज',
    sub: 'तुमचे प्रोफाइल, भाषा, सूचना प्राधान्ये आणि गोपनीयता व्यवस्थापित करा.',
    profile: 'प्रोफाइल',
    fullName: 'पूर्ण नाव',
    email: 'ईमेल',
    notifications: 'सूचना आणि फॉलो-अप',
    notifSub: 'फॉलो-अप रिमाइंडर तुमच्यापर्यंत कुठे पोहोचवायचे?',
    phoneLabel: 'फोन नंबर (व्हाट्सअॅप)',
    phoneNote: 'व्हाट्सअॅप सक्षम झाल्यावर फक्त फॉलो-अप रिमाइंडरसाठी वापरला जाईल. ईमेल रिमाइंडर वर दिलेल्या ईमेलवर मोफत आहेत.',
    phonePlaceholder: '+91 98765 43210',
    phoneInvalid: 'देश कोडसह वैध फोन नंबर प्रविष्ट करा (उदा. +91 98765 43210).',
    phoneSaved: 'प्राधान्ये यशस्वीरीत्या जतन झाली.',
    phoneSaving: 'जतन होत आहे…',
    savePhone: 'प्राधान्ये जतन करा',
    saved: 'जतन झाले',
    language: 'भाषा आणि सुलभता',
    privacy: 'गोपनीयता आणि डेटा संरक्षण',
    about: 'प्रणालीची माहिती',
    appVersion: 'अॅप आवृत्ती',
    account: 'खाते कृती',
    signOut: 'लॉग आउट',
  },
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const { language, setLanguage } = useApp();
  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';
  const t = STRINGS[langKey];

  const userName = session?.user?.name || 'User';
  const userEmail = session?.user?.email || '';
  const userImage = session?.user?.image || null;
  const initials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const [phone, setPhone] = useState('');
  const [emailReminders, setEmailReminders] = useState(false);
  const [whatsappReminders, setWhatsappReminders] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/profile')
      .then(async r =>
        r.ok
          ? ((await r.json()) as { phone?: string; emailReminders?: boolean; whatsappReminders?: boolean })
          : Promise.reject(new Error('Could not load your preferences. Please reload before saving.'))
      )
      .then(p => {
        if (p && typeof p.phone === 'string') setPhone(p.phone);
        setEmailReminders(!!p.emailReminders);
        setWhatsappReminders(!!p.whatsappReminders);
      })
      .catch(e => setError(e.message));
  }, [status]);

  const savePhone = async () => {
    const digits = phone.replace(/[\s().-]/g, '');

    if (digits && !/^\+[1-9][0-9]{7,14}$/.test(digits)) {
      setError(t.phoneInvalid);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, emailReminders, whatsappReminders }),
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
      <div className="page">
        <div className="content-wrapper stack-lg">
          <header className="stack">
            <h1>{t.title}</h1>
            <p className="muted">{t.sub}</p>
          </header>

          <div className="settings-layout"><nav className="settings-nav" role="tablist" aria-label={t.title}>{[['profile',User,t.profile],['language',Globe,t.language],['notifications',Bell,t.notifications],['privacy',Shield,t.privacy],['account',LogOut,t.account]].map(([key,Icon,label])=>{const Glyph=Icon as typeof User;return <button key={String(key)} id={'tab-'+key} role="tab" aria-selected={activeTab===key} aria-controls={'panel-'+key} onClick={()=>setActiveTab(String(key))}><Glyph/>{String(label)}</button>;})}</nav><div className="settings-content">
          <Section title={t.profile} hidden={activeTab!=='profile'} role="tabpanel" id="panel-profile" aria-labelledby="tab-profile">
            <div className="account-summary">
              {userImage ? (
                <Image src={userImage} alt="" width={48} height={48} unoptimized />
              ) : (
                <span className="initials">{initials}</span>
              )}
              <div>
                <strong>{userName}</strong>
                <p className="text-xs text-slate-500">{userEmail}</p>
              </div>
            </div>
            <dl className="facts">
              <div>
                <dt>{t.fullName}</dt>
                <dd>{userName}</dd>
              </div>
              <div>
                <dt>{t.email}</dt>
                <dd>{userEmail}</dd>
              </div>
            </dl>
            <p className="muted">Your account name and email are shown here. Profile editing and photo uploads are not currently supported.</p>
          </Section>

          <Section title={t.language} hidden={activeTab!=='language'} role="tabpanel" id="panel-language" aria-labelledby="tab-language">
            <p className="text-xs text-slate-600 mb-2">
              {langKey === 'hi'
                ? 'मूल्यांकन और इंटरफेस के लिए अपनी पसंदीदा भाषा चुनें:'
                : langKey === 'mr'
                ? 'मूल्यांकन आणि इंटरफेससाठी तुमची पसंतीची भाषा निवडा:'
                : 'Choose your preferred language for the interface and questionnaires:'}
            </p>
            <div className="flex gap-2 flex-wrap">
              {(['English', 'Hindi', 'Marathi'] as Language[]).map(l => (
                <Button
                  key={l}
                  variant={language === l ? 'primary' : 'secondary'}
                  onClick={() => setLanguage(l)}
                >
                  {l === 'English' ? 'English' : l === 'Hindi' ? 'हिन्दी (Hindi)' : 'मराठी (Marathi)'}
                </Button>
              ))}
            </div>
            <p className="muted text-xs mt-2">
              {langKey === 'hi'
                ? 'देवनागरी लिपि के लिए विशेष रूप से अनुकूलित टाइपोग्राफी।'
                : langKey === 'mr'
                ? 'देवनागरी लिपीसाठी विशेषतः अनुकूलित टायपोग्राफी.'
                : 'Your language preference is remembered on this browser.'}
            </p>
          </Section>

          <Section title={t.notifications} hidden={activeTab!=='notifications'} role="tabpanel" id="panel-notifications" aria-labelledby="tab-notifications">
            <p>{t.notifSub}</p>
            <div className="stack">
              <label className="checkbox-field flex items-center gap-3 cursor-pointer py-1">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-teal-700 rounded border-slate-300 focus:ring-teal-500"
                  checked={emailReminders}
                  onChange={e => {
                    setEmailReminders(e.target.checked);
                    setSaved(false);
                  }}
                />
                <span className="text-sm text-slate-800">
                  {langKey === 'hi'
                    ? 'ईमेल रिमाइंडर सक्षम करें'
                    : langKey === 'mr'
                    ? 'ईमेल स्मरणपत्रे सुरू करा'
                    : 'Enable email check-in reminders'}
                </span>
              </label>

              <label className="checkbox-field flex items-center gap-3 cursor-pointer py-1">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-teal-700 rounded border-slate-300 focus:ring-teal-500"
                  checked={whatsappReminders}
                  onChange={e => {
                    setWhatsappReminders(e.target.checked);
                    setSaved(false);
                  }}
                />
                <span className="text-sm text-slate-800">
                  {langKey === 'hi'
                    ? 'व्हाट्सएप रिमाइंडर सक्षम करें'
                    : langKey === 'mr'
                    ? 'व्हॉट्सॲप स्मरणपत्रे सुरू करा'
                    : 'Enable WhatsApp check-in reminders'}
                </span>
              </label>

              <p className="muted text-xs">
                {langKey === 'hi'
                  ? 'फोन नंबर हटाने के लिए इसे खाली करके सहेजें। रिमाइंडर कभी भी बंद किए जा सकते हैं।'
                  : langKey === 'mr'
                  ? 'फोन क्रमांक काढण्यासाठी रिकामा करून जतन करा. स्मरणपत्रे कधीही बंद करता येतात.'
                  : 'Clear and save the phone field to remove your number. Reminders can be toggled anytime.'}
              </p>
            </div>

            <Field
              id="phone"
              label={t.phoneLabel}
              inputMode="tel"
              autoComplete="tel"
              placeholder={t.phonePlaceholder}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              aria-invalid={!!error}
              aria-describedby="phone-note"
            />
            <p id="phone-note" className="muted text-xs">
              {t.phoneNote}
            </p>

            {error && <Notice tone="warning" role="alert">{error}</Notice>}

            <div>
              <Button onClick={savePhone} disabled={saving}>
                {saving ? t.phoneSaving : saved ? t.saved : t.savePhone}
              </Button>
            </div>
            {saved && (
              <p role="status" className="text-xs text-emerald-700 font-semibold mt-1">
                {t.phoneSaved}
              </p>
            )}
          </Section>

          <Section title={t.privacy} hidden={activeTab!=='privacy'} role="tabpanel" id="panel-privacy" aria-labelledby="tab-privacy">
            <dl className="facts">
              <div>
                <dt>{langKey === 'hi' ? 'सहेजी रिपोर्ट' : langKey === 'mr' ? 'जतन केलेले अहवाल' : 'Saved reports'}</dt>
                <dd>{langKey === 'hi' ? 'अपने खाते से उपलब्ध' : langKey === 'mr' ? 'तुमच्या खात्यात उपलब्ध' : 'Available through your authenticated account'}</dd>
              </div>
              <div>
                <dt>{langKey === 'hi' ? 'तृतीय पक्ष शेयरिंग' : langKey === 'mr' ? 'तृतीय पक्ष शेअरिंग' : 'Third-Party Sharing'}</dt>
                <dd>{langKey === 'hi' ? 'कॉन्फ़िगर होने पर AI और आवाज़ सेवाएँ इस्तेमाल होती हैं।' : langKey === 'mr' ? 'कॉन्फिगर केल्यावर AI आणि आवाज सेवा वापरल्या जातात.' : 'Configured AI and voice services process relevant assessment inputs. See the privacy information for details.'}</dd>
              </div>
            </dl>
            <a href="/privacy">Read privacy information</a>
          </Section>

          <Section title={t.about} hidden={activeTab!=='account'}>
            <dl className="facts">
              <div>
                <dt>{t.appVersion}</dt>
                <dd>SymptoSense 0.1.0-clinical</dd>
              </div>
              <div>
                <dt>{langKey === 'hi' ? 'मॉडल आधार' : langKey === 'mr' ? 'मॉडेल आधार' : 'Inference Core'}</dt>
                <dd>DDXPlus research model · model availability varies</dd>
              </div>
            </dl>
          </Section>

          <Section title={t.account} hidden={activeTab!=='account'} role="tabpanel" id="panel-account" aria-labelledby="tab-account">
            <div>
              <Button variant="danger" onClick={() => signOut({ callbackUrl: '/auth/login' })}>
                <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
                {t.signOut}
              </Button>
            </div>
          </Section>
          </div></div>
        </div>
      </div>
    </AppShell>
  );
}
