'use client';

import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/app/components/AppShell';

interface Stats {
  predictionCount: number;
  predictionCountToday: number;
  mlUnavailableRate: number;
  avgLatencyMs: number;
  avgConfidence: number;
  followUpTotal: number;
  followUpResponded: number;
  followUpDuePending: number;
}

interface DriftEntry {
  feature: string;
  train_mean: number;
  train_std: number;
  live_mean: number;
  z: number;
  flagged: boolean;
}

interface MlReport {
  createdAt?: string;
  rows_synthetic?: number;
  rows_real?: number;
  rows_real_used?: number;
  rows_real_skipped?: number;
  candidate?: { r2: number; mae: number };
  champion?: { r2: number; mae: number } | null;
  gate?: { passed: boolean; failed: string[] };
  promoted?: boolean;
  drift?: DriftEntry[];
  note?: string;
  error?: string;
  champion_error?: string;
}

function Card({ title, value, sub, tone }: { title: string; value: string; sub?: string; tone?: 'green' | 'amber' | 'red' }) {
  const color = tone === 'green' ? '#15803D' : tone === 'amber' ? '#B45309' : tone === 'red' ? '#DC2626' : 'var(--text-1)';
  return (
    <div className="card" style={{ padding: '18px 20px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-4)', marginBottom: '6px' }}>{title}</div>
      <div style={{ fontSize: '24px', fontWeight: '900', color, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-4)', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

export default function ModelHealthPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [report, setReport] = useState<MlReport | null>(null);
  const [error, setError] = useState('');
  const [retraining, setRetraining] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (): Promise<MlReport | null> => {
    try {
      const res = await fetch('/api/model-health');
      if (res.status === 401 || res.status === 403) {
        setError('You do not have access to this page.');
        return null;
      }
      if (!res.ok) {
        setError('Failed to load model health.');
        return null;
      }
      const data = await res.json();
      setStats(data.stats);
      setReport(data.mlReport);
      setLastUpdated(new Date());
      setError('');
      return data.mlReport as MlReport | null;
    } catch {
      setError('Failed to load model health.');
      return null;
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(() => load(), 60000);
    return () => clearInterval(iv);
  }, [load]);

  const runRetrain = async () => {
    setRetraining(true);
    setError('');
    try {
      const res = await fetch('/api/model-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retrain' }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError('Retraining failed to start: ' + (data.detail || res.status));
        setRetraining(false);
        return;
      }
      const prevCreatedAt = report?.createdAt || '';
      let polls = 0;
      const iv = setInterval(async () => {
        polls += 1;
        const newReport = await load();
        if (newReport?.createdAt && newReport.createdAt !== prevCreatedAt) {
          clearInterval(iv);
          setRetraining(false);
        } else if (polls >= 12) {
          clearInterval(iv);
          setRetraining(false);
        }
      }, 5000);
    } catch {
      setError('Retraining failed to start.');
      setRetraining(false);
    }
  };

  const flaggedDrift = (report?.drift || []).filter((d) => d.flagged);
  const drift = report?.drift || [];
  const maxAbsZ = Math.max(1, ...drift.map((d) => Math.abs(d.z)));

  return (
    <AppShell>
      <div className="mobile-padding" style={{ padding: '28px 24px', minHeight: '100%', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-1)', margin: 0, letterSpacing: '-0.5px' }}>Model Health</h1>
                <span
                  className="badge"
                  style={{
                    background: report ? 'rgba(16,185,129,0.1)' : '#F1F5F9',
                    color: report ? '#059669' : '#64748B',
                    border: `1px solid ${report ? 'rgba(16,185,129,0.35)' : '#E2E8F0'}`,
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                  }}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: report ? '#10B981' : '#94A3B8', animation: report ? 'pulseDot 1.6s infinite' : 'none' }} />
                  {report ? 'Retraining loop active' : 'Waiting for first retrain'}
                </span>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-4)', margin: '4px 0 0 0' }}>
                Live data feeding the continuous retraining loop.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {lastUpdated && (
                <span style={{ fontSize: '11.5px', color: 'var(--text-4)' }}>Updated {lastUpdated.toLocaleTimeString()}</span>
              )}
              <button className="btn btn-primary" onClick={runRetrain} disabled={retraining} style={{ fontSize: '13px', padding: '10px 18px' }}>
                {retraining ? 'Retraining…' : 'Run retrain now'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: '#FFF5F5', border: '1.5px solid #FECACA', color: '#DC2626', borderRadius: '12px', padding: '12px 16px', fontSize: '13px' }}>{error}</div>
          )}

          {!stats && !error && <div style={{ fontSize: '13px', color: 'var(--text-4)' }}>Loading…</div>}

          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
              <Card title="Predictions" value={String(stats.predictionCount)} sub={`${stats.predictionCountToday} today`} />
              <Card title="ML unavailable" value={`${stats.mlUnavailableRate}%`} tone={stats.mlUnavailableRate > 5 ? 'amber' : 'green'} />
              <Card title="Avg latency" value={`${stats.avgLatencyMs}ms`} />
              <Card title="Avg confidence" value={stats.avgConfidence ? Math.round(stats.avgConfidence * 100) + '%' : '—'} />
              <Card title="Follow-ups" value={String(stats.followUpTotal)} sub={`${stats.followUpResponded} responded`} tone={stats.followUpDuePending > 0 ? 'amber' : 'green'} />
              <Card title="Due pending" value={String(stats.followUpDuePending)} sub="check-ins awaiting response" />
            </div>
          )}

          {report && report.candidate && (
            <div className="card" style={{ padding: '20px 24px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-1)', margin: 0 }}>Latest retrain</h3>
                {report.createdAt && (
                  <span style={{ fontSize: '11.5px', color: 'var(--text-4)' }}>{new Date(report.createdAt).toLocaleString()}</span>
                )}
              </div>
              {report.promoted !== undefined && (
                <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: '800', padding: '4px 12px', borderRadius: '999px', marginBottom: '12px', color: '#fff', background: report.promoted ? '#15803D' : '#B45309' }}>
                  {report.promoted ? 'PROMOTED' : 'KEPT PREVIOUS MODEL'}
                </span>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                <Card title="Candidate R²" value={report.candidate.r2.toFixed(3)} />
                <Card title="Candidate MAE" value={report.candidate.mae.toFixed(4)} />
                {report.champion ? (
                  <>
                    <Card title="Champion R²" value={report.champion.r2.toFixed(3)} />
                    <Card title="Champion MAE" value={report.champion.mae.toFixed(4)} />
                  </>
                ) : (
                  <Card title="Champion" value="None" sub="first training run" />
                )}
                <Card title="Real rows" value={String(report.rows_real_used ?? report.rows_real ?? 0)} sub={`${report.rows_synthetic ?? 0} synthetic`} />
              </div>
              {report.champion_error && (
                <p style={{ fontSize: '11.5px', color: '#B45309', margin: '0 0 6px 0' }}>Champion could not be loaded: {report.champion_error}</p>
              )}
              {report.note && <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>{report.note}</p>}
              {report.gate && !report.gate.passed && (
                <div style={{ marginTop: '10px', fontSize: '12.5px', color: '#DC2626' }}>
                  {report.gate.failed.map((f: string, i: number) => (
                    <div key={i}>• {f}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {drift.length > 0 && (
            <div className="card" style={{ padding: '20px 24px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-1)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Feature drift
                  {flaggedDrift.length > 0 && (
                    <span className="badge" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                      {flaggedDrift.length} flagged
                    </span>
                  )}
                </h3>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 12px 0' }}>
                z &gt; 2 between live predictions and the training distribution suggests new population patterns.
              </p>
              <div style={{ fontSize: '12.5px' }}>
                {drift.map((d) => (
                  <div key={d.feature} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: '1px solid var(--border-faint)' }}>
                    <span style={{ flex: '1 1 auto', fontWeight: d.flagged ? '700' : '500', color: d.flagged ? '#DC2626' : 'var(--text-2)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.feature.replace(/_/g, ' ')}
                    </span>
                    <div style={{ flex: '0 0 120px', height: '6px', borderRadius: '999px', background: '#E5E7EB', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '999px', width: `${Math.min(100, (Math.abs(d.z) / maxAbsZ) * 100)}%`, background: d.flagged ? '#DC2626' : '#94A3B8', transition: 'width 0.4s ease' }} />
                    </div>
                    <span style={{ flex: '0 0 auto', color: 'var(--text-4)', fontVariantNumeric: 'tabular-nums' }}>
                      Δ {d.z > 0 ? '+' : ''}{d.z.toFixed(1)}σ
                    </span>
                    {d.flagged && (
                      <span className="badge" style={{ flex: '0 0 auto', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>drift</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {report && report.error && (
            <div style={{ background: '#FFF5F5', border: '1.5px solid #FECACA', color: '#DC2626', borderRadius: '12px', padding: '12px 16px', fontSize: '13px' }}>
              Last retrain failed: {report.error}
            </div>
          )}

        </div>
      </div>
    </AppShell>
  );
}