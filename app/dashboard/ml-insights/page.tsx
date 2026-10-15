'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import AppShell from '@/app/components/AppShell';
import { Section, Table as DataTable } from '@/components/ui/primitives';
import { useUiText } from '@/components/ui/use-ui-text';
import { useTechnicalText } from '@/components/ui/technical-copy';
import type { MLReport, ClinicalReport } from '@/lib/ml/report';
const colors = ['#15574e', '#384b67', '#795314', '#6c526c', '#52664d'];
const tabs = ['Clinical Knowledge Base (801 Diseases)', 'Dataset', 'Training', 'Evaluation', 'Explainability', 'Live Model'] as const;
const format = (v: number) => v.toFixed(4);
function ChartCard({ title, children, detail }: { title: string; children: ReactNode; detail?: string }) {
  const lt = useTechnicalText();
  const t = useUiText();
  return <Section title={lt(title)}>{detail && <p className="muted">{lt(detail)}</p>}{children}<p className="muted">{t('Recorded when the model was trained.','मॉडल के प्रशिक्षण के समय दर्ज किया गया।','मॉडेलच्या प्रशिक्षणाच्या वेळी नोंदवलेले.')}</p></Section>;
}
function ChartData({ data, name, series }: { data: object[]; name: string; series: string[] }) {
  const t = useUiText();
  const lt = useTechnicalText();
  return <details className="chart-data"><summary>{t('Read chart values','चार्ट के मान पढ़ें','आलेखाची मूल्ये वाचा')}</summary><Table headings={[lt(name),...series.map(lt)]} rows={data.map(row => [name,...series].map(key => { const v = (row as Record<string, unknown>)[key]; return typeof v === 'number' ? v : String(v ?? '—'); }))} /></details>;
}
function Bars({ data, name, series }: { data: object[]; name: string; series: string[] }) {
  const lt = useTechnicalText();
  const chart = data.length >= 12
    ? <div className="chart-scroll"><div style={{ height: Math.max(340, data.length * 28) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ right: 10 }} accessibilityLayer><CartesianGrid stroke="var(--border)" horizontal={false} /><XAxis type="number" /><YAxis type="category" dataKey={name} width={130} interval={0} tick={{ fontSize: 12 }} tickFormatter={v => String(v).replace(/_/g,' ').slice(0,25)} /><Tooltip /><Legend />{series.map((key,i) => <Bar key={key} dataKey={key} name={lt(key)} fill={colors[i % colors.length]} isAnimationActive={false} />)}</BarChart></ResponsiveContainer></div></div>
    : <div className="chart-frame"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ bottom: 60 }} accessibilityLayer><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey={name} angle={-40} textAnchor="end" interval={0} height={80} tick={{ fontSize: 12 }} /><YAxis width={40} /><Tooltip /><Legend />{series.map((key,i) => <Bar key={key} dataKey={key} name={lt(key)} fill={colors[i % colors.length]} isAnimationActive={false} />)}</BarChart></ResponsiveContainer></div>;
  return <div className="stack" role="group" aria-label={series.map(lt).join(', ')}>{chart}<ChartData data={data} name={name} series={series} /></div>;
}
function Lines({ data, x, series, probability = false }: { data: object[]; x: string; series: string[]; probability?: boolean }) {
  const lt = useTechnicalText();
  return <div className="stack" role="group" aria-label={series.map(lt).join(', ')}><div className="chart-frame"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} accessibilityLayer><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey={x} type="number" domain={probability ? [0,1] : ['auto','auto']} /><YAxis width={40} domain={probability ? [0,1] : ['auto','auto']} /><Tooltip /><Legend />{series.map((key,i) => <Line key={key} dataKey={key} name={lt(key)} stroke={colors[i % colors.length]} strokeDasharray={i % 2 ? '5 3' : undefined} dot={false} connectNulls isAnimationActive={false} />)}</LineChart></ResponsiveContainer></div><ChartData data={data} name={x} series={series} /></div>;
}
function Heatmap({ labels, matrix, correlation = false }: { labels: string[]; matrix: number[][]; correlation?: boolean }) {
  const max = Math.max(1,...matrix.flat());
  const t = useUiText();
  const label = correlation ? t('Symptom correlation matrix','लक्षण सहसंबंध मैट्रिक्स','लक्षण सहसंबंध मॅट्रिक्स') : t('Confusion matrix; rows actual, columns predicted','वर्गीकरण मैट्रिक्स; पंक्तियाँ वास्तविक, स्तंभ अनुमानित','वर्गीकरण मॅट्रिक्स; ओळी वास्तविक, स्तंभ अंदाजित');
  return <div className="stack"><div className="matrix-scroll" role="region" aria-label={label} tabIndex={0}><table className="matrix-table"><caption>{label}</caption><thead><tr><th scope="col">{t('Condition / symptom','स्थिति / लक्षण','स्थिती / लक्षण')}</th>{labels.map((label,i) => <th scope="col" title={label} key={label}>{i+1}</th>)}</tr></thead><tbody>{matrix.map((row,i) => <tr key={labels[i]}><th scope="row">{i+1}. {labels[i].replace(/_/g,' ')}</th>{row.map((v,j) => <td key={j} title={labels[i]+' / '+labels[j]+': '+v} style={{ backgroundColor: correlation ? 'rgba('+(v < 0 ? '56,75,103,' : '21,87,78,')+(.03+Math.abs(v)*.25)+')' : 'rgba(21,87,78,'+(.03+v/max*.25)+')' }}>{correlation ? v.toFixed(2) : v}</td>)}</tr>)}</tbody></table></div><p className="muted">{t('Column numbers follow the row label order. Scroll within the matrix to inspect all values.','स्तंभों की संख्या पंक्तियों के क्रम में है। सभी मान देखने के लिए मैट्रिक्स के भीतर स्क्रॉल करें।','स्तंभ क्रमांक ओळींच्या क्रमाने आहेत. सर्व मूल्यांसाठी मॅट्रिक्समध्ये स्क्रोल करा.')}</p></div>;
}
function Table({ headings, rows }: { headings: string[]; rows: (string | number)[][] }) {
  const lt = useTechnicalText();
  return <div className="table-scroll" role="region" aria-label={headings.map(lt).join(', ')} tabIndex={0}><DataTable className="ml-data-table"><thead><tr>{headings.map(v => <th scope="col" key={v}>{lt(v)}</th>)}</tr></thead><tbody>{rows.map((row,i) => <tr key={i}>{row.map((value,j) => <td key={j}>{typeof value === 'string' ? lt(value) : value}</td>)}</tr>)}</tbody></DataTable></div>;
}
export default function MLInsightsPage() {
  const t = useUiText();
  const lt = useTechnicalText();
  const [report, setReport] = useState<MLReport | null>(null);
  const [clinicalReport, setClinicalReport] = useState<ClinicalReport | null>(null);
  const [tab, setTab] = useState<(typeof tabs)[number]>('Clinical Knowledge Base (801 Diseases)');
  const [error, setError] = useState('');
  const [rocClass, setRocClass] = useState('all');
  const [cvMetric, setCvMetric] = useState<keyof MLReport['training']['comparison'][number]['metrics']>('f1_macro');
  const [kbConditions, setKbConditions] = useState<any[]>([]);
  const [kbStats, setKbStats] = useState<any>(null);
  const [kbSearch, setKbSearch] = useState('');
  const [kbUrgency, setKbUrgency] = useState('');
  const [kbLoading, setKbLoading] = useState(false);
  const [kbTotal, setKbTotal] = useState(801);

  useEffect(() => {
    setKbLoading(true);
    const controller = new AbortController();
    fetch(`/api/ml/knowledge-base?q=${encodeURIComponent(kbSearch)}&urgency=${encodeURIComponent(kbUrgency)}&limit=40`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.conditions) {
          setKbConditions(data.conditions);
          setKbStats(data.stats);
          setKbTotal(data.total);
        }
      })
      .catch(() => {})
      .finally(() => setKbLoading(false));
    return () => controller.abort();
  }, [kbSearch, kbUrgency]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/ml/report', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'You do not have access to this page.' : 'Training report unavailable. Start the ML service and run train_pipeline.py.');
      setReport(await response.json());
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });

    void fetch('/api/ml/clinical-report', { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data && data.schema_version === 1) setClinicalReport(data); })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  const selectedRoc = report?.evaluation.roc.filter(v => rocClass === 'all' || v.disease === rocClass) ?? [];
  return <AppShell><div className="mobile-padding [padding:28px_24px] [background:var(--bg)] [color:var(--text-1)]" ><div  className="[max-width:1200px] [margin:0_auto]">
    <header className="stack"><p className="eyebrow">{t("Research and evaluation", "शोध और मूल्यांकन", "संशोधन आणि मूल्यमापन")}</p><h1>{t("ML insights", "मॉडल का विश्लेषण", "मॉडेलचे विश्लेषण")}</h1></header>
    <p  className="[font-size:var(--text-sm)] [color:var(--text-3)]">{t("Decision support only, not a diagnosis. Emergency red flags always retain High urgency.", "केवल निर्णय में सहायता, निदान नहीं। आपातकालीन संकेतों में तात्कालिकता हमेशा उच्च रहती है।", "केवळ निर्णय घेण्यास मदत, निदान नाही. आपत्कालीन संकेतांमध्ये तातडी नेहमी उच्च राहते.")}</p>

    {/* Phase 4b: Synthetic Benchmark Notice */}
    <div className="card [padding:18px_20px] [margin:16px_0] [background:rgba(217,119,6,0.08)] [border:1px_solid_rgba(217,119,6,0.3)] [border-radius:var(--radius-md)]">
      <div className="[display:flex] [align-items:flex-start] [gap:12px]">
        <span style={{ fontSize: '20px' }}>⚠️</span>
        <div>
          <h2 className="[font-size:var(--text-sm)] [font-weight:700] [color:#b45309] [margin-bottom:4px]">
            Synthetic Benchmark Notice
          </h2>
          <p className="[font-size:var(--text-xs)] [color:var(--text-2)] [line-height:1.5] [margin:0]">
            All metrics on this page reflect performance on synthetic patient cases (DDXPlus / Figshare Article 20043374). They do not represent clinical diagnostic accuracy on real human patients.
          </p>
        </div>
      </div>
    </div>

    {/* Phase 4c: Multi-Engine Architecture Clarification */}
    <div className="card [padding:20px] [margin-bottom:20px] [background:var(--card-bg)] [border:1px_solid_var(--border)] [border-radius:var(--radius-lg)]">
      <h2 className="[font-size:var(--text-base)] [font-weight:700] [color:var(--text-1)] [margin-bottom:8px]">
        Dual-Engine & Knowledge Base Routing Architecture
      </h2>
      <p className="[font-size:var(--text-xs)] [color:var(--text-3)] [margin-bottom:14px] [line-height:1.5]">
        SymptoSense dynamically routes patient presentations through specialized diagnostic tiers based on symptom recognition:
      </p>
      <div className="[display:grid] [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))] [gap:14px]">
        <div className="[padding:14px] [background:var(--bg)] [border:1px_solid_var(--border)] [border-radius:var(--radius-md)]">
          <div className="[display:flex] [justify-content:space-between] [align-items:center]">
            <span className="badge [background:rgba(21,87,78,0.12)] [color:#15574e] [padding:4px_8px] [border-radius:12px] [font-weight:600] [font-size:11px]">
              Tier 1: Core Clinical Classifier
            </span>
            {clinicalReport && (
              <span className="badge [background:rgba(21,87,78,0.08)] [color:#15574e] [padding:3px_6px] [border-radius:8px] [font-weight:700] [font-size:10px]">
                {(clinicalReport.holdout_test_metrics.accuracy * 100).toFixed(0)}% Holdout
              </span>
            )}
          </div>
          <h3 className="[font-size:var(--text-sm)] [font-weight:700] [margin:8px_0_4px]">41 Diseases (Deduplicated)</h3>
          <p className="[font-size:12px] [color:var(--text-3)] [margin:0_0_8px]">
            Supervised Random Forest trained on deduplicated clinical associations. Evaluated on an independent stratified holdout split (zero train/test overlap).
          </p>
          {clinicalReport && (
            <div className="[font-size:11px] [color:var(--text-2)] [background:rgba(0,0,0,0.03)] [padding:6px_8px] [border-radius:6px]">
              <div><strong>Hygiene:</strong> {clinicalReport.dataset.raw_rows} raw → {clinicalReport.dataset.unique_rows} unique patterns ({clinicalReport.dataset.deduplication_ratio}x)</div>
              <div><strong>Holdout:</strong> {clinicalReport.split.train_rows} train / {clinicalReport.split.test_rows} test (zero leakage)</div>
            </div>
          )}
        </div>
        <div className="[padding:14px] [background:var(--bg)] [border:1px_solid_var(--border)] [border-radius:var(--radius-md)]">
          <span className="badge [background:rgba(56,75,103,0.12)] [color:#384b67] [padding:4px_8px] [border-radius:12px] [font-weight:600] [font-size:11px]">
            Tier 2: CDC SymCat Knowledge Base
          </span>
          <h3 className="[font-size:var(--text-sm)] [font-weight:700] [margin:8px_0_4px]">801 Conditions</h3>
          <p className="[font-size:12px] [color:var(--text-3)] [margin:0]">
            Unvalidated CDC outpatient knowledge-base lookup. Uses Bayesian conditional probability across 377 symptoms. Not trained ML; serves as broad differential lookup.
          </p>
        </div>
        <div className="[padding:14px] [background:var(--bg)] [border:1px_solid_var(--border)] [border-radius:var(--radius-md)]">
          <span className="badge [background:rgba(121,83,20,0.12)] [color:#795314] [padding:4px_8px] [border-radius:12px] [font-weight:600] [font-size:11px]">
            Tier 3: DDXPlus Benchmark Model
          </span>
          <h3 className="[font-size:var(--text-sm)] [font-weight:700] [margin:8px_0_4px]">49 Pathologies</h3>
          <p className="[font-size:12px] [color:var(--text-3)] [margin:0]">
            Calibrated research model trained on synthetic DDXPlus evidence codes. Evaluated with realistic input perturbations and selective prediction thresholds.
          </p>
        </div>
      </div>
    </div>

    {error && <p role="alert" className="card [padding:20px]" >{error}</p>}
    {!report && !error && <p>{t("Loading the training report…", "प्रशिक्षण रिपोर्ट लोड हो रही है…", "प्रशिक्षण अहवाल लोड होत आहे…")}</p>}
    {report && <><p  className="[font-size:var(--text-sm)]">Generated: {new Date(report.generated_at).toLocaleString()} · Version: {report.model_version} · Winner: {report.training.winner}</p>
    <div role="tablist" aria-label="ML report sections"  className="[display:flex] [flex-wrap:wrap] [gap:8px] [margin:20px_0]">{tabs.map(name => <button key={name} role="tab" aria-selected={tab === name} id={"ml-tab-" + name} tabIndex={tab === name ? 0 : -1} aria-controls="ml-insights-content" onKeyDown={e => { const i = tabs.indexOf(name); const next = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i + tabs.length - 1) % tabs.length : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : -1; if (next >= 0) { e.preventDefault(); setTab(tabs[next]); document.getElementById("ml-tab-" + tabs[next])?.focus(); } }} className={'btn ' + (tab === name ? 'btn-primary' : 'btn-secondary')} onClick={() => setTab(name)}>{lt(name)}</button>)}</div>
    <div role="tabpanel" id="ml-insights-content" aria-labelledby={"ml-tab-" + tab} className="ml-insights-grid">
      {tab === 'Clinical Knowledge Base (801 Diseases)' && <>
        <div className="card [grid-column:1/-1] [padding:24px] [background:var(--card-bg)] [border:1px_solid_var(--border)] [border-radius:var(--radius-lg)]">
          <div className="[display:flex] [flex-wrap:wrap] [justify-content:space-between] [align-items:center] [gap:16px] [margin-bottom:20px]">
            <div>
              <h2 className="[font-size:var(--text-xl)] [font-weight:700] [color:var(--text-1)] [margin-bottom:4px]">CDC Clinical Knowledge Base (801 Conditions)</h2>
              <p className="[font-size:var(--text-sm)] [color:var(--text-3)]">
                Unvalidated knowledge-base lookup derived from CDC National Ambulatory Medical Care Survey (NAMCS/NHAMCS) outpatient database. Uses Bayesian conditional probability lookup across 377 symptoms.
              </p>
            </div>
            <div className="[display:flex] [flex-wrap:wrap] [gap:10px]">
              <span className="badge [background:rgba(21,87,78,0.12)] [color:#15574e] [padding:6px_12px] [border-radius:20px] [font-weight:600] [font-size:var(--text-xs)]">
                {kbTotal} CDC Conditions
              </span>
              <span className="badge [background:rgba(56,75,103,0.12)] [color:#384b67] [padding:6px_12px] [border-radius:20px] [font-weight:600] [font-size:var(--text-xs)]">
                377 Symptoms
              </span>
              <span className="badge [background:rgba(121,83,20,0.12)] [color:#795314] [padding:6px_12px] [border-radius:20px] [font-weight:600] [font-size:var(--text-xs)]">
                Unvalidated Knowledge-Base Lookup
              </span>
              <span className="badge [background:rgba(108,82,108,0.12)] [color:#6c526c] [padding:6px_12px] [border-radius:20px] [font-weight:600] [font-size:var(--text-xs)]">
                Bayesian Conditional Probability
              </span>
            </div>
          </div>

          <div className="[display:flex] [flex-wrap:wrap] [gap:12px] [align-items:center] [margin-bottom:20px]">
            <input
              type="text"
              className="input [flex:1] [min-width:260px] [padding:10px_14px] [border:1px_solid_var(--border)] [border-radius:var(--radius-md)] [background:var(--bg)]"
              placeholder="Search by condition, symptom, or keyword (e.g. Heart, Asthma, Appendicitis, Rash)..."
              value={kbSearch}
              onChange={e => setKbSearch(e.target.value)}
            />
            <div className="[display:flex] [gap:6px]">
              {(['', 'High', 'Medium', 'Low'] as const).map(u => (
                <button
                  key={u}
                  type="button"
                  className={'btn ' + (kbUrgency === u ? 'btn-primary' : 'btn-secondary') + ' [padding:6px_12px] [font-size:var(--text-xs)]'}
                  onClick={() => setKbUrgency(u)}
                >
                  {u || 'All Urgencies'}
                </button>
              ))}
            </div>
          </div>

          <div className="[display:flex] [justify-content:space-between] [font-size:var(--text-xs)] [color:var(--text-3)] [margin-bottom:12px]">
            <span>Showing {kbConditions.length} of {kbTotal} conditions</span>
            {kbLoading && <span>Searching database…</span>}
          </div>

          <div className="[display:grid] [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))] [gap:16px]">
            {kbConditions.map(c => {
              const urgencyColor = c.urgency === 'High' ? '#b91c1c' : c.urgency === 'Medium' ? '#d97706' : '#15803d';
              const urgencyBg = c.urgency === 'High' ? 'rgba(185,28,28,0.1)' : c.urgency === 'Medium' ? 'rgba(217,119,6,0.1)' : 'rgba(21,128,61,0.1)';
              const symptomEntries = Object.entries(c.symptoms || {}).slice(0, 6) as [string, number][];

              return (
                <div key={c.id} className="card [padding:18px] [background:var(--bg)] [border:1px_solid_var(--border)] [border-radius:var(--radius-md)] [display:flex] [flex-direction:column] [justify-content:space-between]">
                  <div>
                    <div className="[display:flex] [justify-content:space-between] [align-items:flex-start] [gap:8px] [margin-bottom:8px]">
                      <h3 className="[font-size:var(--text-base)] [font-weight:700] [color:var(--text-1)] [line-height:1.3]">{c.name}</h3>
                      <span className="badge" style={{ backgroundColor: urgencyBg, color: urgencyColor, padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {c.urgency} Urgency
                      </span>
                    </div>

                    {c.description && (
                      <p className="[font-size:var(--text-xs)] [color:var(--text-2)] [margin-bottom:12px] [line-height:1.5] [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] [overflow:hidden]">
                        {c.description}
                      </p>
                    )}

                    {symptomEntries.length > 0 && (
                      <div className="[margin-bottom:12px]">
                        <p className="[font-size:11px] [font-weight:600] [text-transform:uppercase] [color:var(--text-3)] [margin-bottom:6px] [letter-spacing:0.5px]">Cardinal Symptoms & Probabilities</p>
                        <div className="[display:flex] [flex-wrap:wrap] [gap:6px]">
                          {symptomEntries.map(([sym, prob]) => (
                            <span key={sym} className="[font-size:11px] [padding:3px_8px] [background:rgba(0,0,0,0.04)] [border-radius:6px] [color:var(--text-2)]">
                              {sym.replace(/_/g, ' ')} <strong style={{ color: 'var(--primary)' }}>{Math.round(prob * 100)}%</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {c.precautions && c.precautions.length > 0 && (
                    <div className="[border-top:1px_solid_var(--border)] [padding-top:10px] [margin-top:10px]">
                      <p className="[font-size:11px] [font-weight:600] [text-transform:uppercase] [color:var(--text-3)] [margin-bottom:4px] [letter-spacing:0.5px]">Guidance & Precautions</p>
                      <ul className="[font-size:12px] [color:var(--text-2)] [padding-left:16px] [margin:0]">
                        {c.precautions.slice(0, 2).map((p: string, idx: number) => (
                          <li key={idx} style={{ marginBottom: '3px' }}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </>}
      {tab === 'Dataset' && <>
        {clinicalReport && (
          <ChartCard title="Tier 1: Kaggle 41-Disease Dataset Deduplication & Hygiene" detail={clinicalReport.dataset.data_hygiene}>
            <Table
              headings={['Measure', 'Value']}
              rows={[
                ['Dataset', clinicalReport.dataset.name],
                ['Raw rows (before deduplication)', clinicalReport.dataset.raw_rows],
                ['Unique symptom-disease patterns', clinicalReport.dataset.unique_rows],
                ['Deduplication reduction ratio', `${clinicalReport.dataset.deduplication_ratio}x`],
                ['Total disease classes', clinicalReport.dataset.num_diseases],
                ['Distinct symptom features', clinicalReport.dataset.num_symptoms],
                ['Stratified train split (80%)', `${clinicalReport.split.train_rows} patterns`],
                ['Held-out test split (20%)', `${clinicalReport.split.test_rows} patterns`],
                ['Train/Test leakage', '0.0% (strictly disjoint unique patterns)'],
                ['Holdout test accuracy', `${(clinicalReport.holdout_test_metrics.accuracy * 100).toFixed(1)}%`],
                ['Holdout macro-F1', clinicalReport.holdout_test_metrics.macro_f1.toFixed(4)],
                ['Holdout multiclass Brier score', clinicalReport.holdout_test_metrics.multiclass_brier_score.toFixed(4)],
                ['Holdout log-loss', clinicalReport.holdout_test_metrics.log_loss.toFixed(4)],
              ]}
            />
            <p className="[font-size:var(--text-xs)] [color:var(--text-3)] [margin-top:8px]">
              {clinicalReport.disclaimer}
            </p>
          </ChartCard>
        )}
        <ChartCard title="Dataset source and quality" detail={report.dataset.representation}><p><a href={report.dataset.source} target="_blank" rel="noreferrer">DDXPlus source (Figshare)</a></p><Table headings={['Measure', 'Value']} rows={[[ 'Training rows before sample', report.dataset.sample_sizes?.train?.rows_before_sampling ?? report.dataset.raw_rows ], ['Train / validation / test sampled', [report.dataset.sample_sizes?.train?.rows_after_sampling, report.dataset.sample_sizes?.validate?.rows_after_sampling, report.dataset.sample_sizes?.test?.rows_after_sampling].join(' / ')], ['Distinct evidence patterns in sample', (report.dataset as any).unique_rows ?? report.dataset.unique_evidence_patterns], ['Repeated evidence patterns in sample', (report.dataset as any).duplicate_patterns_removed ?? report.dataset.duplicate_evidence_patterns_kept], ['Disease classes', report.dataset.class_count], ['Evidence features', report.dataset.feature_count], ['Train / test rows', report.split.train_rows + ' / ' + report.split.test_rows]]} /><p  className="[font-size:var(--text-sm)]">{report.dataset.missing_interpretation}</p><p  className="[overflow-wrap:anywhere] [font-size:var(--text-sm)]">Dataset SHA-256: {report.dataset.sha256}</p>{report.dataset.split_overlap_fingerprints && <p  className="[font-size:var(--text-sm)]">Exact-row overlap fingerprints: {JSON.stringify(report.dataset.split_overlap_fingerprints)} (source has no patient IDs).</p>}</ChartCard>
        <ChartCard title="Class distribution" detail="Raw rows and distinct symptom patterns per disease."><Bars data={report.dataset.class_distribution} name="disease" series={['count', 'unique_count']} /></ChartCard>
        <ChartCard title="Most frequent symptoms"><Bars data={report.dataset.top_symptoms} name="symptom" series={['count']} /></ChartCard>
        <ChartCard title="Symptom correlation" detail="Pearson correlation for the 15 most frequent binary symptoms."><Heatmap labels={report.dataset.correlation.labels} matrix={report.dataset.correlation.matrix} correlation /></ChartCard>
        <ChartCard title="Missing values"><Table headings={['Source column', 'Empty slots']} rows={report.dataset.missing_values.map(v => [v.column, v.count])} /></ChartCard>
        <ChartCard title="First 10 source rows"><Table headings={['Disease label', 'Listed symptoms']} rows={report.dataset.sample.map(v => [v.disease, v.symptoms.join(', ')])} /></ChartCard>
      </>}
      {tab === 'Training' && <>
        <ChartCard title="Five-fold model comparison" detail="Accuracy, macro precision/recall/F1 and top-3 accuracy. Selection uses training folds only."><Bars data={report.training.comparison.map(v => ({ model: v.model, ...Object.fromEntries(Object.entries(v.metrics).map(([k, metric]) => [k, metric.mean])) }))} name="model" series={['accuracy', 'precision_macro', 'recall_macro', 'f1_macro', 'top3_accuracy']} /></ChartCard>
        <ChartCard title="Per-fold scores"><label>Metric: <select value={cvMetric} onChange={e => setCvMetric(e.target.value as typeof cvMetric)}>{['accuracy', 'precision_macro', 'recall_macro', 'f1_macro', 'top3_accuracy'].map(v => <option key={v}>{v}</option>)}</select></label><Lines data={[0, 1, 2, 3, 4].map(i => ({ fold: i + 1, ...Object.fromEntries(report.training.comparison.map(v => [v.model, v.metrics[cvMetric].folds[i]])) }))} x="fold" series={report.training.comparison.map(v => v.model)} /></ChartCard>
        <ChartCard title="Learning curve" detail="Training and validation macro F1; each subset retains every training disease class."><Lines data={report.training.learning_curve} x="train_size" series={['train_f1', 'validation_f1']} /></ChartCard>
        <ChartCard title="Cross-validation mean and standard deviation"><Table headings={['Model', 'Metric', 'Mean', 'Std']} rows={report.training.comparison.flatMap(v => Object.entries(v.metrics).map(([metric, score]) => [v.model, metric, format(score.mean), format(score.std)]))} /></ChartCard>
        <ChartCard title="Hyperparameter search" detail={'Selected: ' + report.training.winner + ' · ' + JSON.stringify(report.training.best_parameters)}><Table headings={['Model', 'Parameters', 'Mean macro F1', 'Std', 'Rank']} rows={report.training.hyperparameters.map(v => [v.model, JSON.stringify(v.parameters), format(v.mean_f1), format(v.std_f1), v.rank])} /></ChartCard>
        {report.baselines && <ChartCard title="Baselines" detail={report.baselines.interpretation}><Table headings={['Baseline', 'Reported values']} rows={[['Majority class', JSON.stringify(report.baselines.majority_class)], ['Nearest neighbour', JSON.stringify(report.baselines.nearest_neighbour)]]} /></ChartCard>}
      </>}
      {tab === 'Evaluation' && <>
        {/* Phase 4b: Side-by-side Clean Synthetic vs Realistic Input Comparison */}
        <div className="card [padding:20px] [grid-column:1/-1] [background:var(--card-bg)] [border:1px_solid_var(--border)] [border-radius:var(--radius-lg)] [margin-bottom:16px]">
          <h3 className="[font-size:var(--text-lg)] [font-weight:700] [margin-bottom:8px]">
            Clean Synthetic vs. Realistic-Input Benchmark Comparison
          </h3>
          <p className="[font-size:var(--text-xs)] [color:var(--text-3)] [margin-bottom:16px]">
            Comparison between synthetic patient profiles (unperturbed) and realistic outpatient presentations (3–8 symptoms, forget rate, symptom substitutions). Realistic metrics are averaged across 10 evaluation seeds.
          </p>
          <div className="[display:grid] [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] [gap:14px]">
            <div className="[padding:14px] [background:var(--bg)] [border:1px_solid_var(--border)] [border-radius:var(--radius-md)]">
              <span className="[font-size:var(--text-xs)] [color:var(--text-3)] [font-weight:600]">ACCURACY</span>
              <div className="[display:flex] [justify-content:space-between] [align-items:baseline] [margin-top:8px]">
                <div>
                  <span className="[font-size:11px] [color:var(--text-3)]">Clean: </span>
                  <strong className="[font-size:var(--text-base)]">{report.clean_synthetic ? (report.clean_synthetic.metrics.accuracy * 100).toFixed(1) + '%' : (report.evaluation.metrics.accuracy * 100).toFixed(1) + '%'}</strong>
                </div>
                <div>
                  <span className="[font-size:11px] [color:var(--text-3)]">Realistic: </span>
                  <strong className="[font-size:var(--text-base)] [color:var(--primary)]">{report.realistic_input ? (report.realistic_input.accuracy_mean * 100).toFixed(1) + '%' : '—'}</strong>
                </div>
              </div>
            </div>
            <div className="[padding:14px] [background:var(--bg)] [border:1px_solid_var(--border)] [border-radius:var(--radius-md)]">
              <span className="[font-size:var(--text-xs)] [color:var(--text-3)] [font-weight:600]">MACRO F1</span>
              <div className="[display:flex] [justify-content:space-between] [align-items:baseline] [margin-top:8px]">
                <div>
                  <span className="[font-size:11px] [color:var(--text-3)]">Clean: </span>
                  <strong className="[font-size:var(--text-base)]">{report.clean_synthetic ? report.clean_synthetic.metrics.f1_macro.toFixed(4) : report.evaluation.metrics.f1_macro.toFixed(4)}</strong>
                </div>
                <div>
                  <span className="[font-size:11px] [color:var(--text-3)]">Realistic: </span>
                  <strong className="[font-size:var(--text-base)] [color:var(--primary)]">{report.realistic_input ? report.realistic_input.f1_macro_mean.toFixed(4) : '—'}</strong>
                </div>
              </div>
            </div>
            <div className="[padding:14px] [background:var(--bg)] [border:1px_solid_var(--border)] [border-radius:var(--radius-md)]">
              <span className="[font-size:var(--text-xs)] [color:var(--text-3)] [font-weight:600]">TOP-3 ACCURACY</span>
              <div className="[display:flex] [justify-content:space-between] [align-items:baseline] [margin-top:8px]">
                <div>
                  <span className="[font-size:11px] [color:var(--text-3)]">Clean: </span>
                  <strong className="[font-size:var(--text-base)]">{report.clean_synthetic ? (report.clean_synthetic.metrics.top_3_accuracy * 100).toFixed(1) + '%' : (report.evaluation.metrics.top_3_accuracy * 100).toFixed(1) + '%'}</strong>
                </div>
                <div>
                  <span className="[font-size:11px] [color:var(--text-3)]">Realistic: </span>
                  <strong className="[font-size:var(--text-base)] [color:var(--primary)]">{report.realistic_input ? (report.realistic_input.top3_mean * 100).toFixed(1) + '%' : '—'}</strong>
                </div>
              </div>
            </div>
            <div className="[padding:14px] [background:var(--bg)] [border:1px_solid_var(--border)] [border-radius:var(--radius-md)]">
              <span className="[font-size:var(--text-xs)] [color:var(--text-3)] [font-weight:600]">TOP-5 ACCURACY</span>
              <div className="[display:flex] [justify-content:space-between] [align-items:baseline] [margin-top:8px]">
                <div>
                  <span className="[font-size:11px] [color:var(--text-3)]">Clean: </span>
                  <strong className="[font-size:var(--text-base)]">{report.clean_synthetic ? (report.clean_synthetic.metrics.top_5_accuracy * 100).toFixed(1) + '%' : (report.evaluation.metrics.top_5_accuracy * 100).toFixed(1) + '%'}</strong>
                </div>
                <div>
                  <span className="[font-size:11px] [color:var(--text-3)]">Realistic: </span>
                  <strong className="[font-size:var(--text-base)] [color:var(--primary)]">{report.realistic_input ? (report.realistic_input.top5_mean * 100).toFixed(1) + '%' : '—'}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ChartCard title="Held-out results" detail="The official test sample was used only after model selection."><Table headings={['Metric', 'Final model']} rows={Object.entries(report.evaluation.metrics).map(([k, v]) => [k, format(v)])} /><p>Validation calibration choice: {report.calibration.method}. Validation Brier before: {format(report.calibration.brier_before)}; after: {format(report.calibration.brier_after)}.</p><p  className="[font-size:var(--text-sm)]">{report.calibration.brier_definition}</p></ChartCard>
        <ChartCard title="Confusion matrix" detail="Rows: actual disease. Columns: predicted disease."><Heatmap labels={report.classes} matrix={report.evaluation.confusion_matrix} /></ChartCard>
        <ChartCard title="One-vs-rest ROC" detail={'Macro AUC: ' + format(report.evaluation.macro_auc)}><label>Disease curve: <select value={rocClass} onChange={e => setRocClass(e.target.value)}><option value="all">All diseases</option>{report.classes.map(v => <option key={v}>{v}</option>)}</select></label><div  className="[height:330px]"><ResponsiveContainer width="100%" height="100%"><LineChart accessibilityLayer><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="fpr" type="number" domain={[0, 1]} allowDuplicatedCategory={false} /><YAxis type="number" domain={[0, 1]} /><Tooltip /><ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#94A3B8" />{selectedRoc.map((v, i) => <Line isAnimationActive={false} key={v.disease} data={v.points} dataKey="tpr" name={v.disease + ' AUC ' + format(v.auc)} stroke={colors[i % colors.length]} dot={false} />)}</LineChart></ResponsiveContainer></div></ChartCard>
        <ChartCard title="Per-class held-out metrics"><Table headings={['Disease', 'Precision', 'Recall', 'F1', 'Support']} rows={report.evaluation.per_class.map(v => [v.disease, format(v.precision), format(v.recall), format(v.f1), v.support])} /></ChartCard>
        <ChartCard title="Confidence calibration" detail="Top prediction probability versus observed correctness; calibration fitted on training rows only."><div  className="[height:320px]"><ResponsiveContainer width="100%" height="100%"><LineChart accessibilityLayer><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="predicted" type="number" domain={[0, 1]} allowDuplicatedCategory={false} /><YAxis domain={[0, 1]} /><Tooltip /><Legend /><ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#94A3B8" /><Line isAnimationActive={false} data={report.calibration.curve_before} dataKey="observed" name="Before calibration" stroke={colors[1]} /><Line isAnimationActive={false} data={report.calibration.curve_after} dataKey="observed" name="After calibration" stroke={colors[0]} /></LineChart></ResponsiveContainer></div></ChartCard>
        <ChartCard title="Missing-symptom robustness" detail="Ten seeded repeats per expected percentage dropped; test rows only."><Lines data={report.evaluation.robustness} x="percent_dropped" series={['accuracy']} /><Table headings={['% dropped', 'Mean accuracy', 'Std']} rows={report.evaluation.robustness.map(v => [v.percent_dropped, format(v.accuracy), format(v.accuracy_std)])} /></ChartCard>
        {report.noise_robustness && <ChartCard title="Wrong-evidence robustness" detail="Random added evidence; held-out test sample."><Lines data={report.noise_robustness.filter(v => v.variant !== 'noise_augmented_model')} x="percent_wrong_evidence" series={['accuracy', 'top3_accuracy']} /><Table headings={['Variant', '% wrong evidence', 'Accuracy', 'Top-3', 'Training rows']} rows={report.noise_robustness.map(v => [v.variant ?? 'random additions', v.percent_wrong_evidence, format(v.accuracy), format(v.top3_accuracy), v.augmented_training_rows ?? '—'])} /></ChartCard>}
        <ChartCard title="Derived urgency classifier" detail={report.urgency.label_source}><p>Derived-label accuracy: {format(report.urgency.accuracy_against_derived_labels)}</p><p>Rule agreement: {format(report.urgency.rule_agreement)}; after red flags: {format(report.urgency.rule_agreement_after_red_flags)}</p><Heatmap labels={report.urgency.labels} matrix={report.urgency.confusion_matrix} /><p  className="[font-size:var(--text-sm)]">{report.urgency.rule_context}</p></ChartCard>
        {report.severity_table && <ChartCard title="Dataset severity mapping" detail="Lower DDXPlus severity values indicate greater severity; urgency mapping is a project research proxy."><Table headings={['Pathology', 'Severity', 'Mapped urgency']} rows={report.severity_table.map(v => [v.disease, v.severity, v.urgency])} /></ChartCard>}
      </>}
      {tab === 'Explainability' && <ChartCard title="Global SHAP: top 15 symptoms" detail={report.explainability.method}><Bars data={report.explainability.global_importance} name="symptom" series={['importance']} /><p>Units: {report.explainability.units}. Background rows: {report.explainability.background_rows}; explained held-out rows: {report.explainability.global_rows}.</p><p>Feature effects describe this model’s associations. They do not establish medical causation.</p></ChartCard>}
      {tab === 'Live Model' && <section className="section" ><h2>Live Model</h2><p>The existing Model Health page provides live confidence-service availability, latency, follow-ups and retraining status. Its legacy confidence model is separate from this disease classifier.</p><Link className="btn btn-primary" href="/dashboard/model-health">Open Model Health</Link><p>Disease model version: {report.model_version}</p></section>}
    </div>
    <section className="section" ><h2  className="[font-size:var(--text-base)]">Evaluation limits</h2><ul>{report.limitations.map(v => <li key={v}  className="[margin-bottom:8px] [font-size:var(--text-sm)] [line-height:1.6]">{v}</li>)}</ul></section></>}
  </div></div></AppShell>;
}
