'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
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
function parseAnswers(answersJson: string) {
  try {
    const arr: { questionId: string; answer: string }[] = JSON.parse(answersJson || '[]');
    const map: Record<string, string> = {};
    arr.forEach((a) => { map[a.questionId] = a.answer; });
    return {
      primarySymptom: (map['q1'] || map['q0'] || '').split(',')[0] || 'general',
      allSymptoms: (map['q1'] || map['q0'] || '').split(',').filter(Boolean),
      severity: map['q2'] || 'mild',
      duration: map['q3'] || '< 1 day',
      additionalSymptoms: (map['q4'] || '').split(',').filter(s => s && s !== 'none'),
      medicalHistory: Object.entries(map)
        .filter(([k]) => !['q0','q1','q2','q3','q4'].includes(k))
        .map(([, v]) => v)
        .filter(v => v && v !== 'none'),
    };
  } catch {
    return { primarySymptom: 'general', allSymptoms: [], severity: 'mild', duration: '< 1 day', additionalSymptoms: [], medicalHistory: [] };
  }
}

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

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { language } = useApp();
  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
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
        .then((r) => r.json())
        .catch(() => null),
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-4)', fontSize: '14px' }}>
          {language === 'Hindi' ? 'रिपोर्ट लोड हो रही है...' : language === 'Marathi' ? 'अहवाल लोड होत आहे...' : 'Loading report...'}
        </div>
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-3)', marginBottom: '16px' }}>Report not found.</p>
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
  const riskColor = score >= COLOR_THRESHOLDS.high ? 'var(--red)' : score >= COLOR_THRESHOLDS.medium ? '#B45309' : '#15803D';
  const riskBg    = score >= COLOR_THRESHOLDS.high ? 'var(--red-light)' : score >= COLOR_THRESHOLDS.medium ? '#FFFBEB' : '#F0FDF4';

  const parsed = parseAnswers(report.answers);
  const { primarySymptom, severity, duration, additionalSymptoms, medicalHistory } = parsed;

  const isLegacy = report.confidenceScore == null;

  // Personalized header — include relation if stored
  const displayName = report.personName && report.personName !== 'Myself' ? report.personName : null;
  const relationLabel = !report.isSelf && report.relation ? ` (${report.relation})` : '';
  const reportTitle = displayName
    ? `Health Assessment for ${displayName}${relationLabel}`
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

  return (
    <AppShell>
      <div className="mobile-padding" style={{ padding: '32px 24px', minHeight: '100%', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* ── Personalized Header ── */}
          <div>
            <button
              onClick={() => router.push('/dashboard/reports')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit', marginBottom: '14px', padding: 0 }}
            >
              ← {language === 'Hindi' ? 'वापस जाएं' : language === 'Marathi' ? 'परत जा' : 'Back to Reports'}
            </button>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-1)', margin: 0, letterSpacing: '-0.5px' }}>
                    {reportTitle}
                  </h1>
                  {/* Saved Report badge */}
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '999px', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', letterSpacing: '0.04em' }}>
                    ✓ Saved Report
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
                  {new Date(report.createdAt).toLocaleDateString(
                    langKey === 'hi' ? 'hi-IN' : langKey === 'mr' ? 'mr-IN' : 'en-US',
                    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
                  )}
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => router.push('/dashboard')}
                style={{ fontSize: '13px', padding: '9px 18px', flexShrink: 0 }}
              >
                {language === 'Hindi' ? 'नया मूल्यांकन' : language === 'Marathi' ? 'नवीन मूल्यांकन' : 'New Assessment'}
              </button>
            </div>
          </div>

          {/* ── Gauges ── */}
          <div className="card" style={{ padding: '28px', borderRadius: '24px', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-1)', margin: '0 0 4px 0' }}>
                {language === 'Hindi' ? 'मूल्यांकन सारांश' : language === 'Marathi' ? 'मूल्यांकन सारांश' : 'Assessment Summary'}
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--text-4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                Historical Snapshot
              </p>
            </div>

            <div className="mobile-flex-stack" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', gap: '20px' }}>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <RiskGauge score={score} urgency={urgency as Urgency} explanation={riskOneLiner} />
              </div>

              <div className="mobile-hide" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '90px', textAlign: 'center', alignSelf: 'center' }}>
                <div style={{ width: '1px', height: '32px', background: 'var(--border-faint)', marginBottom: '10px' }} />
                <p style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-4)', lineHeight: '1.4', textTransform: 'uppercase' }}>
                  Risk tells <span style={{ color: 'var(--text-1)' }}>WHAT</span>
                </p>
                <div style={{ height: '18px' }} />
                <p style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-4)', lineHeight: '1.4', textTransform: 'uppercase' }}>
                  Confidence tells <span style={{ color: 'var(--text-1)' }}>HOW</span> reliable
                </p>
                <div style={{ width: '1px', height: '32px', background: 'var(--border-faint)', marginTop: '10px' }} />
              </div>

              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                {!isLegacy ? (
                  <ConfidenceMeter
                    score={Math.round(report.confidenceScore! * 100)}
                    level={report.confidenceLevel || 'Medium'}
                    explanation={report.confidenceExplanation || ''}
                  />
                ) : (
                  <div style={{ padding: '28px 20px', background: 'var(--bg)', borderRadius: '20px', border: '1.5px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', maxWidth: '220px' }}>
                    <div style={{ fontSize: '28px', marginBottom: '12px' }}>📊</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-2)', marginBottom: '6px' }}>Prediction Reliability</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-4)', lineHeight: '1.5' }}>
                      Not available for this report. New assessments include confidence scores.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Why this risk level? ── */}
          <div className="card" style={{ padding: '24px 28px', borderRadius: '20px', borderLeft: '5px solid ' + riskColor }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔍</span>
              {language === 'Hindi' ? 'यह जोखिम स्तर क्यों?' : language === 'Marathi' ? 'हा जोखीम स्तर का?' : 'Why this risk level?'}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: '1.6', marginBottom: '14px', fontStyle: 'italic' }}>
              {displaySummary}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {displayFactors.map((factor, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: riskColor, flexShrink: 0, marginTop: '7px' }} />
                  <span style={{ fontSize: '13.5px', color: 'var(--text-2)', lineHeight: '1.5' }}>{factor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Key Insights ── */}
          <div className="card" style={{ padding: '24px 28px', borderRadius: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💡</span>
              {language === 'Hindi' ? 'मुख्य निष्कर्ष' : language === 'Marathi' ? 'मुख्य निष्कर्ष' : 'Key Insights'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {keyInsights.map((insight, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: '7px' }} />
                  <span style={{ fontSize: '13.5px', color: 'var(--text-2)', lineHeight: '1.5' }}>{insight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── What you should do now ── */}
          <div className="card" style={{ padding: '0', overflow: 'hidden', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ background: riskBg, padding: '22px 28px', borderBottom: '1px solid var(--border-faint)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-1)', margin: 0 }}>
                  {language === 'Hindi' ? 'अनुशंसित कार्रवाई' : language === 'Marathi' ? 'शिफारस केलेली कृती' : 'What you should do'}
                </h3>
                <span style={{ background: riskColor, color: 'white', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '800' }}>
                  {urgency.toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: '15px', fontWeight: '700', color: riskColor, margin: 0 }}>
                {displayPrimary}
              </p>
              {/* Read-only note */}
              <p style={{ fontSize: '11.5px', color: 'var(--text-4)', marginTop: '8px', fontStyle: 'italic' }}>
                This is historical guidance based on your assessment at the time.
              </p>
            </div>
            <div style={{ padding: '18px 28px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {displaySteps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800', color: 'var(--text-3)', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize: '13.5px', color: 'var(--text-2)', lineHeight: '1.55', paddingTop: '1px' }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Warning Signs ── */}
          <div className="card" style={{ padding: '24px 28px', borderRadius: '20px', background: score >= COLOR_THRESHOLDS.high ? '#FFF5F5' : 'white', border: score >= COLOR_THRESHOLDS.high ? '1px solid var(--red-border)' : '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span>
              {language === 'Hindi' ? 'चेतावनी संकेत' : language === 'Marathi' ? 'सावधानीचे संकेत' : 'Warning Signs to Watch'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {warningSigns.map((sign, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#B45309', flexShrink: 0, marginTop: '7px' }} />
                  <span style={{ fontSize: '13.5px', color: 'var(--text-2)', lineHeight: '1.5' }}>{sign}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Outcome Check-in ── */}
          {followUp && (
            <div className="card" style={{ padding: '24px 28px', borderRadius: '20px', border: '1.5px solid var(--border)', background: '#FAFBFF' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✅</span>
                {language === 'Hindi' ? 'फॉलो-अप चेक-इन' : language === 'Marathi' ? 'फॉलो-अप तपासणी' : 'Outcome Check-in'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 14px 0', lineHeight: '1.5' }}>
                {language === 'Hindi'
                  ? 'आपके मूल्यांकन के बाद आपकी स्थिति में क्या बदलाव आया? यह हमें अपनी भविष्यवाणियों को बेहतर बनाने में मदद करता है।'
                  : language === 'Marathi'
                    ? 'तुमच्या मूल्यांकनानंतर तुमच्या स्थितीत काय बदलले? हे आम्हाला आमच्या अंदाज सुधारण्यास मदत करते.'
                    : 'How were things after your assessment? This helps us improve our predictions.'}
              </p>

              {followUp.status === 'responded' ? (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '14px 16px' }}>
                  <p style={{ fontSize: '13.5px', fontWeight: '700', color: '#15803D', margin: '0 0 6px 0' }}>
                    {language === 'Hindi' ? '✓ आपकी प्रतिक्रिया दर्ज की गई' : language === 'Marathi' ? '✓ तुमचा अभिप्राय नोंदवला' : '✓ Your check-in has been recorded'}
                  </p>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-3)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {followUp.contactedDoctor != null && (
                      <span>• {language === 'Hindi' ? 'डॉक्टर से परामर्श किया' : language === 'Marathi' ? 'डॉक्टरांचा सल्ला घेतला' : 'Contacted a doctor'}: {followUp.contactedDoctor ? (language === 'Hindi' ? 'हाँ' : language === 'Marathi' ? 'होय' : 'Yes') : (language === 'Hindi' ? 'नहीं' : language === 'Marathi' ? 'नाही' : 'No')}</span>
                    )}
                    {followUp.improved && <span>• {language === 'Hindi' ? 'स्थिति' : language === 'Marathi' ? 'स्थिती' : 'Condition'}: {followUp.improved}</span>}
                    {followUp.diagnosis && <span>• {language === 'Hindi' ? 'निदान' : language === 'Marathi' ? 'निदान' : 'Diagnosis'}: {followUp.diagnosis}</span>}
                    {followUp.notes && <span>• {followUp.notes}</span>}
                  </div>
                </div>
              ) : showCheckInForm || new Date(followUp.scheduledAt) <= new Date() ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <p style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-2)', margin: '0 0 8px 0' }}>
                      {language === 'Hindi' ? 'क्या आपने डॉक्टर या स्वास्थ्य पेशेवर से परामर्श किया?' : language === 'Marathi' ? 'तुम्ही डॉक्टर किंवा आरोग्य व्यावसायिकांचा सल्ला घेतला का?' : 'Did you see a doctor or health professional?'}
                    </p>
                    <div role="radiogroup" aria-label="Contacted a doctor" style={{ display: 'flex', gap: '10px' }}>
                      {(['yes', 'no'] as const).map((val) => (
                        <button
                          key={val}
                          type="button"
                          aria-pressed={contactedDoctor === val}
                          onClick={() => setContactedDoctor(val)}
                          style={{
                            padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: '600',
                            border: contactedDoctor === val ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                            background: contactedDoctor === val ? 'var(--primary-soft, #EFF6FF)' : 'white',
                            color: contactedDoctor === val ? 'var(--primary)' : 'var(--text-3)',
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          {val === 'yes'
                            ? (language === 'Hindi' ? 'हाँ' : language === 'Marathi' ? 'होय' : 'Yes')
                            : (language === 'Hindi' ? 'नहीं' : language === 'Marathi' ? 'नाही' : 'No')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-2)', margin: '0 0 8px 0' }}>
                      {language === 'Hindi' ? 'आपके लक्षण अब कैसे हैं?' : language === 'Marathi' ? 'तुमची लक्षणे आता कशी आहेत?' : 'How are your symptoms now?'}
                    </p>
                    <select
                      value={improved}
                      onChange={(e) => setImproved(e.target.value)}
                      aria-label="Current condition"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid var(--border)', fontSize: '13.5px', fontFamily: 'inherit', background: 'white', color: 'var(--text-1)' }}
                    >
                      <option value="">{language === 'Hindi' ? 'चुनें...' : language === 'Marathi' ? 'निवडा...' : 'Select...'}</option>
                      <option value="worse">Worse</option>
                      <option value="same">Same</option>
                      <option value="better">Better</option>
                      <option value="recovered">{language === 'Hindi' ? 'पूरी तरह ठीक' : language === 'Marathi' ? 'पूर्णपणे बरे' : 'Recovered'}</option>
                    </select>
                  </div>

                  <div>
                    <p style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-2)', margin: '0 0 8px 0' }}>
                      {language === 'Hindi' ? 'निदान (यदि डॉक्टर ने बताया हो):' : language === 'Marathi' ? 'निदान (जर डॉक्टरांनी सांगितले असेल):' : 'Diagnosis (if the doctor told you):'}
                    </p>
                    <input
                      type="text"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      aria-label="Diagnosis"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid var(--border)', fontSize: '13.5px', fontFamily: 'inherit', background: 'white', color: 'var(--text-1)' }}
                    />
                  </div>

                  <div>
                    <p style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-2)', margin: '0 0 8px 0' }}>
                      {language === 'Hindi' ? 'अतिरिक्त टिप्पणियां' : language === 'Marathi' ? 'अतिरिक्त टिप्पण्या' : 'Additional notes'}
                    </p>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      aria-label="Additional notes"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid var(--border)', fontSize: '13.5px', fontFamily: 'inherit', background: 'white', color: 'var(--text-1)', resize: 'vertical' }}
                    />
                  </div>

                  {checkInError && <p style={{ fontSize: '12.5px', color: 'var(--red)', margin: 0 }}>{checkInError}</p>}

                  <button className="btn btn-primary" onClick={submitCheckIn} disabled={checkInSubmitting} style={{ alignSelf: 'flex-start', fontSize: '13px', padding: '10px 20px' }}>
                    {checkInSubmitting
                      ? (language === 'Hindi' ? 'सहेजा जा रहा है...' : language === 'Marathi' ? 'जतन होत आहे...' : 'Saving...')
                      : (language === 'Hindi' ? 'चेक-इन सबमिट करें' : language === 'Marathi' ? 'तपासणी सबमिट करा' : 'Submit check-in')}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-3)', margin: 0 }}>
                    {language === 'Hindi'
                      ? `हम ${new Date(followUp.scheduledAt).toLocaleDateString()} को आपकी स्थिति देखेंगे।`
                      : language === 'Marathi'
                        ? `आम्ही ${new Date(followUp.scheduledAt).toLocaleDateString()} रोजी तुमची स्थिती पाहू.`
                        : `We'll check in on you on ${new Date(followUp.scheduledAt).toLocaleDateString()}.`}
                  </p>
                  <button className="btn btn-outline" onClick={() => setShowCheckInForm(true)} style={{ fontSize: '12.5px', padding: '8px 16px' }}>
                    {language === 'Hindi' ? 'अभी चेक-इन करें' : language === 'Marathi' ? 'आता तपासणी करा' : 'Check in now'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Disclaimer + Footer ── */}
          <div style={{ padding: '20px 0', borderTop: '1px solid var(--border-faint)', textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'flex-start', gap: '10px',
              background: 'var(--red-light)', border: '1.5px solid var(--red-border)',
              borderLeft: '4px solid var(--red)',
              borderRadius: 'var(--radius)', padding: '12px 18px',
              maxWidth: '580px', margin: '0 auto 16px', textAlign: 'left',
            }}>
              <span style={{ fontSize: '15px', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
              <p style={{ fontSize: '12.5px', color: 'var(--red-text)', lineHeight: '1.6', margin: 0, fontWeight: '600' }}>
                <strong style={{ fontWeight: '800', color: 'var(--red)' }}>Disclaimer: </strong>
                This report reflects your health status at the time of assessment and may change with new symptoms. It is not a medical diagnosis — always consult a qualified healthcare professional.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => router.push('/dashboard/reports')} className="btn btn-outline" style={{ fontSize: '13px' }}>
                ← All Reports
              </button>
              <button onClick={() => router.push('/dashboard')} className="btn btn-primary" style={{ fontSize: '13px' }}>
                New Assessment
              </button>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
