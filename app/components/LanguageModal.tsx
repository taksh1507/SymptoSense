'use client';

import { useState } from 'react';
import { useApp, Language } from '../context/AppContext';

const GlobeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const LANGUAGES: { code: Language; flag: string; native: string; sub: string }[] = [
  { code: 'English', flag: '🇺🇸', native: 'English', sub: 'English (United States)' },
  { code: 'Hindi', flag: '🇮🇳', native: 'हिन्दी', sub: 'Hindi (India)' },
  { code: 'Marathi', flag: '🇮🇳', native: 'मराठी', sub: 'Marathi (India)' },
];

export default function LanguageModal() {
  const { setLanguage, setTriageScreen, cancelTest } = useApp();
  const [selected, setSelected] = useState<Language>('English');

  return (
    <div className="modal-overlay" onClick={cancelTest}>
      <div
        className="card modal-in"
        style={{ width: '100%', maxWidth: '400px', padding: '28px', margin: '16px', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{ color: '#B91C1C' }}><GlobeIcon /></div>
          <h2 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>Choose language</h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', paddingLeft: '32px' }}>
          Persisted to <code style={{ fontSize: '11.5px', background: '#F3F4F6', padding: '1px 5px', borderRadius: '4px' }}>user_preferences</code> table
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '22px' }}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              id={`lang-${lang.code.toLowerCase()}`}
              onClick={() => setSelected(lang.code)}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '13px 16px', borderRadius: '10px',
                border: selected === lang.code ? '1.5px solid #B91C1C' : '1.5px solid var(--border)',
                background: selected === lang.code ? '#FEF2F2' : 'white',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '24px', lineHeight: 1 }}>{lang.flag}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: selected === lang.code ? '#991B1B' : 'var(--text-primary)' }}>{lang.native}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' }}>{lang.sub}</div>
              </div>
              {selected === lang.code && (
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#B91C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                  <CheckIcon />
                </div>
              )}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button id="lang-cancel-btn" className="btn btn-outline" onClick={cancelTest} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button id="lang-continue-btn" className="btn btn-primary" onClick={() => { setLanguage(selected); setTriageScreen('person'); }} style={{ flex: 2, justifyContent: 'center' }}>
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
