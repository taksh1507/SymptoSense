'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button, Field, Notice, Section } from '@/components/ui/primitives';
import { useUiText } from '@/components/ui/use-ui-text';
import AppShell from '@/app/components/AppShell';
import { useApp } from '@/app/context/AppContext';
import { ReportView, type ReportModel, type ReportUrgency } from '@/components/results/ReportView';
import {
  generateRiskExplanation,
  generateRecommendations,
  type RiskLevel,
} from '@/lib/report/reasoningEngine';
import { COLOR_THRESHOLDS } from '@/lib/ai-engine/scoring/thresholds';
import { parseStoredAssessment } from '@/lib/report/parseAnswers';
import { getWarningSigns, getDrugWarnings } from '@/lib/report/warnings';

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
  recommendationSteps?: string[]; // JSON string[]
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

function parseJsonArray(value: string | undefined): string[] {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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
        <div className="[display:flex] [align-items:center] [justify-content:center] [height:60vh] [color:var(--text-4)] [font-size:var(--text-sm)]">
          {language === 'Hindi' ? 'रिपोर्ट लोड हो रही है...' : language === 'Marathi' ? 'अहवाल लोड होत आहे...' : 'Loading report...'}
        </div>
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell>
        <div className="[padding:40px] [text-align:left]">
          <p className="[color:var(--text-3)] [margin-bottom:16px]">{loadError || 'Report not found.'}</p>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard/reports')}>
            Back to Reports
          </button>
        </div>
      </AppShell>
    );
  }

  // ── Derived data ──────────────────────────────────────────────
  const score = report.score ?? 0;
  const urgency = (report.urgency ?? 'Low') as RiskLevel;

  const parsed = parseStoredAssessment(report.answers, report.assessmentPayload);
  const { primarySymptom, severity, duration, additionalSymptoms, medicalHistory } = parsed;

  const isLegacy = report.confidenceScore == null;

  const displayName = report.personName && report.personName !== 'Myself' ? report.personName : null;
  const relationLabel = !report.isSelf && report.relation ? ` (${report.relation})` : '';
  const reportTitle = displayName
    ? t('Assessment', 'मूल्यांकन', 'मूल्यांकन') + ': ' + displayName + relationLabel
    : (language === 'Hindi' ? 'स्वास्थ्य मूल्यांकन' : language === 'Marathi' ? 'आरोग्य मूल्यांकन' : 'Health Assessment');

  const reasoningInput = { primarySymptom, severity, duration, additionalSymptoms, medicalHistory, riskLevel: urgency, riskScore: score };
  const localReasoning = generateRiskExplanation(reasoningInput);
  const localRecommendations = generateRecommendations(reasoningInput);
  const warningSigns = getWarningSigns(primarySymptom, additionalSymptoms, urgency);

  const riskOneLiner = report.riskReasoning
    || `${urgency} risk based on ${primarySymptom.replace(/_/g, ' ')} with ${severity} severity.`;

  const displaySummary = report.riskSummary || localReasoning.summary;

  const displayFactors: string[] = (() => {
    const stored = parseJsonArray(report.riskFactors);
    return stored.length > 0 ? stored : localReasoning.factors;
  })();

  const displayPrimary = report.primaryAction || localRecommendations.primaryAction;

  const displaySteps: string[] = (() => {
    const stored = parseJsonArray(report.recommendationSteps as unknown as string);
    return stored.length > 0 ? stored : localRecommendations.steps;
  })();

  const keyInsights: string[] = (() => {
    const stored = parseJsonArray(report.keyInsights);
    if (stored.length > 0) return stored;
    const symptomLabel = primarySymptom.replace(/_/g, ' ');
    return [
      `${symptomLabel.charAt(0).toUpperCase() + symptomLabel.slice(1)} identified as the primary symptom`,
      `Severity reported as ${severity}`,
      score < COLOR_THRESHOLDS.high ? 'No critical emergency indicators detected at time of assessment' : 'High-risk indicators were present at time of assessment',
    ];
  })();

  const medRaw = medicalHistory;
  const onBloodThinners = medRaw.includes('blood_thinners') || medRaw.includes('blood_thinner') || medRaw.includes('blood thinner');
  const drugWarnings = getDrugWarnings(onBloodThinners, [...parsed.allSymptoms, ...additionalSymptoms, ...medRaw]);

  const model: ReportModel = {
    language: langKey,
    urgency: urgency as ReportUrgency,
    score,
    urgencyExplanation: riskOneLiner,
    summary: displaySummary,
    factors: displayFactors,
    keyInsights,
    primaryAction: displayPrimary,
    steps: displaySteps,
    symptoms: { primary: primarySymptom, additional: additionalSymptoms },
    severity,
    duration,
    medications: medRaw,
    warningSigns,
    drugWarnings,
    disease: null,
    diseaseStatus: 'unavailable',
    diseaseError: '',
    showConditions: false,
    ml: isLegacy ? null : {
      score: Math.round((report.confidenceScore as number) * 100),
      level: report.confidenceLevel || 'Medium',
      explanation: report.confidenceExplanation || '',
    },
  };

  const dateText = new Date(report.createdAt).toLocaleDateString(
    langKey === 'hi' ? 'hi-IN' : langKey === 'mr' ? 'mr-IN' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );

  const header = (
    <>
      <div className="row between no-print">
        <Button variant="secondary" onClick={() => router.push('/dashboard/reports')}>
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {t('Back to reports', 'रिपोर्ट पर वापस जाएँ', 'अहवालांकडे परत जा')}
        </Button>
        <Button variant="secondary" onClick={() => { try { window.print(); } catch { /* Printing unavailable in some embedded browsers. */ } }}>
          <Printer className="w-4 h-4" aria-hidden="true" />
          {t('Print / save PDF', 'प्रिंट / PDF सहेजें', 'प्रिंट / PDF जतन करा')}
        </Button>
      </div>
      <header className="report-header stack">
        <p className="eyebrow">{t('Saved report', 'सहेजी गई रिपोर्ट', 'जतन केलेला अहवाल')}</p>
        <h1>{reportTitle}</h1>
        <p className="muted">{dateText}</p>
      </header>
      <Notice>
        <strong>{t('Decision support only. This is not a diagnosis.', 'केवल निर्णय में सहायता के लिए। यह निदान नहीं है।', 'केवळ निर्णय घेण्यासाठी मदत. हे निदान नाही.')}</strong>
        <p>{t('This report reflects your health status at the time of assessment and may change with new symptoms. Always consult a qualified healthcare professional.', 'यह रिपोर्ट मूल्यांकन के समय की स्थिति दर्शाती है। नए लक्षणों से स्थिति बदल सकती है। हमेशा योग्य स्वास्थ्य पेशेवर से सलाह लें।', 'हा अहवाल मूल्यांकनाच्या वेळची स्थिती दर्शवतो. नवीन लक्षणांमुळे स्थिती बदलू शकते. नेहमी पात्र आरोग्य व्यावसायिकांचा सल्ला घ्या.')}</p>
      </Notice>
    </>
  );

  const children = (
    <>
      <Section title={t('Notes for your doctor', 'डॉक्टर के लिए जानकारी', 'डॉक्टरांसाठी माहिती')}>
        <p>{t('Quick facts to share at your consultation.', 'परामर्श के समय साझा करने के लिए जानकारी।', 'डॉक्टरांच्या भेटीत सांगण्यासाठी माहिती.')}</p>
        <dl className="facts">{[
          { label: t('Assessment date', 'मूल्यांकन की तारीख', 'मूल्यांकनाची तारीख'), value: new Date(report.createdAt).toLocaleDateString(langKey === 'hi' ? 'hi-IN' : langKey === 'mr' ? 'mr-IN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) },
          { label: t('Patient', 'मरीज़', 'रुग्ण'), value: report.personName === 'Myself' ? t('Self', 'स्वयं', 'स्वतः') : (report.personName || t('Self', 'स्वयं', 'स्वतः')) + relationLabel },
          { label: t('Primary symptom', 'मुख्य लक्षण', 'मुख्य लक्षण'), value: primarySymptom.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) },
          { label: t('Other symptoms', 'अन्य लक्षण', 'इतर लक्षणे'), value: additionalSymptoms.length ? additionalSymptoms.slice(0, 4).map(s => s.replace(/_/g, ' ')).join(', ') : t('None reported', 'कोई नहीं बताया', 'काही सांगितले नाही') },
          { label: t('Severity', 'गंभीरता', 'तीव्रता'), value: severity.replace(/^./, c => c.toUpperCase()) },
          { label: t('Duration', 'अवधि', 'कालावधी'), value: duration },
          { label: t('Urgency', 'तात्कालिकता', 'तातडी'), value: urgency + ' (' + score + '/100)' },
          { label: t('Model score', 'मॉडल स्कोर', 'मॉडेल स्कोअर'), value: !isLegacy && report.confidenceScore != null ? Math.round(report.confidenceScore * 100) + '% (' + report.confidenceLevel + ')' : t('Unavailable', 'उपलब्ध नहीं', 'उपलब्ध नाही') },
          { label: t('Medicines / history', 'दवाइयाँ / इतिहास', 'औषधे / इतिहास'), value: medRaw.length ? medRaw.map(m => m.replace(/_/g, ' ')).join(', ') : t('None reported', 'कोई नहीं बताया', 'काही सांगितले नाही') },
          { label: t('Follow-up', 'फॉलो-अप', 'पाठपुरावा'), value: followUp ? followUp.status === 'responded' ? t('Recorded', 'दर्ज किया गया', 'नोंदवला') : t('Pending', 'बाकी है', 'प्रलंबित') : t('Not scheduled', 'तय नहीं', 'नियोजित नाही') },
        ].map(f => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>
      </Section>

      {followUp && (
        <Section title={t('How are you now?', 'अब आप कैसे हैं?', 'आता तुम्हाला कसे वाटते?')}>
          <p>{t('Tell us what changed after this assessment. Your response helps us review the predictions.', 'बताएँ कि मूल्यांकन के बाद क्या बदला। आपका जवाब अनुमानों की समीक्षा में मदद करता है।', 'मूल्यांकनानंतर काय बदलले ते सांगा. तुमचे उत्तर अंदाजांचे पुनरावलोकन करण्यास मदत करते.')}</p>
          {followUp.status === 'responded' ? (
            <Notice>
              <strong>{t('Your check-in has been recorded.', 'आपकी प्रतिक्रिया दर्ज की गई।', 'तुमचा अभिप्राय नोंदवला आहे.')}</strong>
              <dl className="facts">
                {followUp.contactedDoctor != null && <div><dt>{t('Saw a doctor', 'डॉक्टर से मिले', 'डॉक्टरांना भेटलात')}</dt><dd>{followUp.contactedDoctor ? t('Yes', 'हाँ', 'होय') : t('No', 'नहीं', 'नाही')}</dd></div>}
                {followUp.improved && <div><dt>{t('Condition', 'स्थिति', 'स्थिती')}</dt><dd>{followUp.improved.charAt(0).toUpperCase() + followUp.improved.slice(1)}</dd></div>}
                {followUp.diagnosis && <div><dt>{t('Diagnosis', 'निदान', 'निदान')}</dt><dd>{followUp.diagnosis}</dd></div>}
              </dl>
              {followUp.notes && <p>{followUp.notes}</p>}
            </Notice>
          ) : showCheckInForm || new Date(followUp.scheduledAt) <= new Date() ? (
            <div className="stack">
              <fieldset className="checkin-options">
                <legend>{t('Did you see a doctor or health professional?', 'क्या आपने डॉक्टर या स्वास्थ्य पेशेवर से परामर्श किया?', 'तुम्ही डॉक्टर किंवा आरोग्य व्यावसायिकांचा सल्ला घेतला का?')}</legend>
                <div className="row">{(['yes', 'no'] as const).map(val => <button key={val} type="button" className="option option-compact" aria-pressed={contactedDoctor === val} onClick={() => setContactedDoctor(val)}>{val === 'yes' ? t('Yes', 'हाँ', 'होय') : t('No', 'नहीं', 'नाही')}</button>)}</div>
              </fieldset>
              <label className="field"><span>{t('How are your symptoms now?', 'आपके लक्षण अब कैसे हैं?', 'तुमची लक्षणे आता कशी आहेत?')}</span><select className="input" value={improved} onChange={e => setImproved(e.target.value)}><option value="">{t('Select…', 'चुनें…', 'निवडा…')}</option><option value="worse">{t('Worse', 'बदतर', 'अधिक त्रास')}</option><option value="same">{t('Same', 'वैसे ही', 'तशीच')}</option><option value="better">{t('Better', 'बेहतर', 'सुधारणा')}</option><option value="recovered">{t('Recovered', 'पूरी तरह ठीक', 'पूर्णपणे बरे')}</option></select></label>
              <Field id="checkin-diagnosis" label={t('Diagnosis, if a doctor told you', 'निदान, यदि डॉक्टर ने बताया हो', 'निदान, डॉक्टरांनी सांगितले असल्यास')} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
              <label className="field"><span>{t('Additional notes', 'अतिरिक्त टिप्पणियाँ', 'अतिरिक्त नोंदी')}</span><textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></label>
              {checkInError && <Notice tone="warning" role="alert">{checkInError}</Notice>}
              <Button onClick={submitCheckIn} disabled={checkInSubmitting}>{checkInSubmitting ? t('Saving…', 'सहेजा जा रहा है…', 'जतन होत आहे…') : t('Save check-in', 'प्रतिक्रिया सहेजें', 'अभिप्राय जतन करा')}</Button>
            </div>
          ) : (
            <div className="stack">
              <p>{t('Check-in scheduled for', 'प्रतिक्रिया की तय तारीख', 'अभिप्रायाची नियोजित तारीख')} {new Date(followUp.scheduledAt).toLocaleDateString()}.</p>
              <div><Button variant="secondary" onClick={() => setShowCheckInForm(true)}>{t('Check in now', 'अभी प्रतिक्रिया दें', 'आता अभिप्राय द्या')}</Button></div>
            </div>
          )}
        </Section>
      )}
    </>
  );

  return (
    <AppShell>
      <div className="page">
        <ReportView model={model} header={header} footer={null}>
          {children}
        </ReportView>
      </div>
    </AppShell>
  );
}
