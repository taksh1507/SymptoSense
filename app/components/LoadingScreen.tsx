'use client';

export default function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100%',
      background: 'linear-gradient(135deg, #1E3A5F 0%, #1a2e4a 50%, #0F2027 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '28px', padding: '48px 32px',
    }}>
      {/* Pulsing ring */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute', width: '100px', height: '100px', borderRadius: '50%',
          border: '2px solid rgba(59,130,246,0.4)',
          animation: 'pulse-ring 1.5s ease-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: '80px', height: '80px', borderRadius: '50%',
          border: '2px solid rgba(59,130,246,0.25)',
          animation: 'pulse-ring 1.5s ease-out infinite 0.35s',
        }} />
        <div style={{
          width: '68px', height: '68px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '30px', boxShadow: '0 8px 32px rgba(59,130,246,0.5)',
        }}>🧬</div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'white', margin: 0 }}>
          Analyzing symptoms…
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', marginTop: '8px' }}>
          Our AI triage engine is calculating your risk profile
        </p>
      </div>

      {/* Spinner */}
      <div style={{
        width: '44px', height: '44px',
        border: '3px solid rgba(255,255,255,0.12)',
        borderTopColor: '#3B82F6', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '360px' }}>
        {[
          { label: 'Parsing symptom inputs…', done: true, delay: '0s' },
          { label: 'Applying risk weight formulas…', done: true, delay: '0.5s' },
          { label: 'Querying PostgreSQL reports…', done: false, delay: '1s' },
          { label: 'Generating recommendations…', done: false, delay: '1.5s' },
        ].map((step, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            animation: 'fadeIn 0.5s ease forwards',
            animationDelay: step.delay,
            opacity: 0,
          }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%',
              background: step.done ? '#10B981' : 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', color: 'white', fontWeight: '700', flexShrink: 0,
            }}>
              {step.done ? '✓' : '…'}
            </div>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{step.label}</span>
          </div>
        ))}
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px', padding: '10px 20px',
      }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: 'JetBrains Mono, monospace' }}>
          POST /api/triage/calculate → Flask → PostgreSQL
        </span>
      </div>
    </div>
  );
}
