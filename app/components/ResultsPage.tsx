'use client';

import { useApp } from '../context/AppContext';

function GaugeChart({ score, max = 30 }: { score: number; max?: number }) {
  const pct = score / max;
  const r = 70;
  const circumference = Math.PI * r;
  const dashOffset = circumference * (1 - pct);
  const color = pct >= 0.7 ? '#B91C1C' : pct >= 0.4 ? '#B45309' : '#15803D';
  const label = pct >= 0.7 ? 'HIGH' : pct >= 0.4 ? 'MEDIUM' : 'LOW';
  const emoji = pct >= 0.7 ? '🔴' : pct >= 0.4 ? '🟡' : '🟢';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="180" height="100" viewBox="0 0 180 100">
        <path d="M 15 90 A 70 70 0 0 1 165 90" fill="none" stroke="var(--border-faint)" strokeWidth="14" strokeLinecap="round" />
        <path d="M 15 90 A 70 70 0 0 1 165 90" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.19, 1, 0.22, 1)' }} />
        <text x="90" y="72" textAnchor="middle" fontSize="32" fontWeight="900" fill={color} style={{ fontFamily: 'var(--font)' }}>{score}</text>
        <text x="90" y="92" textAnchor="middle" fontSize="12" fill="var(--text-4)" style={{ fontFamily: 'var(--font)' }}>/ {max}</text>
      </svg>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px',
        background: pct >= 0.7 ? 'var(--red-light)' : pct >= 0.4 ? '#FFFBEB' : '#F0FDF4',
        border: `1.5px solid ${color}33`, borderRadius: '999px', padding: '6px 20px',
      }}>
        <span style={{ fontSize: '18px' }}>{emoji}</span>
        <span style={{ fontSize: '15px', fontWeight: '800', color }}>{label} RISK</span>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const { riskScore, riskLevel, mockReports, setTriageScreen, selectedAnswers } = useApp();

  const getRecommendation = (score: number) => {
    if (score >= 20) return { title: 'Seek Emergency Care', desc: 'Visit the nearest hospital casualty department immediately.', type: 'urgent' };
    if (score >= 10) return { title: 'Consult Your Doctor', desc: 'Schedule an appointment within the next 24 hours.', type: 'moderate' };
    return { title: 'Home Management', desc: 'Monitor symptoms and rest. Consult doctor if conditions worsen.', type: 'low' };
  };

  const rec = getRecommendation(riskScore);
  const detectedSymptoms = (selectedAnswers[1] || '').split(',').filter(Boolean);

  return (
    <div className="mobile-padding" style={{ padding: '32px', minHeight: '100%', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-1)', margin: 0, letterSpacing: '-0.5px' }}>
            Assessment Result
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', marginTop: '4px' }}>
            Report generated on April 14, 2026
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setTriageScreen('language')}
          style={{ gap: '8px' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
          Restart Triage
        </button>
      </div>

      <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
        {/* LEFT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Gauge & Analysis */}
          <div className="card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
              <div style={{ flexShrink: 0 }}>
                <GaugeChart score={riskScore} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  background: riskScore >= 20 ? 'rgba(185, 28, 28, 0.05)' : riskScore >= 10 ? '#FFFBEB' : '#F0FDF4',
                  borderLeft: `4px solid ${riskScore >= 20 ? 'var(--red)' : riskScore >= 10 ? '#B45309' : '#15803D'}`,
                  padding: '16px 20px', borderRadius: '10px'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '6px' }}>
                    {rec.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-3)', lineHeight: '1.6' }}>
                    {rec.desc}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="code-block" style={{ marginTop: '24px', fontSize: '11px' }}>
              <span className="cm">// Logic Path: {riskLevel.toUpperCase()} RISK detected</span>{'\n'}
              <span className="kw">risk_level</span> = {riskScore} / 30;{'\n'}
              <span className="kw">recommendation</span> = {`"${rec.title}"`};
            </div>
          </div>

          {/* Recommendations Breakdown */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
               Next Steps
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { icon: '🏥', title: 'Hospital Visit', active: riskScore >= 20 },
                { icon: '👨‍⚕️', title: 'Call Doctor', active: riskScore >= 10 },
                { icon: '🩹', title: 'Home Care', active: true },
                { icon: '💊', title: 'Medication', active: riskScore >= 10 },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '16px', borderRadius: '12px',
                  border: '1.5px solid var(--border)',
                  background: item.active ? 'white' : 'var(--bg)',
                  opacity: item.active ? 1 : 0.4,
                  transition: 'all 0.2s',
                  boxShadow: item.active ? 'var(--shadow-sm)' : 'none'
                }}>
                  <span style={{ fontSize: '24px' }}>{item.icon}</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-1)' }}>{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Symptoms Found */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '16px' }}>Detected Markers</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {detectedSymptoms.length > 0 ? detectedSymptoms.map((tag) => (
                <span key={tag} style={{
                  background: 'var(--red-light)', color: 'var(--red)', border: '1px solid var(--red-border)',
                  padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', textTransform: 'capitalize'
                }}>{tag.replace('_', ' ')}</span>
              )) : <span style={{ color: 'var(--text-4)' }}>No specific symptoms selected.</span>}
            </div>
            <div className="code-block" style={{ fontSize: '10.5px' }}>
               SELECT * FROM triage_weights WHERE symptom IN ({detectedSymptoms.map(s => `'${s}'`).join(', ') || 'null'})
            </div>
          </div>

          {/* Past History */}
          <div className="card" style={{ padding: '24px', flex: 1 }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '16px' }}>Recent Logs</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {mockReports.slice(0, 4).map((r, i) => (
                <div key={i} style={{
                  padding: '12px 14px', borderRadius: '10px',
                  background: i === 0 ? 'var(--red-light)' : 'var(--bg)',
                  border: `1px solid ${i === 0 ? 'var(--red-border)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-1)' }}>{r.date}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-4)' }}>{r.symptoms.length} symptoms tracked</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '900', color: r.riskLevel === 'High' ? 'var(--red)' : '#B45309' }}>
                      {r.score}/30
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-4)', textTransform: 'uppercase', fontWeight: '700' }}>
                      {r.riskLevel}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div style={{
        marginTop: '28px', padding: '16px',
        background: 'var(--text-1)', borderRadius: '12px', textAlign: 'center',
      }}>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
          ⚠️ DISCLAIMER: THIS IS A DECISION SUPPORT TOOL. IN CASE OF EMERGENCY, CONTACT MEDICAL PROFESSIONALS IMMEDIATELY.
        </p>
      </div>
    </div>
  );
}
