'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Badge, Notice, Section, Button } from '@/components/ui/primitives';
import { useUiText } from '@/components/ui/use-ui-text';
import { Phone, Printer, History, RefreshCw, AlertTriangle, FileQuestion } from 'lucide-react';
import { DiseaseResults } from './DiseaseResults';
import type { DiseasePrediction } from '@/lib/ml/disease';
import { emergencyFindings } from '@/lib/assessment/findings';
import { SCORING_DATASET } from '@/lib/ai-engine/scoring/rules';
import { URGENCY_THRESHOLDS } from '@/lib/ai-engine/scoring/thresholds';
import { formatSymptomName } from '@/lib/assessment/symptomPresentation';

export type ReportLang = 'en' | 'hi' | 'mr';
export type ReportUrgency = 'Low' | 'Medium' | 'High';

export interface ReportModel {
  language: ReportLang;
  urgency: ReportUrgency;
  score: number;
  hasRedFlag?: boolean;
  urgencyExplanation?: string;
  summary?: string;
  factors: string[];
  keyInsights: string[];
  primaryAction: string;
  steps: string[];
  symptoms: { primary: string; additional: string[]; custom?: string };
  ageGroup?: string | null;
  severity: string;
  duration: string;
  medications: string[];
  warningSigns: string[];
  drugWarnings: string[];
  disease: DiseasePrediction | null;
  diseaseStatus: string;
  diseaseError: string;
  showConditions?: boolean;
  ml?: { score: number; level: string; explanation: string } | null;
  onRestart?: () => void;
}

export function ReportView({
  model,
  header,
  footer,
  children,
}: {
  model: ReportModel;
  header?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const t = useUiText();
  const { urgency, score } = model;

  const allSymptoms = [
    model.symptoms.primary,
    ...model.symptoms.additional,
    model.symptoms.custom,
  ].filter(Boolean) as string[];

  // Clinical emergency determination: ONLY verified red flags or max emergency score (100)
  const isEmergency =
    model.hasRedFlag === true ||
    score === 100 ||
    emergencyFindings(allSymptoms).length > 0;

  const badgeLabel =
    isEmergency
      ? t('Emergency Triage', 'आपातकालीन ट्राइएज', 'आपत्कालीन ट्रायज')
      : urgency === 'High'
      ? t('High Urgency (Prompt Evaluation)', 'उच्च तात्कालिकता (शीघ्र परामर्श)', 'उच्च तातडी (त्वरित सल्ला)')
      : urgency === 'Medium'
      ? t('Medium Urgency', 'मध्यम तात्कालिकता', 'मध्यम तातडी')
      : t('Low Urgency', 'कम तात्कालिकता', 'कमी तातडी');

  // Human-readable formatting
  const medLabel =
    model.medications.filter(m => m && m !== 'none').map(m => m.replace(/_/g, ' ')).join(', ') ||
    t('None reported', 'कोई नहीं बताया', 'काही सांगितले नाही');

  const formattedSeverity = model.severity
    ? model.severity.charAt(0).toUpperCase() + model.severity.slice(1)
    : t('Not provided', 'नहीं बताया', 'दिलेली नाही');

  const formattedDuration = model.duration || t('Not provided', 'नहीं बताया', 'दिलेली नाही');

  const formattedAgeGroup = model.ageGroup
    ? model.ageGroup.charAt(0).toUpperCase() + model.ageGroup.slice(1)
    : t('Adult', 'वयस्क', 'प्रौढ');

  // Section 2: Calculate deterministic breakdown points from SCORING_DATASET
  const severityScore = SCORING_DATASET.severity[model.severity.toLowerCase()] ?? 0;
  const durationScore = SCORING_DATASET.duration[model.duration.toLowerCase()] ?? 0;
  const historyScore = model.medications
    .filter(m => m && m !== 'none')
    .reduce((acc, m) => acc + (SCORING_DATASET.medicalHistory[m] ?? 10), 0);

  // Authoritative symptom points:
  // For emergency triage, red flags override to 100 points.
  // Otherwise, calculate symptom points deterministically from symptoms and ensure
  // displayed components strictly reconcile to the authoritative total score.
  const rawPrimaryScore = model.symptoms.primary ? (SCORING_DATASET.symptoms[model.symptoms.primary] ?? 12) : 0;
  const rawAdditionalScore = model.symptoms.additional.reduce((acc, s) => {
    return acc + (SCORING_DATASET.additionalSymptoms[s] ?? SCORING_DATASET.symptoms[s] ?? 8);
  }, 0);
  const calculatedSymptomSum = rawPrimaryScore + rawAdditionalScore;

  // Reconcile symptom score with authoritative score so displayed components always sum to score
  const nonSymptomSum = severityScore + durationScore + historyScore;
  const totalSymptomScore = isEmergency
    ? calculatedSymptomSum
    : Math.max(0, score - nonSymptomSum);

  // Filter out any blank or whitespace strings for clean bullet rendering,
  // and sanitize any remaining DDXPlus evidence codes to human-readable names.
  const validFactors = (model.factors || [])
    .filter(f => f && f.trim().length > 0)
    .map(f => {
      return f
        .replace(/\bE[ _]181\b/gi, formatSymptomName('E_181', model.language))
        .replace(/\bE[ _]97\b/gi, formatSymptomName('E_97', model.language))
        .replace(/\bE[ _]91\b/gi, formatSymptomName('E_91', model.language))
        .replace(/\bE[ _]201\b/gi, formatSymptomName('E_201', model.language))
        .replace(/\bE[ _]66\b/gi, formatSymptomName('E_66', model.language));
    });
  const validSteps = (model.steps || []).filter(s => s && s.trim().length > 0);
  const validWarningSigns = (model.warningSigns || []).filter(w => w && w.trim().length > 0);

  // Date
  const dateStr = new Date().toLocaleDateString(
    model.language === 'hi' ? 'hi-IN' : model.language === 'mr' ? 'mr-IN' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  return (
    <div className="report space-y-6" lang={model.language}>
      {header}

      {/* ── SECTION 1: Assessment Summary ────────────────────────────── */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4" aria-labelledby="summary-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
              {t('Assessment Summary', 'मूल्यांकन सारांश', 'मूल्यांकन सारांश')}
            </span>
            <p className="text-xs text-slate-400 mt-0.5">{dateStr}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge urgency={isEmergency || urgency === 'High' ? 'High' : urgency === 'Medium' ? 'Medium' : 'Low'}>
              {badgeLabel}
            </Badge>
            <span className="text-sm font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
              {score} / 100
            </span>
          </div>
        </div>

        {/* Emergency Notice & CTA: Visually separated and shown ONLY when emergency findings exist */}
        {isEmergency ? (
          <Notice tone="danger" role="alert">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <strong className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" aria-hidden="true" />
                  {t('Emergency Care Required', 'आपातकालीन देखभाल आवश्यक', 'तातडीची आपत्कालीन मदत आवश्यक')}
                </strong>
                <p className="text-sm mt-1">
                  {t(
                    'Your reported symptoms contain emergency red flags. Do not delay seeking medical care.',
                    'आपके लक्षणों में आपातकालीन खतरे के संकेत हैं। तुरंत चिकित्सा सहायता लें।',
                    'तुमच्या लक्षणांमध्ये धोक्याचे संकेत आहेत. लगेच वैद्यकीय मदत घ्या.'
                  )}
                </p>
              </div>
              <a href="tel:108" className="btn btn-danger flex items-center gap-2">
                <Phone className="w-4 h-4" aria-hidden="true" />
                {t('Call Emergency Services (108)', 'आपातकालीन सेवा (108) को कॉल करें', 'आपत्कालीन सेवेला कॉल करा (108)')}
              </a>
            </div>
          </Notice>
        ) : (
          <Notice tone={urgency === 'High' ? 'warning' : urgency === 'Medium' ? 'warning' : 'success'}>
            <div className="space-y-1">
              <strong className="text-sm font-semibold text-slate-800">
                {urgency === 'High'
                  ? t('Prompt Medical Evaluation Advised (Within 12–24 Hours)', 'शीघ्र चिकित्सकीय मूल्यांकन की सलाह (12-24 घंटे के भीतर)', 'त्वरित वैद्यकीय सल्ला (12-24 तासांच्या आत)')
                  : urgency === 'Medium'
                  ? t('Medical Consultation Advised (Within 24–48 Hours)', 'चिकित्सकीय परामर्श की सलाह (24-48 घंटे के भीतर)', 'वैद्यकीय सल्ला (24-48 तासांच्या आत)')
                  : t('Home Care & Symptom Monitoring Advised', 'घरेलू देखभाल और लक्षणों की निगरानी की सलाह', 'घरगुती काळजी आणि लक्षणांचे निरीक्षण')}
              </strong>
              <p className="text-sm text-slate-600">
                {urgency === 'High'
                  ? t(
                      'Your score reflects multiple concurrent moderate symptoms. No acute life-threatening emergency indicators were detected, but prompt evaluation is recommended.',
                      'आपका स्कोर एक साथ कई मध्यम लक्षणों को दर्शाता है। कोई तीव्र जानलेवा आपातकालीन लक्षण नहीं मिला, परंतु शीघ्र डॉक्टर से मिलना अनुशंसित है।',
                      'तुमचा स्कोअर एकाच वेळी अनेक मध्यम लक्षणे दर्शवतो. कोणताही तीव्र जीवघेणा धोका आढळला नाही, परंतु त्वरित तपासणी करणे योग्य ठरेल.'
                    )
                  : model.urgencyExplanation || model.summary || ''}
              </p>
            </div>
          </Notice>
        )}
      </section>

      {/* ── SECTION 2: Why This Urgency Level? ───────────────────────── */}
      <Section title={t('Why This Urgency Level?', 'यह तात्कालिकता स्तर क्यों?', 'ही तातडीची पातळी का?')}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {t(
              'Your urgency level is computed by an independent deterministic rule-based scoring engine for clinical triage guidance:',
              'आपकी तात्कालिकता का स्तर स्वतंत्र नियम-आधारित स्कोरिंग इंजन द्वारा ट्राइएज मार्गदर्शन के लिए निर्धारित किया गया है:',
              'तुमची तातडीची पातळी ट्रायज मार्गदर्शनासाठी स्वतंत्र नियम-आधारित स्कोअरिंग इंजिनद्वारे निश्चित केली गेली आहे:'
            )}
          </p>

          {/* Transparent Scoring Points Breakdown */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-500 mb-3">
              {t('Deterministic Rule Breakdown', 'नियम-आधारित स्कोर विवरण', 'नियम-आधारित स्कोअर तपशील')}
            </h3>
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span>
                  {t('Reported Symptoms', 'बताए गए लक्षण', 'नोंदवलेली लक्षणे')} ({allSymptoms.map(s => formatSymptomName(s, model.language)).filter(Boolean).join(', ')})
                </span>
                <span className="font-semibold text-slate-900">+{totalSymptomScore} {t('pts', 'अंक', 'गुण')}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span>{t('Symptom Severity', 'लक्षण गंभीरता', 'लक्षणांची तीव्रता')} ({formattedSeverity})</span>
                <span className="font-semibold text-slate-900">+{severityScore} {t('pts', 'अंक', 'गुण')}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span>{t('Symptom Duration', 'लक्षण अवधि', 'कालावधी')} ({formattedDuration})</span>
                <span className="font-semibold text-slate-900">+{durationScore} {t('pts', 'अंक', 'गुण')}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span>{t('Health History', 'स्वास्थ्य इतिहास', 'आरोग्य इतिहास')} ({medLabel})</span>
                <span className="font-semibold text-slate-900">+{historyScore} {t('pts', 'अंक', 'गुण')}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span>{t('Emergency Warning Signs', 'आपातकालीन चेतावनी संकेत', 'आपत्कालीन धोक्याची लक्षणे')}</span>
                <span className="font-semibold text-slate-900">
                  {isEmergency ? t('Triggered (+100)', 'ट्रिगर हुआ (+100)', 'सक्रिय (+100)') : t('None detected (+0)', 'कोई नहीं (+0)', 'काही नाही (+0)')}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 font-bold text-slate-900 text-base">
                <span>{t('Total Calculated Urgency Score', 'कुल गणना किया गया स्कोर', 'एकूण मोजलेला स्कोअर')}</span>
                <span className="text-teal-700">{score} / 100</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              {t(
                `Thresholds: Low (< ${URGENCY_THRESHOLDS.medium}), Medium (${URGENCY_THRESHOLDS.medium}–${URGENCY_THRESHOLDS.high - 1}), High (≥ ${URGENCY_THRESHOLDS.high}).`,
                `थ्रेशोल्ड: कम (< ${URGENCY_THRESHOLDS.medium}), मध्यम (${URGENCY_THRESHOLDS.medium}–${URGENCY_THRESHOLDS.high - 1}), उच्च (≥ ${URGENCY_THRESHOLDS.high}).`,
                `मर्यादा: कमी (< ${URGENCY_THRESHOLDS.medium}), मध्यम (${URGENCY_THRESHOLDS.medium}–${URGENCY_THRESHOLDS.high - 1}), उच्च (≥ ${URGENCY_THRESHOLDS.high}).`
              )}
            </p>
          </div>

          {/* Explanation bullets (strictly rendered only if valid text exists) */}
          {validFactors.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-slate-600 mb-2">
                {t('Clinical Contributing Factors:', 'चिकित्सकीय योगदान कारक:', 'वैद्यकीय घटक:')}
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                {validFactors.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      {/* ── SECTION 3 & 4: Possible Conditions & Prediction Confidence ─ */}
      {model.showConditions !== false && (
        <DiseaseResults
          result={model.disease}
          status={model.diseaseStatus}
          error={model.diseaseError}
          language={model.language}
        />
      )}

      {/* ── SECTION 5: Recommended Next Steps ────────────────────────── */}
      <Section title={t('Recommended Next Steps', 'अनुशंसित अगले कदम', 'पुढील शिफारस केलेली पावले')}>
        <div className="space-y-4">
          {model.primaryAction && (
            <div className="p-3.5 bg-teal-50/80 rounded-xl border border-teal-200">
              <span className="text-xs uppercase font-bold text-teal-800 tracking-wider">
                {t('Primary Recommendation', 'प्राथमिक सलाह', 'प्राथमिक सल्ला')}
              </span>
              <p className="text-base font-bold text-teal-950 mt-1">
                {model.primaryAction}
              </p>
            </div>
          )}

          {validSteps.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-600 mb-2">
                {t('Actionable Guidance:', 'महत्वपूर्ण कदम:', 'महत्त्वाची पावले:')}
              </h4>
              <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-700">
                {validSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {validWarningSigns.length > 0 && (
            <Notice tone="warning">
              <strong className="text-sm font-semibold">
                {t('When to seek emergency medical care immediately:', 'कब तुरंत आपातकालीन सहायता लें:', 'कधी त्वरित आपत्कालीन मदत घ्यावी:')}
              </strong>
              <ul className="list-disc pl-5 mt-1.5 space-y-1 text-sm">
                {validWarningSigns.map((sign, i) => (
                  <li key={i}>{sign}</li>
                ))}
              </ul>
            </Notice>
          )}

          {model.drugWarnings.length > 0 && (
            <Notice tone="danger" role="alert">
              <strong>{t('Medication Interaction Warnings', 'दवाइयों से संबंधित चेतावनियाँ', 'औषधांशी संबंधित इशारे')}</strong>
              {model.drugWarnings.map((w, i) => <p key={i} className="text-sm mt-1">{w}</p>)}
            </Notice>
          )}
        </div>
      </Section>

      {/* ── SECTION 6: Reported Information ─────────────────────────── */}
      <Section title={t('Reported Information', 'दर्ज की गई जानकारी', 'नोंदवलेली माहिती')}>
        <dl className="facts">
          <div>
            <dt>{t('Age Group', 'आयु वर्ग', 'वयोगट')}</dt>
            <dd><strong>{formattedAgeGroup}</strong></dd>
          </div>
          <div>
            <dt>{t('Reported Symptoms', 'बताए गए लक्षण', 'नोंदवलेली लक्षणे')}</dt>
            <dd>
              <strong>
                {allSymptoms.length > 0
                  ? allSymptoms.map(s => formatSymptomName(s, model.language)).filter(Boolean).join(', ')
                  : t('None recorded', 'कोई नहीं', 'काही नाही')}
              </strong>
            </dd>
          </div>
          <div>
            <dt>{t('Symptom Severity', 'गंभीरता', 'तीव्रता')}</dt>
            <dd>{formattedSeverity}</dd>
          </div>
          <div>
            <dt>{t('Symptom Duration', 'अवधि', 'कालावधी')}</dt>
            <dd>{formattedDuration}</dd>
          </div>
          <div>
            <dt>{t('Medical History', 'स्वास्थ्य इतिहास', 'आरोग्य इतिहास')}</dt>
            <dd>{medLabel}</dd>
          </div>
        </dl>
      </Section>

      {/* ── SECTION 7: Questions for Your Doctor ─────────────────────── */}
      <Section title={t('Questions for Your Doctor', 'डॉक्टर से पूछने योग्य प्रश्न', 'डॉक्टरांना विचारण्याचे प्रश्न')}>
        <p className="text-xs text-slate-500 mb-3">
          {t(
            'Take these questions to your consultation to ensure all key clinical concerns are evaluated:',
            'अपने परामर्श के समय ये प्रश्न पूछें ताकि कोई मुख्य चिकित्सकीय बात छूटे नहीं:',
            'वैद्यकीय सल्ल्याच्या वेळी हे प्रश्न विचारा जेणेकरून कोणतीही महत्त्वाची बाब दुर्लक्षित राहणार नाही:'
          )}
        </p>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5">
            <FileQuestion className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              {t(
                `Given my ${allSymptoms.map(s => formatSymptomName(s, 'en').toLowerCase()).join(', ')} lasting ${formattedDuration}, what clinical examinations or diagnostic tests do you recommend?`,
                `मेरे ${allSymptoms.map(s => formatSymptomName(s, 'hi')).join(', ')} के लक्षणों को देखते हुए आप कौन-सी जाँच की सलाह देते हैं?`,
                `माझ्या ${allSymptoms.map(s => formatSymptomName(s, 'mr')).join(', ')} लक्षणांनुसार आपण कोणत्या तपासण्या सुचवता?`
              )}
            </span>
          </li>
          <li className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5">
            <FileQuestion className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              {t(
                'Could these symptoms be related to a single underlying infection or inflammatory process?',
                'क्या ये लक्षण किसी एक संक्रमण या जलन/सूजन से जुड़े हो सकते हैं?',
                'ही लक्षणे एखाद्या संसर्गाशी किंवा अंतर्गत सूजेशी संबंधित असू शकतात का?'
              )}
            </span>
          </li>
          <li className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5">
            <FileQuestion className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              {t(
                'What specific danger signs should prompt me to go directly to an emergency department?',
                'किन विशिष्ट चेतावनी संकेतों पर मुझे तुरंत आपातकालीन कक्ष में जाना चाहिए?',
                'कोणत्या विशिष्ट धोक्याच्या लक्षणांवर मी थेट आपत्कालीन विभागात जावे?'
              )}
            </span>
          </li>
        </ul>
      </Section>

      {/* ── SECTION 8: Report Actions ────────────────────────────────── */}
      <section className="bg-slate-50 rounded-2xl p-6 border border-slate-200 no-print" aria-label="Report Actions">
        <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-4">
          {t('Report Actions', 'रिपोर्ट कार्य', 'अहवाल कृती')}
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => { try { window.print(); } catch {} }}>
            <Printer className="w-4 h-4 mr-2" aria-hidden="true" />
            {t('Print / Save PDF', 'प्रिंट / PDF सहेजें', 'प्रिंट / PDF जतन करा')}
          </Button>

          <Link href="/dashboard/reports" className="btn btn-secondary">
            <History className="w-4 h-4 mr-2" aria-hidden="true" />
            {t('View Past Reports', 'पुराने रिपोर्ट देखें', 'मागील अहवाल पहा')}
          </Link>

          <Link href="/dashboard/assessment" className="btn btn-primary">
            <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
            {t('Start New Assessment', 'नया मूल्यांकन शुरू करें', 'नवीन मूल्यांकन सुरू करा')}
          </Link>
        </div>
      </section>

      {children}
      {footer}
    </div>
  );
}
