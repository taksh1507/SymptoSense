'use client';

import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';

const STEPS = {
  en: [
    { label: 'Processing your symptom inputs',       icon: '🩺' },
    { label: 'Running risk weight analysis',          icon: '⚖️' },
    { label: 'Calculating confidence score',          icon: '🤖' },
    { label: 'Generating clinical reasoning',         icon: '💡' },
    { label: 'Preparing your personalised report',   icon: '📋' },
  ],
  hi: [
    { label: 'आपके लक्षण इनपुट प्रोसेस हो रहे हैं',    icon: '🩺' },
    { label: 'जोखिम भार विश्लेषण चल रहा है',            icon: '⚖️' },
    { label: 'विश्वास स्कोर की गणना हो रही है',          icon: '🤖' },
    { label: 'नैदानिक तर्क तैयार किया जा रहा है',        icon: '💡' },
    { label: 'आपकी व्यक्तिगत रिपोर्ट तैयार हो रही है',  icon: '📋' },
  ],
  mr: [
    { label: 'तुमचे लक्षण इनपुट प्रक्रिया होत आहे',      icon: '🩺' },
    { label: 'जोखीम वजन विश्लेषण चालू आहे',              icon: '⚖️' },
    { label: 'विश्वास स्कोर मोजला जात आहे',               icon: '🤖' },
    { label: 'नैदानिक तर्क तयार केला जात आहे',           icon: '💡' },
    { label: 'तुमचा वैयक्तिक अहवाल तयार होत आहे',        icon: '📋' },
  ],
};

const TITLES = {
  en: { main: 'Analyzing your symptoms', sub: 'Our AI triage engine is building your risk profile' },
  hi: { main: 'आपके लक्षणों का विश्लेषण हो रहा है', sub: 'हमारा AI ट्राइएज इंजन आपका जोखिम प्रोफ़ाइल बना रहा है' },
  mr: { main: 'तुमच्या लक्षणांचे विश्लेषण होत आहे', sub: 'आमचे AI ट्राइएज इंजन तुमचे जोखीम प्रोफाइल तयार करत आहे' },
};

export default function LoadingScreen() {
  const { language } = useApp();
  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';
  const steps = STEPS[langKey];
  const title = TITLES[langKey];

  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [dots, setDots] = useState('');

  // Animate steps sequentially — each step takes ~500ms
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => {
        if (prev < steps.length - 1) {
          setCompletedSteps(c => [...c, prev]);
          return prev + 1;
        }
        clearInterval(interval);
        setCompletedSteps(c => [...c, prev]);
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

  return (
    <div style={{
      minHeight: '100%',
      background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '32px', padding: '48px 24px',
      fontFamily: 'var(--font)',
    }}>

      {/* ── Central icon with pulse rings ── */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {[120, 96, 76].map((size, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: size, height: size, borderRadius: '50%',
            border: `1.5px solid rgba(99,102,241,${0.35 - i * 0.1})`,
            animation: `pulse-ring 2s ease-out infinite`,
            animationDelay: `${i * 0.4}s`,
          }} />
        ))}
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px',
          boxShadow: '0 0 40px rgba(99,102,241,0.5), 0 0 80px rgba(99,102,241,0.2)',
          zIndex: 1,
        }}>
          🫀
        </div>
      </div>

      {/* ── Title ── */}
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
          {title.main}{dots}
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: '1.5' }}>
          {title.sub}
        </p>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.round(((completedSteps.length) / steps.length) * 100)}%`,
            background: 'linear-gradient(90deg, #6366f1, #818cf8)',
            borderRadius: '999px',
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            {completedSteps.length}/{steps.length}
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            {Math.round((completedSteps.length / steps.length) * 100)}%
          </span>
        </div>
      </div>

      {/* ── Step list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '380px' }}>
        {steps.map((step, i) => {
          const isDone    = completedSteps.includes(i);
          const isActive  = activeStep === i && !isDone;
          const isPending = !isDone && !isActive;

          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '11px 16px', borderRadius: '12px',
              background: isDone
                ? 'rgba(99,102,241,0.12)'
                : isActive
                ? 'rgba(255,255,255,0.07)'
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isDone ? 'rgba(99,102,241,0.3)' : isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
              transition: 'all 0.3s ease',
              opacity: isPending ? 0.4 : 1,
            }}>
              {/* Status indicator */}
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDone
                  ? '#6366f1'
                  : isActive
                  ? 'rgba(255,255,255,0.1)'
                  : 'rgba(255,255,255,0.05)',
                border: isActive ? '2px solid rgba(99,102,241,0.6)' : 'none',
                fontSize: '11px',
              }}>
                {isDone ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isActive ? (
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: '#818cf8',
                    animation: 'pulse-dot 1s ease-in-out infinite',
                  }} />
                ) : (
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                )}
              </div>

              <span style={{ fontSize: '13px', color: isDone ? 'rgba(255,255,255,0.85)' : isActive ? 'white' : 'rgba(255,255,255,0.4)', fontWeight: isActive ? '600' : '400', flex: 1 }}>
                {step.label}
              </span>

              <span style={{ fontSize: '16px', opacity: isDone ? 1 : isActive ? 0.7 : 0.2 }}>
                {step.icon}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Tech badge ── */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '8px', padding: '8px 16px',
      }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontFamily: 'JetBrains Mono, monospace' }}>
          Next.js · Groq AI · Neon PostgreSQL
        </span>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(0.9); opacity: 0.8; }
          70%  { transform: scale(1.15); opacity: 0; }
          100% { transform: scale(1.15); opacity: 0; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
