'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useApp } from '../context/AppContext';

interface Report {
  id: string;
  createdAt: string;
  score: number;
  urgency: string;
  primaryCategory: string;
  answers: string;
}

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
const W = 340, H = 88, PAD = { l: 28, r: 10, t: 8, b: 22 };

function RiskChart({ data }: { data: { m: string; v: number }[] }) {
  if (data.length < 2) return (
    <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', fontSize: '13px' }}>
      Complete more tests to see your history
    </div>
  );
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const maxV = Math.max(...data.map(d => d.v), 10);
  const pts = data.map((d, i) => ({
    x: PAD.l + (i / (data.length - 1)) * iW,
    y: PAD.t + (1 - d.v / maxV) * iH,
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
      {[0, Math.round(maxV/3), Math.round(maxV*2/3), maxV].map(v => {
        const y = PAD.t + (1 - v/maxV) * iH;
        return (
          <g key={v}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="var(--border-faint)" strokeWidth="1"/>
            <text x={PAD.l-5} y={y+3.5} fontSize="8" fill="var(--text-4)" textAnchor="end" fontFamily="Inter,sans-serif">{v}</text>
          </g>
        );
      })}
      <path d={area} fill="url(#rg)"/>
      <path d={line} fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="var(--red)" stroke="white" strokeWidth="1.5"/>
          <text x={p.x} y={H-4} fontSize="8" fill="var(--text-4)" textAnchor="middle" fontFamily="Inter,sans-serif">{p.m}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Risk helpers ──

export default function Dashboard() {
  const { startTest } = useApp();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  // Fetch real reports from DB
  useEffect(() => {
    const userId = (session?.user as any)?.id;
    if (!userId) return;
    fetch(`/api/sessions?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => { setReports(Array.isArray(data) ? data : []); })
      .catch(() => setReports([]))
      .finally(() => setLoadingReports(false));
  }, [session]);

  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'there';
  const userImage = session?.user?.image || null;
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const lastReport = reports[0];
  const lastScore = lastReport?.score ?? null;
  const lastUrgency = lastReport?.urgency ?? null;
  const lastDate = lastReport ? new Date(lastReport.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  // Build chart data from real reports (last 7)
  const chartData = reports.slice(0, 7).reverse().map((r) => ({
    m: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short' }),
    v: r.score ?? 0,
  }));
  const peakScore = reports.length > 0 ? Math.max(...reports.map((r) => r.score ?? 0)) : 0;

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

  const urgencyColor = (u: string) => u === 'High' ? 'var(--red)' : u === 'Medium' ? '#B45309' : '#15803D';
  const urgencyDot = (u: string) => u === 'High' ? 'var(--red)' : u === 'Medium' ? '#F59E0B' : '#22C55E';

  return (
    <div className="mobile-padding" style={{ padding: '28px 32px', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: '800', color: 'var(--text-1)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            {greeting}, {userName}
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', marginTop: '4px' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {userImage ? (
          <Image src={userImage} alt={userName} width={38} height={38} style={{ borderRadius: '50%', objectFit: 'cover' }} unoptimized />
        ) : (
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '12px', boxShadow: '0 2px 6px rgb(185 28 28 / 0.3)' }}>{initials}</div>
        )}
      </div>

      {/* ── Alert banner — only show if last test was High ── */}
      {lastUrgency === 'High' && (
        <div className="alert-high" style={{ marginBottom: '22px' }}>
          <AlertTriangle />
          <span>
            <strong>High Risk Detected.</strong> Your last triage score was {lastScore} — please seek medical attention.
          </span>
        </div>
      )}

      {/* ── Start Test card ── */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: '20px', background: 'white' }}>
        <div className="mobile-column" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '4px' }}>
              Ready to assess your symptoms?
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', marginBottom: '10px' }}>
              Complete 8 targeted questions for an AI-powered triage result.
            </div>
          </div>
          <button id="start-test-btn" className="btn btn-primary" onClick={startTest} style={{ padding: '11px 22px', fontSize: '14px', flexShrink: 0 }}>
            <PlayCircle /> Start Test
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {[
          {
            icon: <UserIcon />, iconColor: '#6366F1', iconBg: '#EEF2FF',
            label: 'Active Profile', value: userName,
            tag: <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#15803D', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '2px 9px', borderRadius: '999px' }}>Primary</span>,
          },
          {
            icon: <ClockIcon />, iconColor: 'var(--red)', iconBg: 'var(--red-light)',
            label: 'Last Test', value: lastDate ?? 'No tests yet',
            tag: lastUrgency ? <span className={`badge badge-${lastUrgency.toLowerCase()}`}>{lastUrgency} Risk · {lastScore}</span> : <span style={{ fontSize: '11.5px', color: 'var(--text-4)' }}>—</span>,
          },
          {
            icon: <CalendarIcon />, iconColor: '#B45309', iconBg: '#FFFBEB',
            label: 'Total Tests', value: `${reports.length} test${reports.length !== 1 ? 's' : ''}`,
            tag: <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '2px 9px', borderRadius: '999px' }}>{reports.length === 0 ? 'Start your first' : 'View history'}</span>,
          },
        ].map((c, i) => (
          <div key={i} className="card card-lift" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-sm)', background: c.iconBg, color: c.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {c.icon}
              </div>
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-1)', marginTop: '1px' }}>{c.value}</div>
              </div>
            </div>
            {c.tag}
          </div>
        ))}
      </div>

      {/* ── Chart + Reports ── */}
      <div className="chart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ color: 'var(--text-3)' }}><TrendIcon /></span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-1)' }}>Risk Score History</span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-4)', marginTop: '2px' }}>Last {chartData.length} tests</div>
            </div>
            {peakScore > 0 && (
              <div style={{ fontSize: '11px', fontWeight: '700', background: 'var(--red-light)', color: 'var(--red)', border: '1px solid var(--red-border)', padding: '3px 10px', borderRadius: '6px' }}>
                Peak: {peakScore}
              </div>
            )}
          </div>
          {mounted && <RiskChart data={chartData} />}
        </div>

        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ color: 'var(--text-3)' }}><ListIcon /></span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-1)' }}>Recent Reports</span>
            </div>
          </div>

          {loadingReports ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-4)', fontSize: '13px' }}>Loading...</div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-4)', fontSize: '13px' }}>
              No tests yet. Start your first assessment!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {reports.slice(0, 5).map((r, i) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', borderBottom: i < Math.min(reports.length, 5) - 1 ? '1px solid var(--border-faint)' : 'none' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: urgencyDot(r.urgency), marginRight: '12px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-1)' }}>
                      {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-4)', marginTop: '1px' }}>{r.primaryCategory || 'General'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: urgencyColor(r.urgency) }}>{r.score}</span>
                    <span className={`badge badge-${r.urgency?.toLowerCase()}`}>{r.urgency}</span>
                    <span style={{ color: 'var(--text-4)' }}><ChevronRight /></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-4)' }}>SymptoSense · {reports.length} total assessments</span>
        <span style={{ fontSize: '11px', color: 'var(--text-4)', background: 'var(--border-faint)', padding: '3px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
          Next.js · PostgreSQL
        </span>
      </div>
    </div>
  );
}
