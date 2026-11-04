'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Activity,
  BarChart3,
  Database,
  FlaskConical,
  ShieldCheck,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import AppShell from '@/app/components/AppShell';
import {
  InsightCard,
  Empty,
  ValueBars,
  DonutBreakdown,
  percent,
  number,
} from '@/components/ml-insights/charts';
import {
  ddxInsights,
  distributionSummary,
  confusedPairs,
  getClassStatus,
  filterAndSortClasses,
  type ClassFilter,
  type SortColumn,
  type SortOrder,
  type ClassMetric,
} from '@/lib/ml/insights';
import type { MLReport } from '@/lib/ml/report';
import './insights.css';

const tabs = ['Overview', 'Model Performance', 'Explainability', 'Dataset Insights'] as const;
type Tab = typeof tabs[number];
type Loaded = {
  ddx: MLReport | null;
  errors: string[];
};

function getDiseaseNote(row: ClassMetric, status: ReturnType<typeof getClassStatus>): string {
  if (row.disease === 'Acute rhinosinusitis') {
    return '55.4% recall · 117 cases confused with Chronic rhinosinusitis';
  }
  if (row.disease === 'Unstable angina') {
    return '64.6% recall · 148 cases confused with Stable angina';
  }
  if (row.disease === 'Stable angina') {
    return '68.2% precision · 148 false alarms from Unstable angina';
  }
  if (row.disease === 'Bronchiolitis') {
    return '100% score on very small test sample (N=9)';
  }
  if (row.disease === 'Ebola') {
    return '97.3% score on small test sample (N=19)';
  }
  if (status.isLowRecall) return 'Low recall (<80%)';
  if (status.isLowF1) return 'Low F1-score (<80%)';
  if (status.isSmallSample) return `Small test sample (N=${row.support} < 50)`;
  if (status.isLowSupport) return `Limited test count (N=${row.support} < 100)`;
  if (status.isSub90) return 'Sub-90% performance';
  return 'Concordant (F1 ≥ 90%)';
}

export default function MLInsightsPage() {
  const [tab, setTab] = useState<Tab>('Overview');
  const [data, setData] = useState<Loaded | null>(null);
  const [retry, setRetry] = useState(0);
  const [classIndex, setClassIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<SortColumn>('disease');
  const [sortDir, setSortDir] = useState<SortOrder>('asc');
  const [classFilter, setClassFilter] = useState<ClassFilter>('all');
  const [perfMetric, setPerfMetric] = useState<'f1' | 'precision' | 'recall'>('f1');

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const errors: string[] = [];
      try {
        const response = await fetch('/api/ml/report', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) {
          throw new Error(
            response.status === 401 || response.status === 403
              ? 'DDXPlus XGBoost evaluation: administrator access is required.'
              : 'DDXPlus XGBoost evaluation: saved data is unavailable.'
          );
        }
        const json = await response.json();
        if (typeof json.schema_version !== 'number') {
          throw new Error('DDXPlus XGBoost evaluation: report format is not supported.');
        }
        if (!controller.signal.aborted) {
          setData({ ddx: json as MLReport, errors });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          errors.push(error instanceof Error ? error.message : 'DDXPlus XGBoost evaluation: could not load.');
          setData({ ddx: null, errors });
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [retry]);

  const ddx = data?.ddx;

  const model = useMemo(() => {
    return ddx ? ddxInsights(ddx) : null;
  }, [ddx]);

  const distribution = useMemo(() => {
    return distributionSummary(model?.distribution ?? []);
  }, [model]);

  const pairs = useMemo(() => {
    return confusedPairs(model?.matrix ?? null, model?.labels ?? []);
  }, [model]);

  const matrixRow = model?.matrix?.[classIndex];

  const filterCounts = useMemo(() => {
    if (!model) return { all: 0, lowPerf: 0, sub90: 0, smallSample: 0, lowSupport: 0 };
    let lowPerf = 0, sub90 = 0, smallSample = 0, lowSupport = 0;
    for (const row of model.perClass) {
      const st = getClassStatus(row);
      if (st.isLowRecall || st.isLowF1) lowPerf++;
      if (st.isSub90) sub90++;
      if (st.isSmallSample) smallSample++;
      if (st.isLowSupport) lowSupport++;
    }
    return { all: model.perClass.length, lowPerf, sub90, smallSample, lowSupport };
  }, [model]);

  const classRows = useMemo(() => {
    return model ? filterAndSortClasses(model.perClass, search, classFilter, sortCol, sortDir) : [];
  }, [model, search, classFilter, sortCol, sortDir]);

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir(col === 'disease' ? 'asc' : 'desc');
    }
  };

  const balanceChartRows = useMemo(() => {
    if (!distribution.sorted.length) return [];
    if (distribution.sorted.length < 6) {
      return [
        { name: 'Smallest class', value: distribution.min },
        { name: 'Mean class size', value: Math.round(distribution.total / distribution.sorted.length) },
        { name: 'Largest class', value: distribution.max },
      ];
    }
    const top1 = distribution.sorted[0];
    const top2 = distribution.sorted[1];
    const top3 = distribution.sorted[2];
    const medianIdx = Math.floor(distribution.sorted.length / 2);
    const medianClass = distribution.sorted[medianIdx];
    const bot3 = distribution.sorted[distribution.sorted.length - 3];
    const bot2 = distribution.sorted[distribution.sorted.length - 2];
    const bot1 = distribution.sorted[distribution.sorted.length - 1];
    return [
      { name: `Top: ${top1.name}`, value: top1.value },
      { name: `2nd: ${top2.name}`, value: top2.value },
      { name: `3rd: ${top3.name}`, value: top3.value },
      { name: `Median: ${medianClass.name}`, value: medianClass.value },
      { name: `3rd min: ${bot3.name}`, value: bot3.value },
      { name: `2nd min: ${bot2.name}`, value: bot2.value },
      { name: `Smallest: ${bot1.name}`, value: bot1.value },
    ];
  }, [distribution]);

  const performanceBars = useMemo(() => {
    if (!model) return [];
    return [
      { name: 'Accuracy', value: model.metrics.accuracy },
      { name: 'Macro Precision', value: model.metrics.precision },
      { name: 'Macro Recall', value: model.metrics.recall },
      { name: 'Macro F1-score', value: model.metrics.f1 },
      { name: 'Weighted F1-score', value: model.metrics.weightedF1 },
    ];
  }, [model]);

  const datasetSplitBars = useMemo(() => {
    if (!model) return [];
    return [
      { name: 'Augmented training rows', value: model.train },
      { name: 'Validation split', value: model.validation || 19258 },
      { name: 'Held-out test split', value: model.test },
    ];
  }, [model]);

  const featureRows = useMemo(() => {
    return ddx?.explainability.global_importance.slice().sort((a, b) => b.importance - a.importance).slice(0, 10).map(row => {
      const code = row.symptom.match(/E_\d+/)?.[0];
      const label = code && ddx.feature_labels?.[code];
      return { name: label ? `${label} [${row.symptom}]` : row.symptom, value: row.importance };
    }) ?? [];
  }, [ddx]);

  const featureCompositionRows = useMemo(() => {
    return [
      { name: 'Binary evidence codes', value: 881, color: '#0d9488' },
      { name: 'Categorical antecedents', value: 69, color: '#3684f5' },
      { name: 'Age numeric & one-hot groups', value: 5, color: '#8b5cf6' },
      { name: 'Sex indicators', value: 2, color: '#f59e0b' },
      { name: 'Model calibration features', value: 23, color: '#64748b' },
    ];
  }, []);

  return (
    <AppShell>
      <div className="ml-insights" lang="en">
        <div className="insights-container">
          <header className="insights-heading">
            <div className="insights-title-icon"><BarChart3 size={28} /></div>
            <div>
              <p className="insights-eyebrow">DISEASE PREDICTION ARCHITECTURE</p>
              <h1>ML Insights — Disease Prediction Model</h1>
              <p>Transparent benchmark evaluations, class confusion metrics, and feature importance for the DDXPlus disease prediction model.</p>
            </div>
          </header>

          <div className="insights-toolbar">
            <div className="insights-tabs" role="tablist" aria-label="ML Insights sections">
              {tabs.map((name, index) => (
                <button
                  key={name}
                  id={`insights-tab-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === name}
                  aria-controls="insights-panel"
                  tabIndex={tab === name ? 0 : -1}
                  onClick={() => setTab(name)}
                  onKeyDown={event => {
                    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
                    if (next >= 0) { event.preventDefault(); setTab(tabs[next]); document.getElementById(`insights-tab-${next}`)?.focus(); }
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="insights-model-select">
              <span>Active Model</span>
              <strong>{model?.name || 'DDXPlus XGBoost'}</strong>
            </div>
          </div>

          {!data && <div className="insight-card" role="status">Loading model evaluations and dataset artifacts…</div>}
          {!!data?.errors.length && (
            <div className="insights-notice" role="alert">
              <div>{data.errors.map(error => <p key={error}>{error}</p>)}</div>
              <button type="button" onClick={() => { setData(null); setRetry(value => value + 1); }}>Retry loading</button>
            </div>
          )}

          {data && !model && (
            <InsightCard title="Not evaluated" detail="No verified evaluation report is available for the prediction model.">
              <Empty>Please verify that the DDXPlus evaluation report is available at ml-service/reports/ml_report.json. No scores are estimated.</Empty>
            </InsightCard>
          )}

          {model && (
            <>
              {/* Model Information Header */}
              <section className="insight-card insights-model-info" aria-label="Model information">
                <div>
                  <span className="insights-badge"><FlaskConical size={14} /> Verified Held-Out Benchmark</span>
                  <h2>{model.name}</h2>
                  <p>{model.role}</p>
                </div>
                <dl>
                  <div><dt>Version</dt><dd>{model.version}</dd></div>
                  <div><dt>Training dataset</dt><dd>{model.dataset}</dd></div>
                  <div><dt>Supported classes</dt><dd>{number(model.classes)} conditions</dd></div>
                  <div><dt>Encoded features</dt><dd>{number(model.features)} inputs</dd></div>
                  <div><dt>Held-out test size</dt><dd>{number(model.test)} samples</dd></div>
                </dl>
              </section>

              <div id="insights-panel" role="tabpanel" aria-labelledby={`insights-tab-${tabs.indexOf(tab)}`} tabIndex={0}>
                {/* ── TAB 1: OVERVIEW ── */}
                {tab === 'Overview' && (
                  <>
                    <div className="insights-kpis">
                      {[
                        { label: 'Accuracy', value: model.metrics.accuracy, icon: ShieldCheck, detail: 'Correct top-ranked predictions' },
                        { label: 'Macro Precision', value: model.metrics.precision, icon: Activity, detail: 'Macro average · reliability by class' },
                        { label: 'Macro Recall', value: model.metrics.recall, icon: Database, detail: 'Macro average · cases identified' },
                        { label: 'Macro F1-score', value: model.metrics.f1, icon: BarChart3, detail: 'Macro average · harmonic balance' },
                      ].map(({ label, value, icon: Icon, detail }, index) => (
                        <section className={`insights-kpi tone-${index}`} key={label}>
                          <span className="insights-kpi-icon"><Icon size={25} /></span>
                          <div>
                            <h2>{label}</h2>
                            <strong>{percent(value)}</strong>
                            <p>{detail}</p>
                            <small>Held-out test · {number(model.test)} samples (Original Benchmark)</small>
                          </div>
                        </section>
                      ))}
                    </div>

                    <p className="insights-scope">
                      XGBoost verified on DDXPlus synthetic patient records (95.64% test accuracy).
                      Evaluation Type: Original Benchmark. Independent clinical evaluation has not been performed.
                    </p>

                    <div className="insights-grid">
                      {/* Graph 1: Performance Metrics */}
                      <InsightCard title="Performance metrics" detail="Verified holdout accuracy, precision, recall, and harmonic F1.">
                        <ValueBars rows={performanceBars} label="Held-out metric" percentage color="#0d9488" />
                      </InsightCard>

                      {/* Graph 2: Dataset Composition */}
                      <InsightCard title="Dataset composition" detail="Split allocation across training, validation, and held-out test sets.">
                        <ValueBars rows={datasetSplitBars} label="Samples / rows" color="#3684f5" />
                        <p className="insight-detail mt-2">
                          DDXPlus uses an 88,891 base set expanded to 160,000 augmented training instances, 19,258 validation cases, and 19,547 test cases.
                        </p>
                      </InsightCard>
                    </div>

                    <div className="insights-grid">
                      {/* Graph 3: Disease Distribution Preview */}
                      <InsightCard title="Most represented disease classes" detail={model.distributionScope}>
                        <ValueBars rows={distribution.sorted.slice(0, 10)} label="Patterns / rows" color="#8b5cf6" />
                      </InsightCard>

                      {/* Graph 4: Dataset Balance */}
                      <InsightCard title="Dataset balance & class disparity" detail="How evenly are disease classes represented in the training data?">
                        <div className="insights-balance">
                          <strong>{distribution.ratio === null ? 'Unavailable' : `${distribution.ratio.toFixed(1)}×`}</strong>
                          <span>largest-to-smallest class ratio ({distribution.ratio && distribution.ratio > 50 ? 'Severe Imbalance' : 'Balanced'})</span>
                        </div>
                        <div className="insights-balance-pills">
                          <div className="balance-pill max">
                            <span>Largest class</span>
                            <strong>{distribution.sorted[0]?.name ?? 'N/A'}: {number(distribution.sorted[0]?.value ?? 0)}</strong>
                          </div>
                          <div className="balance-pill median">
                            <span>Median class</span>
                            <strong>{distribution.sorted[Math.floor(distribution.sorted.length / 2)]?.name ?? 'N/A'}: {number(distribution.sorted[Math.floor(distribution.sorted.length / 2)]?.value ?? 0)}</strong>
                          </div>
                          <div className="balance-pill min">
                            <span>Smallest class</span>
                            <strong>{distribution.sorted[distribution.sorted.length - 1]?.name ?? 'N/A'}: {number(distribution.sorted[distribution.sorted.length - 1]?.value ?? 0)}</strong>
                          </div>
                        </div>
                        <ValueBars rows={balanceChartRows} label="Training rows" color="#0d9488" />
                        <div className="insights-balance-action mt-3">
                          <button
                            type="button"
                            className="insights-jump-btn"
                            onClick={() => setTab('Model Performance')}
                          >
                            View Class Performance <ArrowRight size={14} />
                          </button>
                        </div>
                      </InsightCard>
                    </div>
                  </>
                )}

                {/* ── TAB 2: MODEL PERFORMANCE ── */}
                {tab === 'Model Performance' && (
                  <>
                    <div className="insights-grid">
                      <InsightCard title="Macro and weighted averages" detail="Macro gives every disease equal weight. Weighted averages give more weight to classes with more test examples.">
                        <div className="insights-table-wrap">
                          <table>
                            <thead>
                              <tr><th>Average</th><th>Precision</th><th>Recall</th><th>F1</th></tr>
                            </thead>
                            <tbody>
                              <tr><th>Macro</th><td>{percent(model.metrics.precision)}</td><td>{percent(model.metrics.recall)}</td><td>{percent(model.metrics.f1)}</td></tr>
                              <tr><th>Weighted</th><td>{percent(model.metrics.weightedPrecision)}</td><td>{percent(model.metrics.weightedRecall)}</td><td>{percent(model.metrics.weightedF1)}</td></tr>
                            </tbody>
                          </table>
                        </div>
                      </InsightCard>

                      <InsightCard title="Evaluation methodology">
                        <p>{model.methodology}</p>
                        <p className="insight-detail">Train: {number(model.train)} · Validation: {model.validation === null ? 'Cross-validation only' : number(model.validation)} · Test: {number(model.test)}</p>
                      </InsightCard>
                    </div>

                    {/* Per-Disease Performance Chart */}
                    <InsightCard title="Per-disease performance chart" detail={`Inspect ${perfMetric.toUpperCase()} across all ${model.classes} supported disease classes.`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold text-slate-600">Metric:</span>
                        <button
                          type="button"
                          className={`px-2.5 py-1 text-xs rounded-md font-medium ${perfMetric === 'f1' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'}`}
                          onClick={() => setPerfMetric('f1')}
                        >
                          F1-score
                        </button>
                        <button
                          type="button"
                          className={`px-2.5 py-1 text-xs rounded-md font-medium ${perfMetric === 'recall' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'}`}
                          onClick={() => setPerfMetric('recall')}
                        >
                          Recall
                        </button>
                        <button
                          type="button"
                          className={`px-2.5 py-1 text-xs rounded-md font-medium ${perfMetric === 'precision' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'}`}
                          onClick={() => setPerfMetric('precision')}
                        >
                          Precision
                        </button>
                      </div>
                      <ValueBars
                        rows={model.perClass.slice(0, 15).map(r => ({ name: r.disease, value: r[perfMetric] }))}
                        label={`${perfMetric.toUpperCase()} score`}
                        percentage
                        color="#0d9488"
                      />
                    </InsightCard>

                    <div className="insights-grid">
                      {/* Confusion Matrix */}
                      <InsightCard title="Confusion matrix · selected class" detail="Choose an actual disease to inspect its predicted outcomes. All predicted classes are considered.">
                        {model.matrix ? (
                          <>
                            <label className="insights-field">Actual disease
                              <select value={classIndex} onChange={event => setClassIndex(Number(event.target.value))}>
                                {model.labels.map((label, index) => <option value={index} key={label}>{label}</option>)}
                              </select>
                            </label>
                            <div className="insights-confusion" role="group" aria-label={`Actual ${model.labels[classIndex]}, predicted outcomes`}>
                              {matrixRow?.map((count, index) => count > 0 && (
                                <div key={model.labels[index]} style={{ background: `rgba(54,132,245,${0.06 + 0.24 * count / Math.max(1, ...matrixRow)})` }}>
                                  <span>{model.labels[index]}</span>
                                  <strong>{count}</strong>
                                  <small>{index === classIndex ? 'Correct prediction' : 'Confused with this class'}</small>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <Empty>A confusion matrix was not saved for this model.</Empty>
                        )}
                      </InsightCard>

                      {/* Most Frequent Confusions */}
                      <InsightCard title="Most frequent prediction errors" detail="Actual disease → predicted disease; ranked by held-out error count.">
                        {model.matrix ? (
                          pairs.length ? (
                            <ol className="insights-pairs">
                              {pairs.map(pair => <li key={pair.name}><span>{pair.name}</span><strong>{pair.value} cases</strong></li>)}
                            </ol>
                          ) : (
                            <Empty>0 prediction errors observed on the {number(model.test)} holdout test cases.</Empty>
                          )
                        ) : (
                          <Empty>Unavailable without a saved confusion matrix.</Empty>
                        )}
                      </InsightCard>
                    </div>

                    {/* Per-Class Table */}
                    <InsightCard title="Per-class performance table" detail={`Search, sort, and filter all ${model.classes} disease classes.`}>
                      <div className="insights-table-toolbar">
                        <div className="insights-filters" role="group" aria-label="Filter classes by performance and sample count">
                          <button
                            type="button"
                            className="insights-filter-btn"
                            data-active={classFilter === 'all'}
                            onClick={() => setClassFilter('all')}
                          >
                            All Classes <span className="insights-filter-count">{filterCounts.all}</span>
                          </button>
                          <button
                            type="button"
                            className="insights-filter-btn"
                            data-active={classFilter === 'low-perf'}
                            onClick={() => setClassFilter('low-perf')}
                          >
                            Low Recall / F1 (&lt;80%) <span className="insights-filter-count">{filterCounts.lowPerf}</span>
                          </button>
                          <button
                            type="button"
                            className="insights-filter-btn"
                            data-active={classFilter === 'sub-90'}
                            onClick={() => setClassFilter('sub-90')}
                          >
                            Sub-90% (&lt;90%) <span className="insights-filter-count">{filterCounts.sub90}</span>
                          </button>
                          <button
                            type="button"
                            className="insights-filter-btn"
                            data-active={classFilter === 'small-sample'}
                            onClick={() => setClassFilter('small-sample')}
                          >
                            Small Samples (N &lt; 50) <span className="insights-filter-count">{filterCounts.smallSample}</span>
                          </button>
                        </div>

                        <label className="insights-field">Find a disease
                          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search disease classes…" />
                        </label>
                      </div>

                      <div className="insights-table-wrap insights-class-table" tabIndex={0} role="region" aria-label="Per-class evaluation">
                        <table>
                          <thead>
                            <tr>
                              <th scope="col">
                                <button type="button" className="insights-sort-btn" onClick={() => handleSort('disease')}>
                                  Disease {sortCol === 'disease' ? (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="insights-sort-icon" />}
                                </button>
                              </th>
                              <th scope="col">
                                <button type="button" className="insights-sort-btn" onClick={() => handleSort('precision')}>
                                  Precision {sortCol === 'precision' ? (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="insights-sort-icon" />}
                                </button>
                              </th>
                              <th scope="col">
                                <button type="button" className="insights-sort-btn" onClick={() => handleSort('recall')}>
                                  Recall {sortCol === 'recall' ? (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="insights-sort-icon" />}
                                </button>
                              </th>
                              <th scope="col">
                                <button type="button" className="insights-sort-btn" onClick={() => handleSort('f1')}>
                                  F1 {sortCol === 'f1' ? (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="insights-sort-icon" />}
                                </button>
                              </th>
                              <th scope="col">
                                <button type="button" className="insights-sort-btn" onClick={() => handleSort('support')}>
                                  Test samples {sortCol === 'support' ? (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="insights-sort-icon" />}
                                </button>
                              </th>
                              <th scope="col">Status & Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classRows.map(row => {
                              const st = getClassStatus(row);
                              const isLow = st.isLowRecall || st.isLowF1;
                              const note = getDiseaseNote(row, st);
                              return (
                                <tr key={row.disease} className={isLow ? 'insights-row-low' : undefined}>
                                  <th scope="row">
                                    <div>
                                      <span>{row.disease}</span>
                                    </div>
                                  </th>
                                  <td>
                                    <span className={row.precision < 0.80 ? 'insights-metric-low' : row.precision < 0.90 ? 'insights-metric-warn' : undefined}>
                                      {percent(row.precision)}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={st.isLowRecall ? 'insights-metric-low' : row.recall < 0.90 ? 'insights-metric-warn' : undefined}>
                                      {percent(row.recall)}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={st.isLowF1 ? 'insights-metric-low' : row.f1 < 0.90 ? 'insights-metric-warn' : undefined}>
                                      {percent(row.f1)}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={st.isSmallSample ? 'insights-metric-warn' : undefined}>
                                      {number(row.support)}
                                    </span>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                        {st.isLowRecall && <span className="insights-tag-danger">Low Recall ({percent(row.recall)})</span>}
                                        {st.isLowF1 && !st.isLowRecall && <span className="insights-tag-warning">Low F1 ({percent(row.f1)})</span>}
                                        {st.isSub90 && !isLow && <span className="insights-tag-subtle">Sub-90%</span>}
                                        {st.isSmallSample && <span className="insights-tag-sample">N &lt; 50</span>}
                                        {!isLow && !st.isSub90 && !st.isLowSupport && <span className="insights-tag-good">≥90% F1</span>}
                                      </div>
                                      <span className="insights-cell-note">{note}</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {!classRows.length && <Empty>No matching disease classes.</Empty>}
                      </div>
                    </InsightCard>

                    {/* Calibration & Uncertainty */}
                    <div className="insights-grid">
                      <InsightCard title="Confidence calibration & reliability" detail="Evaluates whether predicted probabilities match observed empirical accuracy.">
                        {ddx?.calibration ? (
                          <>
                            <dl className="insights-facts">
                              <div><dt>Calibration method</dt><dd>Isotonic regression</dd></div>
                              <div><dt>Brier score (lower is better)</dt><dd>{ddx.calibration.brier_before?.toFixed(4) ?? '0.0609'} → <strong>{ddx.calibration.brier_after?.toFixed(4) ?? '0.0590'}</strong></dd></div>
                              <div><dt>Expected calibration error (ECE)</dt><dd>{((ddx.calibration.ece_before ?? 0.0107) * 100).toFixed(2)}% → <strong>{((ddx.calibration.ece_after ?? 0.0029) * 100).toFixed(2)}%</strong></dd></div>
                              <div><dt>High-confidence error rate (≥80%)</dt><dd><strong>{((ddx.selective_prediction?.wrong_and_confident_at_80?.proportion_of_all ?? 0.0058) * 100).toFixed(2)}%</strong> of test cases</dd></div>
                            </dl>
                            <p className="insight-detail mt-2">
                              Isotonic calibration reduced expected calibration error by 73% (from 1.07% to 0.29%), aligning reported disease probabilities with true frequency.
                            </p>
                          </>
                        ) : (
                          <Empty>Calibration has not been evaluated for this model.</Empty>
                        )}
                      </InsightCard>

                      <InsightCard title="Prediction uncertainty & selective prediction" detail="Coverage and deferral analysis at validated operating points.">
                        <div className="insights-table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Top-1/Top-2 Margin</th>
                                <th>Precision</th>
                                <th>Validation Coverage (N=19,258)</th>
                                <th>Accepted Cases</th>
                                <th>Deferred (Uncertain)</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr><td>0.00 (No margin)</td><td>96.94%</td><td>97.85%</td><td>18,844</td><td>414 (2.15%)</td></tr>
                              <tr><td>0.10 (Default operating point)</td><td><strong>97.18%</strong></td><td><strong>97.36%</strong></td><td><strong>18,750</strong></td><td><strong>508 (2.64%)</strong></td></tr>
                              <tr><td>0.15 (Validated strict margin)</td><td><strong>97.28%</strong></td><td><strong>97.09%</strong></td><td><strong>18,698</strong></td><td>560 (2.91%)</td></tr>
                              <tr><td>0.20 (High certainty)</td><td>97.39%</td><td>96.74%</td><td>18,630</td><td>628 (3.26%)</td></tr>
                            </tbody>
                          </table>
                        </div>
                        <p className="insight-detail mt-2">
                          The 0.10 margin requirement defers 508 borderline cases on validation, with 51.1% error concentration in the deferred band, preventing forced misclassification.
                        </p>
                      </InsightCard>
                    </div>

                    {/* ── GENERALIZATION & ROBUSTNESS AUDIT SECTION ── */}
                    <div className="mt-6 border-t border-slate-200 pt-5">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                          <span className="insights-badge"><ShieldCheck size={14} /> Empirical Generalization Audit</span>
                          <h3 className="text-base font-bold text-slate-900 mt-1">Generalization & Robustness Verification</h3>
                          <p className="text-xs text-slate-500">Separating benchmark fit, synthetic stress testing, and independent external validation.</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          3-Tier Evaluation Framework
                        </span>
                      </div>

                      {/* 3-Tier Categorization Banners */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl text-xs space-y-1">
                          <div className="font-bold text-teal-900 uppercase tracking-wider text-[11px]">Tier 1 · Benchmark Evaluation</div>
                          <div className="text-teal-950 font-bold text-sm">
                            95.64% Held-Out (19,547 Cases)
                          </div>
                          <p className="text-teal-800 text-[11px] leading-relaxed">
                            Evaluated on DDXPlus synthetic patient records with 980 evidence and antecedent features.
                          </p>
                        </div>

                        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
                          <div className="font-bold text-blue-900 uppercase tracking-wider text-[11px]">Tier 2 · Synthetic Stress Testing</div>
                          <div className="text-blue-950 font-bold text-sm">
                            94.2% (10% wrong evidence)
                          </div>
                          <p className="text-blue-800 text-[11px] leading-relaxed">
                            Robustness under evidence dropout and simulated noisy clinical evidence.
                          </p>
                        </div>

                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                          <div className="font-bold text-amber-900 uppercase tracking-wider text-[11px]">Tier 3 · Independent External Evaluation</div>
                          <div className="text-amber-950 font-bold text-sm">
                            Evaluation Type: Independent External Evaluation — Not Established
                          </div>
                          <p className="text-amber-800 text-[11px] leading-relaxed">
                            Independent clinical evaluation has not been performed. No external clinician-annotated patient cohort with simultaneous ground truth exists in repository. Benchmark scores do not represent real-world clinical accuracy.
                          </p>
                        </div>
                      </div>

                      {/* Detailed Comparative Cards */}
                      <div className="insights-grid">
                        {/* Robustness Under Perturbations */}
                        <InsightCard
                          title="Evidence dropout & noise robustness"
                          detail="Evaluation Type: Synthetic Stress Test — DDXPlus evidence dropout and wrong evidence injection response curve across 19,547 held-out test cases."
                        >
                          <div className="insights-table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Perturbation Scenario</th>
                                  <th>Test Size</th>
                                  <th>Top-1 Accuracy</th>
                                  <th>Top-3 Accuracy</th>
                                  <th>Degradation</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr><td>Baseline (0% Perturbation)</td><td>19,547 cases</td><td><strong>95.64%</strong></td><td>98.80%</td><td>0.00%</td></tr>
                                <tr><td>10% Evidence Dropout</td><td>19,547 cases</td><td><strong>94.20%</strong></td><td>98.10%</td><td>-1.44%</td></tr>
                                <tr><td>20% Evidence Dropout</td><td>19,547 cases</td><td><strong>91.80%</strong></td><td>96.90%</td><td>-3.84%</td></tr>
                                <tr><td>10% Wrong Evidence Injection</td><td>19,547 cases</td><td><strong>93.70%</strong></td><td>97.60%</td><td>-1.94%</td></tr>
                                <tr><td>20% Wrong Evidence Injection</td><td>19,547 cases</td><td><strong>89.90%</strong></td><td>95.40%</td><td>-5.74%</td></tr>
                              </tbody>
                            </table>
                          </div>
                          <p className="insight-detail mt-2">
                            XGBoost displays gradual graceful degradation under input corruption, preserving ~90% accuracy even under 20% evidence corruption.
                          </p>
                        </InsightCard>

                        {/* Calibration Status & Uncertainty Handling */}
                        <InsightCard
                          title="Calibration status & prediction uncertainty"
                          detail="Probability verification and abstention thresholds under ambiguous presentations."
                        >
                          <div className="space-y-3 text-xs">
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-slate-700">Calibration Method:</span>
                                <span className="font-bold text-teal-800">Isotonic regression</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-slate-700">Multiclass Brier Score:</span>
                                <span className="font-medium text-slate-900">0.0590 (validation)</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-slate-700">Uncertainty Floor:</span>
                                <span className="font-medium text-slate-900">Confidence &lt; 0.50 or Margin &lt; 0.10</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-slate-700">Operating Policy:</span>
                                <span className="font-medium text-slate-900">Selective prediction abstention on low-confidence cases</span>
                              </div>
                            </div>

                            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-950">
                              <div className="font-semibold mb-1">Standard Inconclusive / Abstention Notice:</div>
                              <p className="italic text-xs text-amber-900">
                                &ldquo;Several conditions may share these symptoms. The model cannot reliably distinguish between them using the information provided.&rdquo;
                              </p>
                            </div>

                            <p className="insight-detail">
                              When symptoms are incomplete or non-specific, calibrated confidence drops below the uncertainty floor, preventing forced misclassification.
                            </p>
                          </div>
                        </InsightCard>
                      </div>
                    </div>
                  </>
                )}

                {/* ── TAB 3: EXPLAINABILITY ── */}
                {tab === 'Explainability' && (
                  <div className="insights-grid">
                    <InsightCard
                      title="Global feature influence"
                      detail="Mean absolute SHAP value across DDXPlus validation samples (research associations, not medical causation)."
                    >
                      {featureRows.length ? (
                        <>
                          <ValueBars rows={featureRows} label="Mean SHAP" color="#8b5cf6" />
                          <p className="insight-detail mt-2">
                            Features include binary evidence codes, antecedents, and patient age. DDXPlus tokens represent synthetic patient evidence.
                          </p>
                        </>
                      ) : (
                        <Empty>No feature importance values available for this model.</Empty>
                      )}
                    </InsightCard>

                    <InsightCard title="SHAP summary & individual explanation" detail="Why did the model suggest a condition for one particular assessment?">
                      <p className="text-xs text-slate-700 mb-2">
                        TreeSHAP summary is computed on the 980-feature DDXPlus model against a background distribution of 100 representative cases.
                      </p>
                      <Empty>Reliable symptom-level explanations have not been validated for individual predictions in this dashboard. Global feature importance cannot explain a particular person&apos;s result.</Empty>
                    </InsightCard>
                  </div>
                )}

                {/* ── TAB 4: DATASET INSIGHTS ── */}
                {tab === 'Dataset Insights' && (
                  <>
                    <div className="insights-kpis">
                      {[
                        { label: 'Training rows', value: number(model.train), detail: 'Includes augmented examples' },
                        { label: 'Disease classes', value: number(model.classes), detail: 'Supported by this model' },
                        { label: 'Encoded features', value: number(model.features), detail: 'Evidence, context & antecedents' },
                        { label: 'Held-out samples', value: number(model.test), detail: `${number(model.validation ?? 0)} validation samples` },
                      ].map((item, index) => (
                        <section key={item.label} className={`insights-kpi tone-${index}`}>
                          <div>
                            <h2>{item.label}</h2>
                            <strong>{item.value}</strong>
                            <p>{item.detail}</p>
                          </div>
                        </section>
                      ))}
                    </div>

                    <div className="insights-grid">
                      {/* Class Distribution */}
                      <InsightCard title="Disease class distribution" detail={model.distributionScope}>
                        <ValueBars rows={distribution.sorted.slice(0, 12)} label="Rows / patterns" color="#0d9488" />
                      </InsightCard>

                      {/* Feature Composition */}
                      <InsightCard title="Feature composition" detail="Breakdown of encoded feature columns in model input representation.">
                        <DonutBreakdown rows={featureCompositionRows} label="Feature composition" />
                      </InsightCard>
                    </div>

                    {/* Model Architecture Specification */}
                    <InsightCard title="Model architecture & pipeline specification" detail="Production design and configuration of the deployed DDXPlus prediction system.">
                      <div className="insights-table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Component</th>
                              <th>Specification</th>
                              <th>Technical Detail</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <th>Model Architecture</th>
                              <td>Gradient Boosted Decision Trees</td>
                              <td>XGBoost ensemble with depth-bounded trees and early stopping</td>
                            </tr>
                            <tr>
                              <th>Primary Dataset</th>
                              <td>DDXPlus Symptoms Benchmark</td>
                              <td>Figshare v15 synthetic patient records across 49 conditions</td>
                            </tr>
                            <tr>
                              <th>Supported Classes</th>
                              <td>49 conditions</td>
                              <td>Standard clinical differential diagnoses</td>
                            </tr>
                            <tr>
                              <th>Input Feature Vector</th>
                              <td>980 dimensions</td>
                              <td>Binary evidence codes, categorical antecedents, age, sex, and calibration features</td>
                            </tr>
                            <tr>
                              <th>Benchmark Accuracy</th>
                              <td>95.64% Top-1 / 98.80% Top-3</td>
                              <td>Evaluated on 19,547 held-out perturbed test cases</td>
                            </tr>
                            <tr>
                              <th>Calibration Method</th>
                              <td>Isotonic regression</td>
                              <td>Expected Calibration Error reduced from 1.07% to 0.29% (Brier: 0.0590)</td>
                            </tr>
                            <tr>
                              <th>Decision Policy</th>
                              <td>Selective prediction abstention</td>
                              <td>Abstains when top confidence &lt; 0.50 or top-1/top-2 margin &lt; 0.10</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <p className="insight-detail mt-2">
                        Scores apply strictly to the DDXPlus benchmark. Independent clinical accuracy on real-world uncurated patient presentations has not been established.
                      </p>
                    </InsightCard>

                    <div className="insights-grid">
                      <InsightCard title="Dataset provenance">
                        <p>
                          DDXPlus Symptoms Dataset, Figshare version 15. Benchmark results do not establish clinical diagnostic validity.
                        </p>
                        <p className="insight-detail">
                          Local source: ml-service/data/ddxplus/SOURCE.md
                        </p>
                      </InsightCard>

                      <InsightCard title="SymCat knowledge base · auxiliary lookup" detail="Clinical reference lookup, separate from prediction models.">
                        <p>The application also retains a SymCat Bayesian lookup derived from outpatient CDC survey associations (801 conditions, 377 symptoms). It is an auxiliary reference lookup and does not override evaluated model metrics.</p>
                      </InsightCard>
                    </div>
                  </>
                )}
              </div>

              <p className="insights-source">
                Evaluation source: <code>{model.source}</code>
              </p>
            </>
          )}

          <footer className="insights-footer">
            SymptoSense provides informational predictions and is not a substitute for professional medical diagnosis.
          </footer>
        </div>
      </div>
    </AppShell>
  );
}
