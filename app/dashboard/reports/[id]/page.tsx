'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Printer } from 'lucide-react';
import { Badge, Button, Field, Notice, Section } from '@/components/ui/primitives';
import { useUiText } from '@/components/ui/use-ui-text';
import AppShell from '@/app/components/AppShell';
import { useApp } from '@/app/context/AppContext';
import { RiskGauge } from '@/components/results/RiskGauge';
import { ConfidenceMeter } from '@/components/results/ConfidenceMeter';
import {
  generateRiskExplanation,
  generateRecommendations,
  type RiskLevel,
} from '@/lib/report/reasoningEngine';
import { COLOR_THRESHOLDS } from '@/lib/ai-engine/scoring/thresholds';
import type { Urgency } from '@/lib/ai-engine/scoring/types';
import { parseStoredAssessment } from '@/lib/report/parseAnswers';

interface ReportDetail {
  id: string;
  createdAt: string;
  personName: string;
  isSelf: boolean;
  relation?: string;
  gender?: string;
  score: number;
  urgency: string;
  primaryCategory: string;
  recommendation: string;
  factors: string;              // JSON
  assessmentPayload?: string;
  language?: string;
  answers: string;              // JSON
  // Groq-generated fields (stored at assessment time)
  riskReasoning?: string;
  riskSummary?: string;
  riskFactors?: string;         // JSON string[]
  primaryAction?: string;
  recommendationSteps?: string; // JSON string[]
  keyInsights?: string;         // JSON string[]
  confidenceScore?: number;
  confidenceLevel?: string;
  confidenceExplanation?: string;
}

interface FollowUpRecord {
  id: string;
  status: string; // pending | responded
  scheduledAt: string;
  respondedAt?: string;
  contactedDoctor?: boolean;
  diagnosis?: string;
  resolved?: string;
  improved?: string;
  notes?: string;
}

// ── Parse stored answers into usable fields ───────────────────
// ── Warning signs based on symptoms/risk ─────────────────────
function getWarningSigns(primarySymptom: string, additionalSymptoms: string[], riskLevel: string): string[] {
  const signs = ['Watch for any sudden worsening of symptoms.'];
  const all = [primarySymptom, ...additionalSymptoms];
  if (all.some(s => s === 'chest_pain' || s === 'breathlessness')) {
    signs.push('Seek help immediately if breathing becomes difficult.');
  }
  if (all.some(s => s === 'fever')) {
    signs.push('Monitor temperature — seek care if it rises above 39°C (102°F).');
  }
  if (all.some(s => s === 'dizziness')) {
    signs.push('Avoid driving or operating machinery until fully recovered.');
  }
  if (riskLevel === 'High') {
    signs.push('Do not delay — high-risk symptoms require prompt evaluation.');
  }
  signs.push('Return for a new assessment if new symptoms develop.');
  return signs.slice(0, 4);
}

// ── Drug-interaction warnings (e.g. blood thinners) ───────────
function getDrugWarnings(onBloodThinners: boolean, symptomTokens: string[]): string[] {
  if (!onBloodThinners) return [];
  const warnings: string[] = [];
  const text = symptomTokens.join(' ').toLowerCase();
  if (/(bleed|bleeding|blood.?in.?stool|rectal.?bleed|vomit)/.test(text)) {
    warnings.push('You are on blood thinners and report bleeding-related symptoms — this warrants prompt medical care. Do not stop your medication on your own; consult a doctor first.');
  }
  if (symptomTokens.some((s) => s === 'chest_pain' || s === 'breathlessness')) {
    warnings.push('Blood thinners increase bleeding risk in cardiac events — chest pain or breathing difficulty here needs urgent evaluation by a professional.');
  }
  return warnings;
}

// Parse the raw answer map (questionId -> value) once for meds/drug checks
export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useUiText();
  const { id } = use(params);
  const router = useRouter();
  const { language } = useApp();
  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [followUp, setFollowUp] = useState<FollowUpRecord | null>(null);
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [checkInError, setCheckInError] = useState('');
  const [contactedDoctor, setContactedDoctor] = useState('');
  const [improved, setImproved] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/sessions?sessionId=${id}`)
        .then(r => { if (!r.ok) throw new Error(r.status === 404 ? 'Report not found.' : r.status === 401 ? 'Please sign in to view this report.' : 'Could not load this report.'); return r.json(); }),
      fetch(`/api/followups?sessionId=${id}`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(([reportData, followUpData]) => {
        setReport(reportData);
        if (Array.isArray(followUpData) && followUpData.length > 0) {
          setFollowUp(followUpData[0]);
        }
      })
      .catch(e => { setLoadError(e.message); setReport(null); })
      .finally(() => setLoading(false));
  }, [id]);

  const submitCheckIn = async () => {
    setCheckInSubmitting(true);
    setCheckInError('');
    try {
      const res = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: id,
          contactedDoctor: contactedDoctor === 'yes' ? true : contactedDoctor === 'no' ? false : undefined,
          improved: improved || undefined,
          diagnosis: diagnosis.trim(),
          notes: notes.trim(),
        }),
      });
      if (!res.ok) {
        setCheckInError('Could not save check-in. Please try again.');
        return;
      }
      const updated = await res.json();
      setFollowUp(updated);
      setShowCheckInForm(false);
    } catch {
      setCheckInError('Could not save check-in. Please try again.');
    } finally {
      setCheckInSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div  className="[display:flex] [align-items:center] [justify-content:center] [height:60vh] [color:var(--text-4)] [font-size:var(--text-sm)]">
          {language === 'Hindi' ? 'रिपोर्ट लोड हो रही है...' : language === 'Marathi' ? 'अहवाल लोड होत आहे...' : 'Loading report...'}
        </div>
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell>
        <div  className="[padding:40px] [text-align:left]">
          <p  className="[color:var(--text-3)] [margin-bottom:16px]">{loadError || 'Report not found.'}</p>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard/reports')}>
            Back to Reports
          </button>
        </div>
      </AppShell>
    );
  }

  // ── Derived data ──────────────────────────────────────────────
  const score    = report.score ?? 0;
  const urgency  = (report.urgency ?? 'Low') as RiskLevel;

  const parsed = parseStoredAssessment(report.answers, report.assessmentPayload);
  const { primarySymptom, severity, duration, additionalSymptoms, medicalHistory } = parsed;

  const isLegacy = report.confidenceScore == null;

  // Personalized header — include relation if stored
  const displayName = report.personName && report.personName !== 'Myself' ? report.personName : null;
  const relationLabel = !report.isSelf && report.relation ? ` (${report.relation})` : '';
  const reportTitle = displayName
    ? t('Assessment', 'मूल्यांकन', 'मूल्यांकन') + ': ' + displayName + relationLabel
    : (language === 'Hindi' ? 'स्वास्थ्य मूल्यांकन' : language === 'Marathi' ? 'आरोग्य मूल्यांकन' : 'Health Assessment');

  // Local engine as fallback
  const reasoningInput = { primarySymptom, severity, duration, additionalSymptoms, medicalHistory, riskLevel: urgency, riskScore: score };
  const localReasoning      = generateRiskExplanation(reasoningInput);
  const localRecommendations = generateRecommendations(reasoningInput);
  const warningSigns = getWarningSigns(primarySymptom, additionalSymptoms, urgency);

  // ── Prefer stored Groq fields, fall back to local engine ──────
  const riskOneLiner = report.riskReasoning
    || `${urgency} risk based on ${primarySymptom.replace(/_/g, ' ')} with ${severity} severity.`;

  const displaySummary = report.riskSummary || localReasoning.summary;

  const displayFactors: string[] = (() => {
    try {
      const stored = JSON.parse(report.riskFactors || '[]');
      if (stored.length > 0) return stored;
    } catch { /* fall through */ }
    return localReasoning.factors;
  })();

  const displayPrimary = report.primaryAction || localRecommendations.primaryAction;

  const displaySteps: string[] = (() => {
    try {
      const stored = JSON.parse(report.recommendationSteps || '[]');
      if (stored.length > 0) return stored;
    } catch { /* fall through */ }
    return localRecommendations.steps;
  })();

  const keyInsights: string[] = (() => {
    try {
      const stored = JSON.parse(report.keyInsights || '[]');
      if (stored.length > 0) return stored;
    } catch { /* fall through */ }
    const symptomLabel = primarySymptom.replace(/_/g, ' ');
    return [
      `${symptomLabel.charAt(0).toUpperCase() + symptomLabel.slice(1)} identified as the primary symptom`,
      `Severity reported as ${severity}`,
      score < COLOR_THRESHOLDS.high ? 'No critical emergency indicators detected at time of assessment' : 'High-risk indicators were present at time of assessment',
    ];
  })();

  // ── Doctor-visit note data ───────────────────────────────────
  const medRaw = parsed.medicalHistory;
  const onBloodThinners = medRaw.includes('blood_thinners') || medRaw.includes('blood_thinner') || medRaw.includes('blood thinner');
  const drugWarnings = getDrugWarnings(onBloodThinners, [...parsed.allSymptoms, ...parsed.additionalSymptoms, ...parsed.medicalHistory]);

  return <AppShell><div className="page"><div className="report">
    <Notice tone={urgency === 'High' ? 'danger' : urgency === 'Medium' ? 'warning' : 'info'}>
      <p><Badge urgency={urgency}>{urgency === 'High' ? t('High urgency','उच्च तात्कालिकता','उच्च तातडी') : urgency === 'Medium' ? t('Medium urgency','मध्यम तात्कालिकता','मध्यम तातडी') : t('Low urgency','कम तात्कालिकता','कमी तातडी')}</Badge></p>
      <h2>{displayPrimary}</h2><p>{t('This is historical guidance from the date of your assessment.','यह मूल्यांकन की तारीख की सलाह है।','हा मूल्यांकनाच्या तारखेचा सल्ला आहे.')}</p>
    </Notice>
    <header className="stack"><div><Button variant="secondary" onClick={() => router.push('/dashboard/reports')}>{t('Back to reports','रिपोर्ट पर वापस जाएँ','अहवालांकडे परत जा')}</Button></div>
      <p className="eyebrow">{t('Saved report','सहेजी गई रिपोर्ट','जतन केलेला अहवाल')}</p><h1>{reportTitle}</h1>
      <p className="muted">{new Date(report.createdAt).toLocaleDateString(langKey === 'hi' ? 'hi-IN' : langKey === 'mr' ? 'mr-IN' : 'en-US',{ weekday: 'long',year: 'numeric',month: 'long',day: 'numeric' })}</p>
      <div className="row no-print"><Button variant="secondary" onClick={() => { try { window.print(); } catch { /* Printing is unavailable in some embedded browsers. */ } }}><Printer aria-hidden="true" />{t('Print / save PDF','प्रिंट / PDF सहेजें','प्रिंट / PDF जतन करा')}</Button><Button onClick={() => router.push('/dashboard')}>{t('New assessment','नया मूल्यांकन','नवीन मूल्यांकन')}</Button></div>
    </header>
    <Notice><strong>{t('Decision support only. This is not a diagnosis.','केवल निर्णय में सहायता के लिए। यह निदान नहीं है।','केवळ निर्णय घेण्यास मदत. हे निदान नाही.')}</strong><p>{t('This report reflects your health status at the time of assessment and may change with new symptoms. Always consult a qualified healthcare professional.','यह रिपोर्ट मूल्यांकन के समय की स्थिति दर्शाती है। नए लक्षणों से स्थिति बदल सकती है। हमेशा योग्य स्वास्थ्य पेशेवर से सलाह लें।','हा अहवाल मूल्यांकनाच्या वेळची स्थिती दर्शवतो. नवीन लक्षणांमुळे स्थिती बदलू शकते. नेहमी पात्र आरोग्य व्यावसायिकांचा सल्ला घ्या.')}</p></Notice>
    <Section title={t('Why this urgency level?','यह तात्कालिकता क्यों?','ही तातडीची पातळी का?')}><p>{displaySummary}</p><ul className="plain-list">{displayFactors.map((factor,i) => <li key={i}>{factor}</li>)}</ul></Section>
    <Section title={t('What to keep in mind','ध्यान देने योग्य बातें','लक्षात ठेवण्याच्या गोष्टी')}><ul className="plain-list">{keyInsights.map((insight,i) => <li key={i}>{insight}</li>)}</ul></Section>
    <Section title={t('Recommended next steps','अगले कदम','पुढील पावले')}><p><strong>{displayPrimary}</strong></p><ol className="plain-list">{displaySteps.map((step,i) => <li key={i}>{step}</li>)}</ol></Section>
    <Notice tone="warning"><h2>{t('Warning signs to watch','चेतावनी संकेत','धोक्याची लक्षणे')}</h2><ul className="plain-list">{warningSigns.map((sign,i) => <li key={i}>{sign}</li>)}</ul></Notice>
    {drugWarnings.length > 0 && <Notice tone="danger" role="alert"><h2>{t('Medicine-related warnings','दवाइयों से जुड़ी चेतावनियाँ','औषधांशी संबंधित इशारे')}</h2>{drugWarnings.map((w,i) => <p key={i}>{w}</p>)}</Notice>}
    <Section title={t('Recorded scores','दर्ज किए गए स्कोर','नोंदवलेले स्कोअर')}><div className="metric-grid"><RiskGauge score={score} urgency={urgency as Urgency} explanation={riskOneLiner} />{!isLegacy ? <ConfidenceMeter score={Math.round(report.confidenceScore! * 100)} level={report.confidenceLevel || 'Medium'} explanation={report.confidenceExplanation || ''} /> : <div className="metric"><h3>{t('Input pattern score','इनपुट पैटर्न स्कोर','माहितीच्या नमुन्याचा स्कोअर')}</h3><p>{t('Unavailable for this report. The urgency result is still available.','इस रिपोर्ट में उपलब्ध नहीं। तात्कालिकता का परिणाम उपलब्ध है।','या अहवालासाठी उपलब्ध नाही. तातडीचा निकाल उपलब्ध आहे.')}</p></div>}</div></Section>
    {followUp && <Section title={t('How are you now?','अब आप कैसे हैं?','आता तुम्हाला कसे वाटते?')}>
      <p>{t('Tell us what changed after this assessment. Your response helps us review the predictions.','बताएँ कि मूल्यांकन के बाद क्या बदला। आपका जवाब अनुमानों की समीक्षा में मदद करता है।','मूल्यांकनानंतर काय बदलले ते सांगा. तुमचे उत्तर अंदाजांचे पुनरावलोकन करण्यास मदत करते.')}</p>
      {followUp.status === 'responded' ? <Notice><strong>{t('Your check-in has been recorded.','आपकी प्रतिक्रिया दर्ज की गई।','तुमचा अभिप्राय नोंदवला आहे.')}</strong><dl className="facts">
        {followUp.contactedDoctor != null && <div><dt>{t('Saw a doctor','डॉक्टर से मिले','डॉक्टरांना भेटलात')}</dt><dd>{followUp.contactedDoctor ? t('Yes','हाँ','होय') : t('No','नहीं','नाही')}</dd></div>}
        {followUp.improved && <div><dt>{t('Condition','स्थिति','स्थिती')}</dt><dd>{followUp.improved.charAt(0).toUpperCase() + followUp.improved.slice(1)}</dd></div>}
        {followUp.diagnosis && <div><dt>{t('Diagnosis','निदान','निदान')}</dt><dd>{followUp.diagnosis}</dd></div>}
      </dl>{followUp.notes && <p>{followUp.notes}</p>}</Notice> : showCheckInForm || new Date(followUp.scheduledAt) <= new Date() ? <div className="stack">
        <fieldset className="checkin-options"><legend>{t('Did you see a doctor or health professional?','क्या आपने डॉक्टर या स्वास्थ्य पेशेवर से परामर्श किया?','तुम्ही डॉक्टर किंवा आरोग्य व्यावसायिकांचा सल्ला घेतला का?')}</legend><div className="row">{(['yes','no'] as const).map(val => <button key={val} type="button" className="option option-compact" aria-pressed={contactedDoctor === val} onClick={() => setContactedDoctor(val)}>{val === 'yes' ? t('Yes','हाँ','होय') : t('No','नहीं','नाही')}</button>)}</div></fieldset>
        <label className="field"><span>{t('How are your symptoms now?','आपके लक्षण अब कैसे हैं?','तुमची लक्षणे आता कशी आहेत?')}</span><select className="input" value={improved} onChange={e => setImproved(e.target.value)}><option value="">{t('Select…','चुनें…','निवडा…')}</option><option value="worse">{t('Worse','बदतर','अधिक त्रास')}</option><option value="same">{t('Same','वैसे ही','तशीच')}</option><option value="better">{t('Better','बेहतर','सुधारणा')}</option><option value="recovered">{t('Recovered','पूरी तरह ठीक','पूर्णपणे बरे')}</option></select></label>
        <Field id="checkin-diagnosis" label={t('Diagnosis, if a doctor told you','निदान, यदि डॉक्टर ने बताया हो','निदान, डॉक्टरांनी सांगितले असल्यास')} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
        <label className="field"><span>{t('Additional notes','अतिरिक्त टिप्पणियाँ','अतिरिक्त नोंदी')}</span><textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></label>
        {checkInError && <Notice tone="warning" role="alert">{checkInError}</Notice>}
        <Button onClick={submitCheckIn} disabled={checkInSubmitting}>{checkInSubmitting ? t('Saving…','सहेजा जा रहा है…','जतन होत आहे…') : t('Save check-in','प्रतिक्रिया सहेजें','अभिप्राय जतन करा')}</Button>
      </div> : <div className="stack"><p>{t('Check-in scheduled for','प्रतिक्रिया की तय तारीख','अभिप्रायाची नियोजित तारीख')} {new Date(followUp.scheduledAt).toLocaleDateString()}.</p><div><Button variant="secondary" onClick={() => setShowCheckInForm(true)}>{t('Check in now','अभी प्रतिक्रिया दें','आता अभिप्राय द्या')}</Button></div></div>}
    </Section>}
    <Section title={t('Notes for your doctor','डॉक्टर के लिए जानकारी','डॉक्टरांसाठी माहिती')}>
      <p>{t('Quick facts to share at your consultation.','परामर्श के समय साझा करने के लिए जानकारी।','डॉक्टरांच्या भेटीत सांगण्यासाठी माहिती.')}</p>
      <dl className="facts">{[
        { label: t('Assessment date','मूल्यांकन की तारीख','मूल्यांकनाची तारीख'), value: new Date(report.createdAt).toLocaleDateString(langKey === 'hi' ? 'hi-IN' : langKey === 'mr' ? 'mr-IN' : 'en-US',{ year: 'numeric',month: 'short',day: 'numeric' }) },
        { label: t('Patient','मरीज़','रुग्ण'), value: report.personName === 'Myself' ? t('Self','स्वयं','स्वतः') : (report.personName || t('Self','स्वयं','स्वतः')) + relationLabel },
        { label: t('Primary symptom','मुख्य लक्षण','मुख्य लक्षण'), value: primarySymptom.replace(/_/g,' ').replace(/^./,c => c.toUpperCase()) },
        { label: t('Other symptoms','अन्य लक्षण','इतर लक्षणे'), value: additionalSymptoms.length ? additionalSymptoms.slice(0,4).map(s => s.replace(/_/g,' ')).join(', ') : t('None reported','कोई नहीं बताया','काही सांगितले नाही') },
        { label: t('Severity','गंभीरता','तीव्रता'), value: severity.replace(/^./,c => c.toUpperCase()) },
        { label: t('Duration','अवधि','कालावधी'), value: duration },
        { label: t('Urgency','तात्कालिकता','तातडी'), value: urgency + ' (' + score + '/100)' },
        { label: t('Model score','मॉडल स्कोर','मॉडेल स्कोअर'), value: !isLegacy && report.confidenceScore != null ? Math.round(report.confidenceScore * 100) + '% (' + report.confidenceLevel + ')' : t('Unavailable','उपलब्ध नहीं','उपलब्ध नाही') },
        { label: t('Medicines / history','दवाइयाँ / इतिहास','औषधे / इतिहास'), value: medRaw.length ? medRaw.map(m => m.replace(/_/g,' ')).join(', ') : t('None reported','कोई नहीं बताया','काही सांगितले नाही') },
        { label: t('Follow-up','फॉलो-अप','पाठपुरावा'), value: followUp ? followUp.status === 'responded' ? t('Recorded','दर्ज किया गया','नोंदवला') : t('Pending','बाकी है','प्रलंबित') : t('Not scheduled','तय नहीं','नियोजित नाही') },
      ].map(f => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>
      <p>{riskOneLiner} — {displaySummary}</p>
      <div className="no-print"><Button variant="secondary" onClick={() => { try { window.print(); } catch { /* Printing may be unavailable. */ } }}><Printer aria-hidden="true" />{t('Print / save PDF','प्रिंट / PDF सहेजें','प्रिंट / PDF जतन करा')}</Button></div>
    </Section>
  </div></div></AppShell>;
}
