'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Home, FileText, Settings, LogOut, Activity, Menu } from 'lucide-react';
import { useApp, type Language } from '../context/AppContext';
import { Button, Notice } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useUiText } from '@/components/ui/use-ui-text';
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { language, setLanguage, triageScreen, cancelTest } = useApp();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen,setIsMobileMenuOpen] = useState(false);
  const t = useUiText();
  const isTestActive = triageScreen === 'questions' || triageScreen === 'loading';
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'User';
  const userEmail = session?.user?.email || '';
  const userImage = session?.user?.image || null;
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2);
  const handleHome = () => { if (isTestActive) cancelTest(); router.push('/dashboard'); setIsMobileMenuOpen(false); };
  const handleLogout = async () => { await signOut({ callbackUrl: '/' }); };
  const nav = [
    { id: 'nav-home', icon: Home, label: t('Home','मुख्य पृष्ठ','मुख्यपृष्ठ'), path: '/dashboard', onClick: handleHome },
    { id: 'nav-reports', icon: FileText, label: t('Past reports','पिछली रिपोर्ट','जुने अहवाल'), path: '/dashboard/reports' },
    { id: 'nav-settings', icon: Settings, label: t('Settings','सेटिंग्स','सेटिंग्ज'), path: '/dashboard/settings' },
    { id: 'nav-model-health', icon: Activity, label: t('Model health','मॉडल की स्थिति','मॉडेलची स्थिती'), path: '/dashboard/model-health' },
    { id: 'nav-ml-insights', icon: Activity, label: t('ML insights','मॉडल का विश्लेषण','मॉडेलचे विश्लेषण'), path: '/dashboard/ml-insights' },
  ];
  const sidebar = <div className="sidebar-content"><span className="wordmark">SymptoSense</span>
    <p className="eyebrow">{t('Your health record','आपका स्वास्थ्य रिकॉर्ड','तुमची आरोग्य नोंद')}</p>
    <nav className="stack" aria-label={t('Account navigation','खाते का नेविगेशन','खात्याचे नेव्हिगेशन')}>{nav.map(({ id, icon: Icon, label, path, onClick }) => <button id={id} key={id} className={'nav-link' + (pathname === path ? ' active' : '')} aria-current={pathname === path ? 'page' : undefined} onClick={onClick || (() => { router.push(path); setIsMobileMenuOpen(false); })}><Icon aria-hidden="true" /><span>{label}</span></button>)}</nav>
    {isTestActive && <Notice><p>{t('Assessment in progress','मूल्यांकन जारी है','मूल्यांकन सुरू आहे')}</p><Button variant="secondary" onClick={() => { cancelTest(); setIsMobileMenuOpen(false); }}>{t('Cancel assessment','मूल्यांकन रद्द करें','मूल्यांकन रद्द करा')}</Button></Notice>}
    <div className="sidebar-bottom stack"><fieldset className="language-options"><legend>{t('Language','भाषा','भाषा')}</legend>{(['English','Hindi','Marathi'] as Language[]).map(l => <button key={l} aria-pressed={language === l} className="language-option" onClick={() => setLanguage(l)}>{l === 'English' ? 'English' : l === 'Hindi' ? 'हिन्दी' : 'मराठी'}</button>)}</fieldset>
    <div className="account-summary">{userImage ? <Image src={userImage} alt="" width={32} height={32} unoptimized /> : <span className="initials" aria-hidden="true">{initials}</span>}<div><strong>{userName}</strong><p className="muted">{userEmail}</p></div></div>
    <button id="nav-mobile-logout" className="nav-link" onClick={handleLogout}><LogOut aria-hidden="true" />{t('Sign out','लॉग आउट','लॉग आउट')}</button></div>
  </div>;
  return <div className="app-shell"><a className="skip-link" href="#main-content">{t('Skip to content','मुख्य सामग्री पर जाएँ','मुख्य मजकुराकडे जा')}</a><aside className="app-sidebar hide-mobile">{sidebar}</aside>
    {isMobileMenuOpen && <Modal title={t('Navigation','नेविगेशन','नेव्हिगेशन')} onClose={() => setIsMobileMenuOpen(false)}>{sidebar}<Button variant="secondary" onClick={() => setIsMobileMenuOpen(false)}>{t('Close menu','मेनू बंद करें','मेनू बंद करा')}</Button></Modal>}
    <div className="app-body"><header className="app-mobile-header show-mobile"><span className="wordmark">SymptoSense</span><Button variant="secondary" onClick={() => setIsMobileMenuOpen(true)} aria-label={t('Open navigation menu','नेविगेशन मेनू खोलें','नेव्हिगेशन मेनू उघडा')} aria-haspopup="dialog"><Menu aria-hidden="true" /></Button></header><main id="main-content" className="app-main" lang={language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en'}>{children}</main></div>
  </div>;
}
