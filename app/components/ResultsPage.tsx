'use client';

import { useApp } from '../context/AppContext';
import { ReportView, type ReportModel } from '@/components/results/ReportView';
import { Button, Notice } from '@/components/ui/primitives';
import { useUiText } from '@/components/ui/use-ui-text';
import { generateRiskExplanation, generateRecommendations } from '@/lib/report/reasoningEngine';
import { getWarningSigns, getDrugWarnings } from '@/lib/report/warnings';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ResultsPage({ onRestart }: { onRestart?: () => void } = {}) {
  const {
    language,
    riskScore,
    riskLevel,
    narrative,
    setTriageScreen,
    mlScore,
    mlLevel,
    mlExplanation,
    riskReasoning,
    riskFactors,
    diseasePrediction,
    diseaseStatus,
    diseaseError,
    recommendationSteps,
    primaryAction,
    keyInsights,
    patientName,
    relation,
    personType,
    assessmentPayload,
    saveStatus,
    saveError,
    retrySave,
  } = useApp();

  const t = useUiText();
  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';
  const displayName =
    patientName || (personType === 'self' ? t('you', 'आप', 'तुम्ही') : t('patient', 'मरीज़', 'रुग्ण'));
  const reportTitle =
    personType === 'family' && relation
      ? t('Assessment', 'मूल्यांकन', 'मूल्यांकन') + ': ' + displayName + ' (' + relation + ')'
      : t('Assessment', 'मूल्यांकन', 'मूल्यांकन') + ': ' + displayName;

  const reasoningInput = assessmentPayload
    ? { ...assessmentPayload, riskLevel: riskLevel as 'High' | 'Medium' | 'Low', riskScore }
    : null;
  const localReasoning = reasoningInput ? generateRiskExplanation(reasoningInput) : null;
  const localRecommendations = reasoningInput ? generateRecommendations(reasoningInput) : null;

  const displaySummary = narrative?.[langKey] || localReasoning?.summary || '';
  const displayFactors = riskFactors.length > 0 ? riskFactors : localReasoning?.factors || [];
  const displayPrimary = primaryAction || localRecommendations?.primaryAction || '';
  const displaySteps = recommendationSteps.length > 0 ? recommendationSteps : localRecommendations?.steps || [];

  const primarySymptom = assessmentPayload?.primarySymptom || '';
  const additionalSymptoms = assessmentPayload?.additionalSymptoms || [];
  const medications = assessmentPayload?.medicalHistory || [];
  const warningSigns = getWarningSigns(primarySymptom, additionalSymptoms, riskLevel);
  const onBloodThinners = medications.some(m => /blood.?thinner/.test(m));
  const drugWarnings = getDrugWarnings(onBloodThinners, [primarySymptom, ...additionalSymptoms, ...medications]);

  const model: ReportModel = {
    language: langKey,
    urgency: riskLevel,
    score: riskScore,
    urgencyExplanation: riskReasoning,
    summary: displaySummary,
    factors: displayFactors,
    keyInsights,
    primaryAction: displayPrimary,
    steps: displaySteps,
    symptoms: { primary: primarySymptom, additional: additionalSymptoms },
    severity: assessmentPayload?.severity || '',
    duration: assessmentPayload?.duration || '',
    medications,
    warningSigns,
    drugWarnings,
    disease: diseasePrediction,
    diseaseStatus,
    diseaseError,
    ml: { score: mlScore, level: mlLevel, explanation: mlExplanation },
  };

  const dateText = new Date().toLocaleDateString(
    langKey === 'hi' ? 'hi-IN' : langKey === 'mr' ? 'mr-IN' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  const header = (
    <>
      <div className="row between no-print">
        <Link href="/dashboard" className="btn btn-secondary">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {t('Back to Dashboard', 'डैशबोर्ड पर वापस', 'डॅशबोर्डवर परत')}
        </Link>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="w-4 h-4" aria-hidden="true" />
          {t('Print / save PDF', 'प्रिंट / PDF सहेजें', 'प्रिंट / PDF जतन करा')}
        </Button>
      </div>
      <header className="report-header stack">
        <p className="eyebrow">{t('Your symptom assessment', 'आपके लक्षणों का मूल्यांकन', 'तुमच्या लक्षणांचे मूल्यांकन')}</p>
        <h1>{reportTitle}</h1>
        <p className="muted">{dateText}</p>
      </header>
      <Notice>
        <strong>{t('Decision support only. This is not a diagnosis.', 'केवल निर्णय में सहायता के लिए। यह निदान नहीं है।', 'केवळ निर्णय घेण्यासाठी मदत. हे निदान नाही.')}</strong>
        <p>{t('Always consult a qualified healthcare professional. The scores below are estimates and have not been clinically validated.', 'हमेशा योग्य स्वास्थ्य पेशेवर से सलाह लें। नीचे दिए स्कोर अनुमान हैं और चिकित्सकीय रूप से प्रमाणित नहीं हैं।', 'नेहमी पात्र आरोग्य व्यावसायिकांचा सल्ला घ्या. खालील स्कोअर अंदाज असून वैद्यकीयदृष्ट्या प्रमाणित नाहीत.')}</p>
      </Notice>
    </>
  );

  const footer = (
    <footer className="stack">
      <p role="status">
        {saveStatus === 'saved'
          ? t('Assessment saved to your account.', 'मूल्यांकन आपके खाते में सहेजा गया।', 'मूल्यांकन तुमच्या खात्यात जतन झाले.')
          : saveStatus === 'saving'
          ? t('Saving your assessment…', 'मूल्यांकन सहेजा जा रहा है…', 'मूल्यांकन जतन होत आहे…')
          : t('Assessment has not been saved.', 'मूल्यांकन सहेजा नहीं गया है।', 'मूल्यांकन जतन झालेले नाही.')}
      </p>
      {saveStatus === 'failed' && (
        <Notice tone="warning" role="alert">
          <p>{saveError}</p>
          <Button variant="secondary" onClick={retrySave}>
            {t('Retry saving', 'फिर से सहेजें', 'पुन्हा जतन करा')}
          </Button>
        </Notice>
      )}
      <div className="row">
        <Button variant="secondary" onClick={() => (window.location.href = '/dashboard/reports')}>
          {t('View past reports', 'पिछली रिपोर्ट देखें', 'जुने अहवाल पहा')}
        </Button>
        <Button variant="secondary" onClick={onRestart || (() => setTriageScreen('language'))}>
          {t('Start again', 'फिर से शुरू करें', 'पुन्हा सुरू करा')}
        </Button>
      </div>
    </footer>
  );

  return (
    <div className="page">
      <ReportView model={model} header={header} footer={footer} />
    </div>
  );
}
