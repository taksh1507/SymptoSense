'use client';
import type { ReactNode } from 'react';
import { Badge, Notice, Section } from '@/components/ui/primitives';
import { useUiText } from '@/components/ui/use-ui-text';
import { Phone } from 'lucide-react';
import { RiskGauge } from './RiskGauge';
import { ConfidenceMeter } from './ConfidenceMeter';
import { DiseaseResults } from './DiseaseResults';
import type { DiseasePrediction } from '@/lib/ml/disease';
import type { Urgency } from '@/lib/ai-engine/scoring/types';

export type ReportLang = 'en' | 'hi' | 'mr';
export type ReportUrgency = 'Low' | 'Medium' | 'High';

export interface ReportModel {
  language: ReportLang;
  urgency: ReportUrgency;
  score: number;
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
}

export function ReportView({ model, header, footer, children }: {
  model: ReportModel;
  header?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const t = useUiText();
  const { urgency, score } = model;

  const allSymptoms = [model.symptoms.primary, ...model.symptoms.additional, model.symptoms.custom].filter(Boolean) as string[];
  const badgeLabel =
    urgency === 'High' ? t('High urgency', 'उच्च तात्कालिकता', 'उच्च तातडी')
    : urgency === 'Medium' ? t('Medium urgency', 'मध्यम तात्कालिकता', 'मध्यम तातडी')
    : t('Low urgency', 'कम तात्कालिकता', 'कमी तातडी');
  const urgencyOneLiner = model.urgencyExplanation || model.summary || '';
  const medLabel = model.medications.filter(m => m && m !== 'none').map(m => m.replace(/_/g, ' ')).join(', ');

  return (
    <div className="report" lang={model.language}>
      {header}

      <Notice tone={urgency === 'High' ? 'danger' : urgency === 'Medium' ? 'warning' : 'success'} role={urgency === 'High' ? 'alert' : 'status'}>
        <div className="row between">
          <Badge urgency={urgency}>{badgeLabel}</Badge>
          {urgency === 'High' && (
            <a className="btn btn-danger" href="tel:108">
              <Phone className="w-4 h-4" aria-hidden="true" />
              {t('Call emergency services (108)', 'आपातकालीन सेवा को कॉल करें (108)', 'आपत्कालीन सेवेला कॉल करा (108)')}
            </a>
          )}
        </div>
        {model.primaryAction && <h2 className="report-hero-title">{model.primaryAction}</h2>}
        {urgencyOneLiner && <p>{urgencyOneLiner}</p>}
      </Notice>

      {model.showConditions !== false && (
        <DiseaseResults result={model.disease} status={model.diseaseStatus} error={model.diseaseError} />
      )}

      <div className="results-columns">
        <Section title={t('What to do next', 'अब क्या करें', 'पुढे काय करावे')}>
          {model.primaryAction && <p className="lead"><strong>{model.primaryAction}</strong></p>}
          {model.steps.length > 0 && <ol className="plain-list">{model.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>}
          {model.warningSigns.length > 0 && (
            <Notice tone="warning">
              <strong>{t('When to get help right away', 'कब तुरंत मदद लें', 'कधी लगेच मदत घ्यावी')}</strong>
              <ul className="plain-list">{model.warningSigns.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </Notice>
          )}
        </Section>
        <div className="stack results-side">
          <Section title={t('Your reported symptoms', 'आपके बताए लक्षण', 'तुम्ही सांगितलेली लक्षणे')}>
            <ul className="reported-symptoms">
              {allSymptoms.length > 0
                ? allSymptoms.map((s, i) => <li key={i}>{s.replaceAll('_', ' ')}</li>)
                : <li>{t('None recorded', 'कोई दर्ज नहीं', 'काही नोंदवले नाही')}</li>}
            </ul>
            <dl className="facts">
              <div><dt>{t('Severity', 'गंभीरता', 'तीव्रता')}</dt><dd>{model.severity ? model.severity.replace(/^./, c => c.toUpperCase()) : t('Not provided', 'नहीं बताया', 'दिलेली नाही')}</dd></div>
              <div><dt>{t('Duration', 'अवधि', 'कालावधी')}</dt><dd>{model.duration || t('Not provided', 'नहीं बताया', 'दिलेली नाही')}</dd></div>
              {model.ageGroup && <div><dt>{t('Age group', 'आयु वर्ग', 'वयोगट')}</dt><dd>{model.ageGroup}</dd></div>}
              <div><dt>{t('Medicines / history', 'दवाइयाँ / इतिहास', 'औषधे / इतिहास')}</dt><dd>{medLabel || t('None reported', 'कोई नहीं बताया', 'काही सांगितले नाही')}</dd></div>
            </dl>
          </Section>
        </div>
      </div>

      {model.drugWarnings.length > 0 && (
        <Notice tone="danger" role="alert">
          <strong>{t('Medicine-related warnings', 'दवाइयों से जुड़ी चेतावनियाँ', 'औषधांशी संबंधित इशारे')}</strong>
          {model.drugWarnings.map((w, i) => <p key={i}>{w}</p>)}
        </Notice>
      )}

      {(model.summary || model.factors.length > 0) && (
        <Section title={t('Why this urgency level', 'यह तात्कालिकता क्यों', 'ही तातडीची पातळी का')}>
          {model.summary && <p>{model.summary}</p>}
          {model.factors.length > 0 && <ul className="plain-list">{model.factors.map((f, i) => <li key={i}>{f}</li>)}</ul>}
        </Section>
      )}

      {model.keyInsights.length > 0 && (
        <Section title={t('What to keep in mind', 'ध्यान देने योग्य बातें', 'लक्षात ठेवण्याच्या गोष्टी')}>
          <ul className="plain-list">{model.keyInsights.map((k, i) => <li key={i}>{k}</li>)}</ul>
        </Section>
      )}

      <Section title={t('Questions for your doctor', 'डॉक्टर से पूछने योग्य प्रश्न', 'डॉक्टरांना विचारण्याचे प्रश्न')}>
        <p className="muted">{t('Take these to your consultation so no key factor is missed.', 'परामर्श के समय ये प्रश्न पूछें ताकि कोई महत्वपूर्ण बात छूटे नहीं।', 'सल्ल्याच्या वेळी हे प्रश्न विचारा जेणेकरून महत्त्वाची बाब दुर्लक्षित राहणार नाही.')}</p>
        <ul className="plain-list">
          <li>{t('Could these symptoms be related to my health history or medicines?', 'क्या ये लक्षण मेरे स्वास्थ्य इतिहास या दवाओं से जुड़े हो सकते हैं?', 'ही लक्षणे माझ्या आरोग्य इतिहासाशी किंवा औषधांशी संबंधित असू शकतात का?')}</li>
          <li>{t('What tests or examinations are recommended to confirm a diagnosis?', 'निदान की पुष्टि के लिए कौन-सी जाँच की सलाह दी जाती है?', 'निदान निश्चित करण्यासाठी कोणत्या तपासण्या सुचवल्या जातात?')}</li>
          <li>{t('Which warning signs should make me seek emergency care immediately?', 'कौन-से चेतावनी संकेत मिलने पर मुझे तुरंत आपातकालीन देखभाल लेनी चाहिए?', 'कोणती धोक्याची लक्षणे दिसल्यास मी लगेच आपत्कालीन उपचार घ्यावे?')}</li>
        </ul>
      </Section>

      <Section title={t('How the scores work', 'स्कोर कैसे काम करते हैं', 'स्कोअर कसे काम करतात')}>
        <div className="metric-grid">
          <RiskGauge score={score} urgency={urgency as Urgency} explanation={model.urgencyExplanation} />
          {model.ml ? (
            <ConfidenceMeter score={model.ml.score} level={model.ml.level} explanation={model.ml.explanation} />
          ) : (
            <div className="metric">
              <h3>{t('Input pattern score', 'इनपुट पैटर्न स्कोर', 'इनपुट नमुना स्कोअर')}</h3>
              <p className="muted">{t('Not available for this report.', 'इस रिपोर्ट के लिए उपलब्ध नहीं।', 'या अहवालासाठी उपलब्ध नाही.')}</p>
            </div>
          )}
        </div>
        <p className="muted">{t(
          'Your urgency level comes from a rules-based check of your symptoms and health history. The condition estimate above is a separate research model and may point to a different urgency — always follow the higher level.',
          'आपकी तात्कालिकता लक्षण और स्वास्थ्य इतिहास के नियमों से तय होती है। ऊपर का स्थिति अनुमान एक अलग शोध मॉडल है और भिन्न तात्कालिकता बता सकता है — हमेशा अधिक स्तर का पालन करें।',
          'तुमची तातडी लक्षणे आणि आरोग्य इतिहासाच्या नियमांवर ठरते. वरील स्थिती अंदाज हा स्वतंत्र संशोधन मॉडेल आहे आणि वेगळी तातडी दर्शवू शकतो — नेहमी जास्त पातळीचे पालन करा.'
        )}</p>
      </Section>

      {children}
      {footer}
    </div>
  );
}
