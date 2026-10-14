'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, Activity } from 'lucide-react';
import { useApp, type Language } from '../context/AppContext';
import { Button } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useUiText } from '@/components/ui/use-ui-text';

export default function PublicNav({ activeLink }: { activeLink?: 'home' | 'how-it-works' | 'about' }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage } = useApp();
  const t = useUiText();

  const links = [
    { key: 'home', label: t('Home', 'मुख्य पृष्ठ', 'मुख्यपृष्ठ'), href: '/' },
    { key: 'how-it-works', label: t('How it works', 'यह कैसे काम करता है', 'हे कसे काम करते'), href: '/how-it-works' },
    { key: 'about', label: t('About', 'हमारे बारे में', 'आमच्याविषयी'), href: '/about' },
  ];

  const languageControl = (
    <select
      className="input language-select !min-h-[38px] !py-1 !px-2.5 !text-xs font-medium cursor-pointer"
      aria-label={t('Language', 'भाषा', 'भाषा')}
      value={language || 'English'}
      onChange={e => setLanguage(e.target.value as Language)}
    >
      <option value="English">English</option>
      <option value="Hindi">हिन्दी</option>
      <option value="Marathi">मराठी</option>
    </select>
  );

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t('Skip to content', 'मुख्य सामग्री पर जाएँ', 'मुख्य मजकुराकडे जा')}
      </a>
      <nav className="public-nav" aria-label={t('Main navigation', 'मुख्य नेविगेशन', 'मुख्य नेव्हिगेशन')}>
        <button className="wordmark cursor-pointer" onClick={() => router.push('/')} aria-label="SymptoSense home">
          <span className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <Activity className="w-5 h-5 text-teal-100" />
          </span>
          <span>SymptoSense</span>
        </button>

        <div className="public-links hide-mobile">
          {links.map(link => (
            <button
              key={link.key}
              className={`nav-link !w-auto !py-2 !px-3 ${activeLink === link.key ? 'active' : ''}`}
              aria-current={activeLink === link.key ? 'page' : undefined}
              onClick={() => router.push(link.href)}
            >
              {link.label}
            </button>
          ))}
        </div>

        <div className="public-links hide-mobile">
          {languageControl}
          <Button variant="ghost" onClick={() => router.push('/auth/login')}>
            {t('Sign in', 'साइन इन', 'साइन इन')}
          </Button>
          <Button variant="primary" onClick={() => router.push('/auth/signup')}>
            {t('Start assessment', 'मूल्यांकन शुरू करें', 'मूल्यांकन सुरू करा')}
          </Button>
        </div>

        <Button
          className="show-mobile"
          variant="secondary"
          aria-label={t('Open menu', 'मेनू खोलें', 'मेनू उघडा')}
          aria-haspopup="dialog"
          onClick={() => setIsOpen(true)}
        >
          <Menu aria-hidden="true" />
        </Button>
      </nav>

      {isOpen && (
        <Modal title={t('Menu', 'मेनू', 'मेनू')} onClose={() => setIsOpen(false)}>
          <div className="stack">
            {links.map(link => (
              <Button
                key={link.key}
                variant="secondary"
                onClick={() => {
                  router.push(link.href);
                  setIsOpen(false);
                }}
              >
                {link.label}
              </Button>
            ))}
            <div className="py-2">{languageControl}</div>
            <Button
              onClick={() => {
                router.push('/auth/signup');
                setIsOpen(false);
              }}
            >
              {t('Start assessment', 'मूल्यांकन शुरू करें', 'मूल्यांकन सुरू करा')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                router.push('/auth/login');
                setIsOpen(false);
              }}
            >
              {t('Sign in', 'साइन इन', 'साइन इन')}
            </Button>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              <X aria-hidden="true" />
              {t('Close menu', 'मेनू बंद करें', 'मेनू बंद करा')}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
