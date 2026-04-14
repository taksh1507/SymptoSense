'use client';

import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

// ── SVG icons (consistent 16px) ──
const PlayCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
  </svg>
);
const AlertTriangle = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/>
  </svg>
);
const TrendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>
  </svg>
);
const ListIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);
const ChevronRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

// ── Chart ──
const DATA = [
  { m: 'Oct', v: 8 }, { m: 'Nov', v: 12 }, { m: 'Dec', v: 6 },
  { m: 'Jan', v: 18 }, { m: 'Feb', v: 14 }, { m: 'Mar', v: 5 }, { m: 'Apr', v: 22 },
];
const W = 340, H = 88, PAD = { l: 28, r: 10, t: 8, b: 22 };

function RiskChart() {
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const pts = DATA.map((d, i) => ({
    x: PAD.l + (i / (DATA.length - 1)) * iW,
    y: PAD.t + (1 - d.v / 30) * iH,
    ...d,
  }));
  const line = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  const area = `${line} L${pts[pts.length-1].x},${H-PAD.b} L${pts[0].x},${H-PAD.b} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--red)" stopOpacity="0.12"/>
          <stop offset="100%" stopColor="var(--red)" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0, 10, 20, 30].map(v => {
        const y = PAD.t + (1 - v/30) * iH;
        return (
          <g key={v}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="var(--border-faint)" strokeWidth="1"/>
            <text x={PAD.l-5} y={y+3.5} fontSize="8" fill="var(--text-4)" textAnchor="end" fontFamily="Inter,sans-serif">{v}</text>
          </g>
        );
      })}
      <path d={area} fill="url(#rg)"/>
      <path d={line} fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map(p => (
        <g key={p.m}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="var(--red)" stroke="white" strokeWidth="1.5"/>
          <text x={p.x} y={H-4} fontSize="8" fill="var(--text-4)" textAnchor="middle" fontFamily="Inter,sans-serif">{p.m}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Risk helpers ──
const riskColor = (r: string) => r === 'High' ? 'var(--red)' : r === 'Medium' ? '#B45309' : '#15803D';
const riskDot   = (r: string) => r === 'High' ? 'var(--red)' : r === 'Medium' ? '#F59E0B' : '#22C55E';

export default function Dashboard() {
  const { startTest, mockReports } = useApp();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="mobile-padding" style={{ padding: '28px 32px', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: '800', color: 'var(--text-1)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            Good morning, Rahul Sharma
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', marginTop: '4px' }}>
            Tuesday, April 14, 2026 &nbsp;·&nbsp; Mumbai, India
          </p>
        </div>
        {/* Avatar — same visual as sidebar avatar */}
        <div style={{
          width: '38px', height: '38px', borderRadius: '50%',
          background: 'var(--red)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: '700', fontSize: '12px',
          boxShadow: '0 2px 6px rgb(185 28 28 / 0.3)',
        }}>RS</div>
      </div>

      {/* ── Alert banner ── */}
      <div className="alert-high" style={{ marginBottom: '22px' }}>
        <AlertTriangle />
        <span>
          <strong>High Risk Detected.</strong> Your last triage score was 22 / 30 — please seek emergency care immediately.
        </span>
      </div>

      {/* ── Start Test card ── */}
      <div className="card" style={{
        padding: '20px 24px',
        marginBottom: '20px',
        background: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '4px' }}>
              Ready to assess your symptoms?
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', marginBottom: '10px' }}>
              Complete 8 targeted questions for an AI-powered triage result.
            </div>
            <div className="code-block" style={{ display: 'inline-block', fontSize: '10.5px' }}>
              <span className="kw">POST</span> <span className="str">/api/triage/start</span>
              <span className="cm"> ← Flask · PostgreSQL</span>
            </div>
          </div>
          <button
            id="start-test-btn"
            className="btn btn-primary"
            onClick={startTest}
            style={{ padding: '11px 22px', fontSize: '14px', flexShrink: 0 }}
          >
            <PlayCircle /> Start Test
          </button>
        </div>
      </div>

      {/* ── Stat cards — 3 columns ── */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {[
          {
            icon: <UserIcon />, iconColor: '#6366F1', iconBg: '#EEF2FF',
            label: 'Active Profile', value: 'Self',
            tag: <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#15803D', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '2px 9px', borderRadius: '999px' }}>Primary</span>,
          },
          {
            icon: <ClockIcon />, iconColor: 'var(--red)', iconBg: 'var(--red-light)',
            label: 'Last Test', value: '2 days ago',
            tag: <span className="badge badge-high">High Risk · 22</span>,
          },
          {
            icon: <CalendarIcon />, iconColor: '#B45309', iconBg: '#FFFBEB',
            label: 'Recommended', value: 'Check Today',
            tag: <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '2px 9px', borderRadius: '999px' }}>Urgent Follow-up</span>,
          },
        ].map((c, i) => (
          <div key={i} className="card card-lift" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: 'var(--radius-sm)',
                background: c.iconBg, color: c.iconColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {c.icon}
              </div>
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {c.label}
                </div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-1)', marginTop: '1px' }}>
                  {c.value}
                </div>
              </div>
            </div>
            {c.tag}
          </div>
        ))}
      </div>

      {/* ── Chart + Reports — 2 columns ── */}
      <div className="chart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Risk Score Line Chart */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ color: 'var(--text-3)' }}><TrendIcon /></span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-1)' }}>Risk Score History</span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-4)', marginTop: '2px' }}>Last 7 months</div>
            </div>
            <div style={{
              fontSize: '11px', fontWeight: '700',
              background: 'var(--red-light)', color: 'var(--red)',
              border: '1px solid var(--red-border)',
              padding: '3px 10px', borderRadius: '6px',
            }}>
              Peak: 22
            </div>
          </div>
          {mounted && <RiskChart />}
        </div>

        {/* Recent Reports */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ color: 'var(--text-3)' }}><ListIcon /></span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-1)' }}>Recent Reports</span>
            </div>
            <button
              style={{ fontSize: 'var(--text-xs)', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '600' }}
            >
              View all →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {mockReports.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', padding: '10px 8px',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  borderBottom: i < mockReports.length - 1 ? '1px solid var(--border-faint)' : 'none',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: riskDot(r.riskLevel), marginRight: '12px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-1)' }}>{r.date}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                    {r.symptoms.join(', ')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: riskColor(r.riskLevel) }}>{r.score}</span>
                  <span className={`badge badge-${r.riskLevel.toLowerCase()}`}>{r.riskLevel}</span>
                  <span style={{ color: 'var(--text-4)' }}><ChevronRight /></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-4)' }}>
          SymptoSense v1.0.4 &nbsp;·&nbsp; Last sync: 2 mins ago
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-4)', background: 'var(--border-faint)', padding: '3px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
          Flask · PostgreSQL · Next.js
        </span>
      </div>
    </div>
  );
}
