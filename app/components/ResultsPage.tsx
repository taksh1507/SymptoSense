'use client';

import { useApp } from '../context/AppContext';
import { RiskGauge } from '@/components/results/RiskGauge';
import { ConfidenceMeter } from '@/components/results/ConfidenceMeter';
import { DiseaseResults } from '@/components/results/DiseaseResults';
import { generateRiskExplanation, generateRecommendations } from '@/lib/report/reasoningEngine';
import { Badge, Button, Notice, Section } from '@/components/ui/primitives';
import { useUiText } from '@/components/ui/use-ui-text';
import { Phone, Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Urgency } from '@/lib/ai-engine/scoring/types';

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

  // Local engine as fallback when Groq hasn't returned yet
  const localReasoning = assessmentPayload
    ? generateRiskExplanation({ ...assessmentPayload, riskLevel: riskLevel as 'High' | 'Medium' | 'Low', riskScore })
    : null;
  const localRecommendations = assessmentPayload
    ? generateRecommendations({ ...assessmentPayload, riskLevel: riskLevel as 'High' | 'Medium' | 'Low', riskScore })
    : null;

  // Use Groq output if available, fall back to local engine
  const displaySummary = narrative?.[langKey] || riskReasoning || localReasoning?.summary || '';
  const displayFactors = riskFactors.length > 0 ? riskFactors : localReasoning?.factors || [];
  const displayPrimary = primaryAction || localRecommendations?.primaryAction || '';
  const displaySteps = recommendationSteps.length > 0 ? recommendationSteps : localRecommendations?.steps || [];

  const urgencyText =
    riskLevel === 'High'
      ? t(
          'High urgency — seek immediate medical attention.',
          'उच्च तात्कालिकता — तुरंत चिकित्सा सहायता लें।',
          'उच्च तातडी — त्वरित वैद्यकीय मदत घ्या.'
        )
      : riskLevel === 'Medium'
      ? t(
          'Medium urgency — arrange a medical consultation soon.',
          'मध्यम तात्कालिकता — जल्द डॉक्टर से परामर्श लें।',
          'मध्यम तातडी — लवकर डॉक्टरांचा सल्ला घ्या.'
        )
      : t(
          'Low urgency — monitor your symptoms and follow the advice below.',
          'कम तात्कालिकता — लक्षणों पर नज़र रखें और नीचे दी गई सलाह का पालन करें।',
          'कमी तातडी — लक्षणांवर लक्ष ठेवा आणि खालील सल्ल्याचे पालन करा.'
        );

  return (
    <div className="page">
      <div className="report results-layout" lang={langKey}>
        <div className="row between no-print"><Link href="/dashboard" className="btn btn-secondary"><ArrowLeft/>Back to Dashboard</Link><Button variant="secondary" onClick={()=>window.print()}><Printer/>Print / save PDF</Button></div>
        <Notice
          tone={riskLevel === 'High' ? 'danger' : riskLevel === 'Medium' ? 'warning' : 'success'}
          role={riskLevel === 'High' ? 'alert' : 'status'}
        >
          <h2>{urgencyText}</h2>
          {displayPrimary && <p>{displayPrimary}</p>}
          {riskLevel === 'High' && (
            <div className="pt-2">
              <a className="btn btn-danger" href="tel:108">
                <Phone aria-hidden="true" />
                {t(
                  'Call emergency services (108)',
                  'आपातकालीन सेवा को कॉल करें (108)',
                  'आपत्कालीन सेवेला कॉल करा (108)'
                )}
              </a>
            </div>
          )}
        </Notice>

        <header className="row between">
          <div className="stack">
            <p className="eyebrow">
              {t('Your symptom assessment', 'आपके लक्षणों का मूल्यांकन', 'तुमच्या लक्षणांचे मूल्यांकन')}
            </p>
            <h1>{reportTitle}</h1>
            <p className="muted">
              {new Date().toLocaleDateString(langKey === 'hi' ? 'hi-IN' : langKey === 'mr' ? 'mr-IN' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="row gap-2">
            <Button variant="secondary" onClick={() => window.print()} title={t('Print this clinical report', 'रिपोर्ट प्रिंट करें', 'अहवाल मुद्रित करा')}>
              <Printer className="w-4 h-4" aria-hidden="true" />
              <span>{t('Print report', 'प्रिंट करें', 'प्रिंट करा')}</span>
            </Button>
            <Button variant="secondary" onClick={onRestart || (() => setTriageScreen('language'))}>
              {t('Start again', 'फिर से शुरू करें', 'पुन्हा सुरू करा')}
            </Button>
          </div>
        </header>

        <Notice>
          <strong>
            {t(
              'Decision support only. This is not a diagnosis.',
              'केवल निर्णय में सहायता के लिए। यह निदान नहीं है।',
              'केवळ निर्णय घेण्यास मदत. हे निदान नाही.'
            )}
          </strong>
          <p>
            {t(
              'Always consult a qualified healthcare professional. The model score is a heuristic and has not been clinically validated.',
              'हमेशा योग्य स्वास्थ्य पेशेवर से सलाह लें। मॉडल का स्कोर अनुमान आधारित है और चिकित्सकीय रूप से प्रमाणित नहीं है।',
              'नेहमी पात्र आरोग्य व्यावसायिकांचा सल्ला घ्या. मॉडेलचा स्कोअर अंदाजाधारित असून वैद्यकीयदृष्ट्या प्रमाणित नाही.'
            )}
          </p>
        </Notice>

        <div className="results-columns"><div><DiseaseResults result={diseasePrediction} status={diseaseStatus} error={diseaseError} /></div><div className="stack results-side"><Section title={t('Your Symptoms','आपके लक्षण','तुमची लक्षणे')}><ul className="reported-symptoms">{[assessmentPayload?.primarySymptom,...(assessmentPayload?.additionalSymptoms || [])].filter(Boolean).map((s,i)=><li key={i}>{s!.replaceAll('_',' ')}</li>)}</ul></Section><Section title={t('Recommended Next Steps','अगले कदम','पुढील पावले')}><strong>{displayPrimary}</strong><ol className="plain-list">{displaySteps.map((s,i)=><li key={i}>{s}</li>)}</ol></Section></div></div>

        {(displaySummary || displayFactors.length > 0) && (
          <Section title={t('Why this urgency level?', 'यह तात्कालिकता क्यों?', 'ही तातडीची पातळी का?')}>
            {displaySummary && <p>{displaySummary}</p>}
            <ul className="plain-list">
              {displayFactors.map((factor, i) => (
                <li key={i}>{factor}</li>
              ))}
            </ul>
          </Section>
        )}

        {keyInsights.length > 0 && (
          <Section title={t('What to keep in mind', 'ध्यान देने योग्य बातें', 'लक्षात ठेवण्याच्या गोष्टी')}>
            <ul className="plain-list">
              {keyInsights.map((insight, i) => (
                <li key={i}>{insight}</li>
              ))}
            </ul>
          </Section>
        )}

        {(displayPrimary || displaySteps.length > 0) && (
          <Section title={t('What to do next', 'अब क्या करें', 'पुढे काय करावे')}>
            <div>
              <Badge urgency={riskLevel}>
                {riskLevel === 'High'
                  ? t('High urgency', 'उच्च तात्कालिकता', 'उच्च तातडी')
                  : riskLevel === 'Medium'
                  ? t('Medium urgency', 'मध्यम तात्कालिकता', 'मध्यम तातडी')
                  : t('Low urgency', 'कम तात्कालिकता', 'कमी तातडी')}
              </Badge>
            </div>
            {displayPrimary && (
              <p>
                <strong>{displayPrimary}</strong>
              </p>
            )}
            {mlLevel !== 'unavailable' && mlScore < 60 && (
              <Notice tone="warning">
                {t(
                  'More precise symptom details may refine this recommendation.',
                  'लक्षणों की अधिक सटीक जानकारी से यह सलाह बेहतर हो सकती है।',
                  'लक्षणांची अधिक नेमकी माहिती दिल्यास हा सल्ला अधिक योग्य होऊ शकतो.'
                )}
              </Notice>
            )}
            <ol className="plain-list">
              {displaySteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Section>
        )}

        <Section title={t('Questions for your healthcare provider', 'डॉक्टर से पूछने योग्य प्रश्न', 'वैद्यकीय व्यावसायिकांशी चर्चा करण्याचे प्रश्न')}>
          <p className="muted text-xs">
            {t(
              'Take these questions with you to your consultation to ensure all key diagnostic factors are covered.',
              'अपनी जांच के दौरान डॉक्टर से ये प्रश्न पूछें ताकि सभी महत्वपूर्ण बिंदुओं पर बात हो सके।',
              'तपासणीदरम्यान या मुद्द्यांवर डॉक्टरांशी चर्चा करा जेणेकरून सर्व महत्त्वाच्या बाबींची माहिती मिळेल.'
            )}
          </p>
          <ul className="plain-list">
            <li>{t('Could these symptoms be related to my recent health history or medications?', 'क्या ये लक्षण मेरे हालिया स्वास्थ्य इतिहास या दवाओं से संबंधित हो सकते हैं?', 'ही लक्षणे माझ्या अलीकडील आरोग्याच्या इतिहासाशी किंवा औषधांशी संबंधित असू शकतात का?')}</li>
            <li>{t('What specific tests or examinations are recommended to confirm a diagnosis?', 'निदान की पुष्टि के लिए किन परीक्षणों या जांच की सलाह दी जाती है?', 'निदान निश्चित करण्यासाठी कोणत्या चाचण्या किंवा तपासणीची आवश्यकता आहे?')}</li>
            <li>{t('What red-flag signs should prompt me to go to an emergency room immediately?', 'किन चेतावनी संकेतों पर मुझे तुरंत आपातकालीन कक्ष जाना चाहिए?', 'कोणती धोक्याची लक्षणे दिसल्यास मी लगेच आपत्कालीन कक्षात जावे?')}</li>
          </ul>
        </Section>

        <Section title={t('Understanding the scores', 'स्कोर को समझें', 'स्कोअर समजून घ्या')}>
          <div className="metric-grid">
            <RiskGauge
              score={riskScore}
              urgency={(riskLevel.charAt(0) + riskLevel.slice(1).toLowerCase()) as Urgency}
              explanation={riskReasoning}
            />
            <ConfidenceMeter score={mlScore} level={mlLevel} explanation={mlExplanation} />
          </div>
        </Section>

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
          <div>
            <Button variant="secondary" onClick={() => (window.location.href = '/dashboard/reports')}>
              {t('View past reports', 'पिछली रिपोर्ट देखें', 'जुने अहवाल पहा')}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
