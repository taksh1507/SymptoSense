'use client';

import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/app/components/AppShell';
import { retrainMetricCards, type RetrainMetrics } from '@/lib/ml/retrainMetrics';

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
  candidate?: RetrainMetrics;
  champion?: RetrainMetrics | null;
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
    <div className="card [padding:20px_20px] [border-radius:4px]" >
      <div  className="[font-size:var(--text-sm)] [font-weight:600] [text-transform:uppercase] [letter-spacing:0.6px] [color:var(--text-4)] [margin-bottom:8px]">{title}</div>
      <div style={{ color }} className="[font-size:var(--text-xl)] [font-weight:600] [letter-spacing:-0.5px]">{value}</div>
      {sub && <div  className="[font-size:var(--text-sm)] [color:var(--text-4)] [margin-top:4px]">{sub}</div>}
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
      <div className="mobile-padding [padding:28px_24px] [min-height:100%] [background:var(--bg)] [font-family:var(--font)]" >
        <div  className="[max-width:900px] [margin:0_auto] [display:flex] [flex-direction:column] [gap:20px]">

          <div  className="[display:flex] [justify-content:space-between] [align-items:center] [gap:12px] [flex-wrap:wrap]">
            <div>
              <div  className="[display:flex] [align-items:center] [gap:12px] [margin-bottom:4px]">
                <h1  className="[font-size:var(--text-xl)] [font-weight:600] [color:var(--text-1)] [margin:0] [letter-spacing:-0.5px]">Model Health</h1>
                <span
                  className="badge [display:inline-flex] [align-items:center] [gap:4px]"
                  style={{ background: report ? 'rgba(16,185,129,0.1)' : '#F1F5F9', color: report ? '#059669' : '#64748B', border: `1px solid ${report ? 'rgba(16,185,129,0.35)' : '#E2E8F0'}` }}
                >
                  <span style={{ background: report ? '#10B981' : '#94A3B8' }} className="[width:7px] [height:7px] [border-radius:4px]" />
                  {report ? 'Latest retraining report' : 'Waiting for first retrain'}
                </span>
              </div>
              <p  className="[font-size:var(--text-sm)] [color:var(--text-4)] [margin:4px_0_0_0]">
                Live confidence-service activity and independently reviewed outcome retraining.
              </p>
            </div>
            <div  className="[display:flex] [align-items:center] [gap:12px]">
              {lastUpdated && (
                <span  className="[font-size:var(--text-sm)] [color:var(--text-4)]">Updated {lastUpdated.toLocaleTimeString()}</span>
              )}
              <button className="btn btn-primary [font-size:var(--text-sm)] [padding:12px_20px]" onClick={runRetrain} disabled={retraining} >
                {retraining ? 'Retraining…' : 'Run retrain now'}
              </button>
            </div>
          </div>

          {error && (
            <div  className="[background:#FFF5F5] [border:1px_solid_#FECACA] [color:#DC2626] [border-radius:4px] [padding:12px_16px] [font-size:var(--text-sm)]">{error}</div>
          )}

          {!stats && !error && <div  className="[font-size:var(--text-sm)] [color:var(--text-4)]">Loading…</div>}

          {stats && (
            <div  className="[display:grid] [grid-template-columns:repeat(auto-fit,_minmax(170px,_1fr))] [gap:12px]">
              <Card title="Predictions" value={String(stats.predictionCount)} sub={`${stats.predictionCountToday} today`} />
              <Card title="ML unavailable" value={`${stats.mlUnavailableRate}%`} tone={stats.mlUnavailableRate > 5 ? 'amber' : 'green'} />
              <Card title="Avg latency" value={`${stats.avgLatencyMs}ms`} />
              <Card title="Avg model score" value={stats.avgConfidence ? Math.round(stats.avgConfidence * 100) + '%' : '—'} />
              <Card title="Follow-ups" value={String(stats.followUpTotal)} sub={`${stats.followUpResponded} responded`} tone={stats.followUpDuePending > 0 ? 'amber' : 'green'} />
              <Card title="Due pending" value={String(stats.followUpDuePending)} sub="check-ins awaiting response" />
            </div>
          )}

          {report && report.candidate && (
            <div className="card [padding:20px_24px] [border-radius:4px]" >
              <div  className="[display:flex] [justify-content:space-between] [align-items:center] [flex-wrap:wrap] [gap:8px] [margin-bottom:12px]">
                <h3  className="[font-size:var(--text-base)] [font-weight:600] [color:var(--text-1)] [margin:0]">Latest retrain</h3>
                {report.createdAt && (
                  <span  className="[font-size:var(--text-sm)] [color:var(--text-4)]">{new Date(report.createdAt).toLocaleString()}</span>
                )}
              </div>
              {report.promoted !== undefined && (
                <span style={{ background: report.promoted ? '#15803D' : '#B45309' }} className="[display:inline-block] [font-size:var(--text-sm)] [font-weight:600] [padding:4px_12px] [border-radius:4px] [margin-bottom:12px] [color:var(--surface)]">
                  {report.promoted ? 'PROMOTED' : 'KEPT PREVIOUS MODEL'}
                </span>
              )}
              <div  className="[display:grid] [grid-template-columns:repeat(auto-fit,_minmax(180px,_1fr))] [gap:12px] [margin-bottom:12px]">
                {retrainMetricCards(report.candidate, 'Candidate').map(metric => <Card key={metric.title} title={metric.title} value={metric.value} />)}
                {report.champion ? (
                  <>
                    {retrainMetricCards(report.champion, 'Champion').map(metric => <Card key={metric.title} title={metric.title} value={metric.value} />)}
                  </>
                ) : (
                  <Card title="Champion" value="None" sub="first training run" />
                )}
                <Card title="Real rows" value={String(report.rows_real_used ?? report.rows_real ?? 0)} sub={`${report.rows_synthetic ?? 0} synthetic`} />
              </div>
              {report.champion_error && (
                <p  className="[font-size:var(--text-sm)] [color:#B45309] [margin:0_0_8px_0]">Champion could not be loaded: {report.champion_error}</p>
              )}
              {report.note && <p  className="[font-size:var(--text-sm)] [color:var(--text-4)] [margin:0]">{report.note}</p>}
              {report.gate && !report.gate.passed && (
                <div  className="[margin-top:12px] [font-size:var(--text-sm)] [color:#DC2626]">
                  {report.gate.failed.map((f: string, i: number) => (
                    <div key={i}>• {f}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {drift.length > 0 && (
            <div className="card [padding:20px_24px] [border-radius:4px]" >
              <div  className="[display:flex] [justify-content:space-between] [align-items:center] [flex-wrap:wrap] [gap:8px] [margin-bottom:4px]">
                <h3  className="[font-size:var(--text-base)] [font-weight:600] [color:var(--text-1)] [margin:0] [display:flex] [align-items:center] [gap:8px]">
                  Feature drift
                  {flaggedDrift.length > 0 && (
                    <span className="badge [background:#FEF2F2] [color:#DC2626] [border:1px_solid_#FECACA]" >
                      {flaggedDrift.length} flagged
                    </span>
                  )}
                </h3>
              </div>
              <p  className="[font-size:var(--text-sm)] [color:var(--text-4)] [margin:0_0_12px_0]">
                z &gt; 2 between live predictions and the training distribution suggests new population patterns.
              </p>
              <div  className="[font-size:var(--text-sm)]">
                {drift.map((d) => (
                  <div key={d.feature}  className="[display:flex] [align-items:center] [gap:12px] [padding:8px_0] [border-bottom:1px_solid_var(--border-faint)]">
                    <span style={{ fontWeight: d.flagged ? '700' : '500', color: d.flagged ? '#DC2626' : 'var(--text-2)' }} className="[flex:1_1_auto] [min-width:0] [overflow:hidden] [text-overflow:ellipsis] [white-space:nowrap]">
                      {d.feature.replace(/_/g, ' ')}
                    </span>
                    <div  className="[flex:0_0_120px] [height:6px] [border-radius:4px] [background:#E5E7EB] [overflow:hidden]">
                      <div style={{ width: `${Math.min(100, (Math.abs(d.z) / maxAbsZ) * 100)}%`, background: d.flagged ? '#DC2626' : '#94A3B8' }} className="[height:100%] [border-radius:4px]" />
                    </div>
                    <span  className="[flex:0_0_auto] [color:var(--text-4)] [font-variant-numeric:tabular-nums]">
                      Δ {d.z > 0 ? '+' : ''}{d.z.toFixed(1)}σ
                    </span>
                    {d.flagged && (
                      <span className="badge [flex:0_0_auto] [background:#FEF2F2] [color:#DC2626] [border:1px_solid_#FECACA]" >drift</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {report && report.error && (
            <div  className="[background:#FFF5F5] [border:1px_solid_#FECACA] [color:#DC2626] [border-radius:4px] [padding:12px_16px] [font-size:var(--text-sm)]">
              Last retrain failed: {report.error}
            </div>
          )}

        </div>
      </div>
    </AppShell>
  );
}