'use client';

import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';

const STEPS = {
  en: [
    { label: 'Processing your symptom inputs',      icon: '🩺' },
    { label: 'Running risk weight analysis',         icon: '⚖️' },
    { label: 'Calculating confidence score',         icon: '🤖' },
    { label: 'Generating clinical reasoning',        icon: '💡' },
    { label: 'Preparing your personalised report',  icon: '📋' },
  ],
  hi: [
    { label: 'आपके लक्षण इनपुट प्रोसेस हो रहे हैं',   icon: '🩺' },
    { label: 'जोखिम भार विश्लेषण चल रहा है',           icon: '⚖️' },
    { label: 'विश्वास स्कोर की गणना हो रही है',         icon: '🤖' },
    { label: 'नैदानिक तर्क तैयार किया जा रहा है',       icon: '💡' },
    { label: 'आपकी व्यक्तिगत रिपोर्ट तैयार हो रही है', icon: '📋' },
  ],
  mr: [
    { label: 'तुमचे लक्षण इनपुट प्रक्रिया होत आहे',     icon: '🩺' },
    { label: 'जोखीम वजन विश्लेषण चालू आहे',             icon: '⚖️' },
    { label: 'विश्वास स्कोर मोजला जात आहे',              icon: '🤖' },
    { label: 'नैदानिक तर्क तयार केला जात आहे',          icon: '💡' },
    { label: 'तुमचा वैयक्तिक अहवाल तयार होत आहे',       icon: '📋' },
  ],
};

const TITLES = {
  en: { main: 'Analyzing your symptoms', sub: 'Our AI triage engine is building your risk profile' },
  hi: { main: 'आपके लक्षणों का विश्लेषण हो रहा है', sub: 'हमारा AI ट्राइएज इंजन आपका जोखिम प्रोफ़ाइल बना रहा है' },
  mr: { main: 'तुमच्या लक्षणांचे विश्लेषण होत आहे', sub: 'आमचे AI ट्राइएज इंजन तुमचे जोखीम प्रोफाइल तयार करत आहे' },
};

const HeartPulseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>
  </svg>
);

export default function LoadingScreen() {
  const { language } = useApp();
  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';
  const steps = STEPS[langKey];
  const title = TITLES[langKey];

  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [dots, setDots] = useState('');

  // Animate steps sequentially — cap completedSteps at steps.length to prevent >100%
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => {
        if (prev < steps.length - 1) {
          setCompletedSteps(c => {
            // Guard: never add duplicates or exceed total
            if (c.includes(prev) || c.length >= steps.length) return c;
            return [...c, prev];
          });
          return prev + 1;
        }
        // Last step — mark it complete and stop
        setCompletedSteps(c => {
          if (c.includes(prev) || c.length >= steps.length) return c;
          return [...c, prev];
        });
        clearInterval(interval);
        return prev;
      });
    }, 480);
    return () => clearInterval(interval);
  }, [steps.length]);

  // Animated ellipsis
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(t);
  }, []);

  // Cap at steps.length so percentage never exceeds 100%
  const doneCount = Math.min(completedSteps.length, steps.length);
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div style={{
      minHeight: '100%',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '28px',
      padding: '48px 24px',
      fontFamily: 'var(--font)',
    }}>

      {/* ── Central icon with pulse rings ── */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {[100, 78].map((size, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: size, height: size, borderRadius: '50%',
            border: `1.5px solid rgba(185,28,28,${0.2 - i * 0.07})`,
            animation: 'ls-pulse-ring 2s ease-out infinite',
            animationDelay: `${i * 0.45}s`,
          }} />
        ))}
        <div style={{
          width: '60px', height: '60px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #FC8181, #B91C1C)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(185,28,28,0.35), 0 0 0 6px rgba(185,28,28,0.08)',
          zIndex: 1,
        }}>
          <HeartPulseIcon />
        </div>
      </div>

      {/* ── Title ── */}
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <h2 style={{
          fontSize: '22px', fontWeight: '800',
          color: 'var(--text-1)', margin: '0 0 8px',
          letterSpacing: '-0.4px', lineHeight: 1.2,
        }}>
          {title.main}{dots}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
          {title.sub}
        </p>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-4)', fontWeight: '500' }}>
            {doneCount}/{steps.length} steps
          </span>
          <span style={{ fontSize: '11px', color: 'var(--red)', fontWeight: '700' }}>
            {pct}%
          </span>
        </div>
      </div>

      {/* ── Step list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '400px' }}>
        {steps.map((step, i) => {
          const isDone    = completedSteps.includes(i);
          const isActive  = activeStep === i && !isDone;
          const isPending = !isDone && !isActive;

          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: 'var(--radius-md)',
              background: isDone
                ? 'var(--red-light)'
                : isActive
                ? 'var(--surface)'
                : 'var(--surface)',
              border: `1.5px solid ${
                isDone    ? 'var(--red-border)'
                : isActive ? 'var(--red)'
                : 'var(--border)'
              }`,
              boxShadow: isActive ? '0 2px 8px rgba(185,28,28,0.12)' : 'var(--shadow-xs)',
              transition: 'all 0.3s ease',
              opacity: isPending ? 0.5 : 1,
            }}>
              {/* Status dot */}
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDone
                  ? 'var(--red)'
                  : isActive
                  ? 'var(--red-light)'
                  : 'var(--border-faint)',
                border: isActive ? '2px solid var(--red-border)' : 'none',
              }}>
                {isDone ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isActive ? (
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: 'var(--red)',
                    animation: 'ls-pulse-dot 1s ease-in-out infinite',
                  }} />
                ) : (
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--border)' }} />
                )}
              </div>

              <span style={{
                fontSize: '13px', flex: 1,
                color: isDone
                  ? 'var(--red-text)'
                  : isActive
                  ? 'var(--text-1)'
                  : 'var(--text-4)',
                fontWeight: isDone ? '600' : isActive ? '700' : '400',
              }}>
                {step.label}
              </span>

              <span style={{ fontSize: '16px', opacity: isPending ? 0.25 : 1 }}>
                {step.icon}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes ls-pulse-ring {
          0%   { transform: scale(0.92); opacity: 0.7; }
          70%  { transform: scale(1.18); opacity: 0; }
          100% { transform: scale(1.18); opacity: 0; }
        }
        @keyframes ls-pulse-dot {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
