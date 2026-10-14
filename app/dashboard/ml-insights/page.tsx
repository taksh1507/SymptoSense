'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import AppShell from '@/app/components/AppShell';
import { Section, Table as DataTable } from '@/components/ui/primitives';
import { useUiText } from '@/components/ui/use-ui-text';
import { useTechnicalText } from '@/components/ui/technical-copy';
import type { MLReport } from '@/lib/ml/report';
const colors = ['#15574e', '#384b67', '#795314', '#6c526c', '#52664d'];
const tabs = ['Dataset', 'Training', 'Evaluation', 'Explainability', 'Live Model'] as const;
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
  const [tab, setTab] = useState<(typeof tabs)[number]>('Dataset');
  const [error, setError] = useState('');
  const [rocClass, setRocClass] = useState('all');
  const [cvMetric, setCvMetric] = useState<keyof MLReport['training']['comparison'][number]['metrics']>('f1_macro');
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/ml/report', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'You do not have access to this page.' : 'Training report unavailable. Start the ML service and run train_pipeline.py.');
      setReport(await response.json());
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, []);
  const selectedRoc = report?.evaluation.roc.filter(v => rocClass === 'all' || v.disease === rocClass) ?? [];
  return <AppShell><div className="mobile-padding [padding:28px_24px] [background:var(--bg)] [color:var(--text-1)]" ><div  className="[max-width:1200px] [margin:0_auto]">
    <header className="stack"><p className="eyebrow">{t("Research and evaluation", "शोध और मूल्यांकन", "संशोधन आणि मूल्यमापन")}</p><h1>{t("ML insights", "मॉडल का विश्लेषण", "मॉडेलचे विश्लेषण")}</h1></header>
    <p  className="[font-size:var(--text-sm)] [color:var(--text-3)]">{t("Decision support only, not a diagnosis. Emergency red flags always retain High urgency.", "केवल निर्णय में सहायता, निदान नहीं। आपातकालीन संकेतों में तात्कालिकता हमेशा उच्च रहती है।", "केवळ निर्णय घेण्यास मदत, निदान नाही. आपत्कालीन संकेतांमध्ये तातडी नेहमी उच्च राहते.")}</p>
    {error && <p role="alert" className="card [padding:20px]" >{error}</p>}
    {!report && !error && <p>{t("Loading the training report…", "प्रशिक्षण रिपोर्ट लोड हो रही है…", "प्रशिक्षण अहवाल लोड होत आहे…")}</p>}
    {report && <><p  className="[font-size:var(--text-sm)]">Generated: {new Date(report.generated_at).toLocaleString()} · Version: {report.model_version} · Winner: {report.training.winner}</p>
    <div role="tablist" aria-label="ML report sections"  className="[display:flex] [flex-wrap:wrap] [gap:8px] [margin:20px_0]">{tabs.map(name => <button key={name} role="tab" aria-selected={tab === name} id={"ml-tab-" + name} tabIndex={tab === name ? 0 : -1} aria-controls="ml-insights-content" onKeyDown={e => { const i = tabs.indexOf(name); const next = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i + tabs.length - 1) % tabs.length : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : -1; if (next >= 0) { e.preventDefault(); setTab(tabs[next]); document.getElementById("ml-tab-" + tabs[next])?.focus(); } }} className={'btn ' + (tab === name ? 'btn-primary' : 'btn-secondary')} onClick={() => setTab(name)}>{lt(name)}</button>)}</div>
    <div role="tabpanel" id="ml-insights-content" aria-labelledby={"ml-tab-" + tab} className="ml-insights-grid">
      {tab === 'Dataset' && <>
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
