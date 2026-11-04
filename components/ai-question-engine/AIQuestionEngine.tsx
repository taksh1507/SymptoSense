"use client";

import React, { useState } from "react";
import { ProgressStepper } from '@/components/ui/brand';
import {
  Check,
  Volume2,
  VolumeX,
  Mic,
  Square,
  RotateCcw,
  Languages,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Badge, Button, Field, Notice, Section } from '@/components/ui/primitives';
import { useQuestionEngine } from "./useQuestionEngine";
import type { EngineProps } from "./types";

function OptionButton({
  label,
  isSelected,
  onClick,
  disabled,
}: {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      className="option"
      aria-pressed={isSelected}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="option-label">{label}</span>
      {isSelected && <Check className="w-5 h-5 text-teal-700" aria-hidden="true" />}
    </button>
  );
}

export function AIQuestionEngine({
  defaultLanguage = "en",
  onComplete,
  onCancel,
  initialSymptom,
  gender,
}: EngineProps) {
  const engine = useQuestionEngine({ defaultLanguage, onComplete, onCancel, initialSymptom, gender });
  const [search, setSearch] = useState('');
  const {
    currentQuestion,
    currentStep,
    totalSteps,
    progress,
    stage,
    selectedOptions,
    customInput,
    customInputError,
    showCustomInput,
    language,
    toggleLanguage,
    isSpeaking,
    isRecording,
    isLoading,
    isComplete,
    voiceError,
    isMuted,
    toggleMute,
    genderMismatch,
    dismissMismatch,
    riskSnapshot,
    redFlagPending,
    acknowledgeRedFlag,
    handleOptionToggle,
    handleCustomInputChange,
    handleNext,
    handleVoiceToggle,
    replayQuestion,
  } = engine;

  const t = (en: string, hi: string, mr: string) =>
    language === 'hi' ? hi : language === 'mr' ? mr : en;

  const stageLabel: Record<string, { en: string; hi: string; mr: string }> = {
    q1_age: { en: "About you", hi: "आपके बारे में", mr: "तुमच्याविषयी" },
    q2_symptoms: { en: "Symptoms", hi: "लक्षण", mr: "लक्षणे" },
    ai_questions: { en: "Follow-up questions", hi: "अगले प्रश्न", mr: "पुढील प्रश्न" },
    q9_duration: { en: "Duration", hi: "अवधि", mr: "कालावधी" },
    q10_severity: { en: "Severity", hi: "गंभीरता", mr: "तीव्रता" },
    q11_medications: {
      en: "Medicines and health history",
      hi: "दवाइयाँ और स्वास्थ्य इतिहास",
      mr: "औषधे आणि आरोग्याचा इतिहास",
    },
  };

  const canProceed =
    stage === "q2_symptoms" || stage === "q11_medications"
      ? selectedOptions.length > 0 || customInput.trim().length >= 3
      : selectedOptions.length > 0;

  if (stage === 'review' && engine.reviewPayload) {
    const data = engine.reviewPayload;

    const formatAge = (val: string) => {
      const map: Record<string, string> = {
        child: 'Child (0–12)',
        teen: 'Teen (13–18)',
        adult: 'Adult (19–50)',
        elderly: 'Elderly (50+)',
      };
      return map[val.toLowerCase()] || (val.charAt(0).toUpperCase() + val.slice(1));
    };

    const formatLanguage = (val: string) => {
      const map: Record<string, string> = {
        en: 'English',
        hi: 'Hindi (हिंदी)',
        mr: 'Marathi (मराठी)',
      };
      return map[val.toLowerCase()] || val;
    };

    const formatSeverity = (val: string) => {
      const map: Record<string, string> = {
        mild: 'Mild — Manage normally',
        moderate: 'Moderate — Some activities harder',
        severe: 'Severe — Mostly unable to function',
        critical: 'Critical — Cannot get out of bed',
      };
      return map[val.toLowerCase()] || (val.charAt(0).toUpperCase() + val.slice(1));
    };

    const formatDuration = (val: string) => {
      const map: Record<string, string> = {
        '< 1 day': '< 24 hours',
        '1-3 days': '1 – 3 days',
        '4-7 days': '4 – 7 days',
        '> 1 week': '1 – 4 weeks',
        '4-12 weeks': '4 – 12 weeks',
        '> 12 weeks': '12 weeks or longer',
      };
      return map[val] || val;
    };

    const symptomsList = [...data.symptoms, data.customSymptom]
      .filter((s): s is string => Boolean(s))
      .map(s => s.replaceAll('_', ' '))
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(', ') || t('None reported', 'कोई नहीं', 'काही नाही');

    const historyList = [...data.medications, data.customMedication]
      .filter((m): m is string => Boolean(m))
      .filter(m => m !== 'none')
      .map(m => m.replaceAll('_', ' '))
      .map(m => m.charAt(0).toUpperCase() + m.slice(1))
      .join(', ') || t('None reported', 'कोई नहीं बताया', 'काही सांगितले नाही');

    return (
      <div className="question-flow">
        <ProgressStepper step={3} />
        
        <header className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('Review Your Assessment', 'अपने मूल्यांकन की समीक्षा करें', 'आपल्या मूल्यांकनाचा आढावा घ्या')}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {t(
              'Please confirm your information before generating your results.',
              'परिणाम तैयार करने से पहले कृपया अपनी जानकारी की पुष्टि करें।',
              'निकाल तयार करण्यापूर्वी कृपया आपल्या माहितीची खात्री करा.'
            )}
          </p>
        </header>

        {/* Section 1: Personal Information */}
        <Section title={t('Personal Information', 'व्यक्तिगत जानकारी', 'वैयक्तिक माहिती')}>
          <dl className="facts">
            <div>
              <dt>{t('Age Group', 'आयु वर्ग', 'वयोगट')}</dt>
              <dd><strong>{formatAge(data.age)}</strong></dd>
            </div>
            <div>
              <dt>{t('Language', 'भाषा', 'भाषा')}</dt>
              <dd>{formatLanguage(data.language)}</dd>
            </div>
          </dl>
        </Section>

        {/* Section 2: Reported Symptoms */}
        <Section title={t('Reported Symptoms', 'बताए गए लक्षण', 'नोंदवलेली लक्षणे')}>
          <dl className="facts">
            <div>
              <dt>{t('Symptoms', 'लक्षण', 'लक्षणे')}</dt>
              <dd><strong>{symptomsList}</strong></dd>
            </div>
            <div>
              <dt>{t('Duration', 'अवधि', 'कालावधी')}</dt>
              <dd>{formatDuration(data.duration)}</dd>
            </div>
            <div>
              <dt>{t('Severity', 'गंभीरता', 'तीव्रता')}</dt>
              <dd>{formatSeverity(data.severity)}</dd>
            </div>
            <div>
              <dt>{t('Medical History', 'स्वास्थ्य इतिहास', 'आरोग्य इतिहास')}</dt>
              <dd>{historyList}</dd>
            </div>
          </dl>
        </Section>

        {/* Section 3: Additional Information (Follow-up questions) */}
        {engine.reviewQuestions.length > 0 && (
          <Section title={t('Additional Information', 'अतिरिक्त जानकारी', 'अतिरिक्त माहिती')}>
            <p className="text-xs text-slate-500 mb-3">
              {t(
                'Follow-up answers recorded during your consultation:',
                'परामर्श के दौरान दर्ज किए गए अनुवर्ती उत्तर:',
                'सल्ल्यादरम्यान नोंदवलेली पुढील उत्तरे:'
              )}
            </p>
            <div className="space-y-3">
              {engine.reviewQuestions.map((item, i) => (
                <div key={'ai_answer_' + i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-medium text-slate-800 break-words">{item.question}</p>
                  <p className="text-sm font-semibold text-teal-800 mt-1">
                    ↳ {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Actions */}
        <div className="row between pt-4">
          <Button variant="secondary" onClick={engine.handleBack}>
            {t('Edit Answers', 'उत्तर संपादित करें', 'उत्तरे बदला')}
          </Button>
          <Button onClick={engine.submitReview}>
            {t('Generate Assessment Results', 'मूल्यांकन परिणाम तैयार करें', 'मूल्यांकन निकाल तयार करा')}
          </Button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <Section className="question-flow text-center py-12" role="status">
        <Loader2 className="w-8 h-8 text-teal-700 animate-spin mx-auto mb-3" />
        <h2>{t('Assessment complete', 'मूल्यांकन पूरा हुआ', 'मूल्यांकन पूर्ण झाले')}</h2>
        <p className="text-slate-600 mt-2">
          {t('Preparing your clinical summary and triage results…', 'आपके परिणाम और सारांश तैयार हो रहे हैं…', 'तुमचे निकाल आणि सारांश तयार होत आहेत…')}
        </p>
      </Section>
    );
  }

  if (redFlagPending) {
    const flagged = riskSnapshot?.factors?.[0]?.replace('Red flag: ', '') || '';
    return (
      <div className="question-flow" lang={language}>
        <Notice tone="danger" role="alert">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h1 className="text-lg font-bold">
                {t('Urgent medical attention needed', 'तुरंत चिकित्सा सहायता की आवश्यकता', 'तात्काळ वैद्यकीय मदत आवश्यक')}
              </h1>
              <p className="mt-2 text-sm">
                {t('Your symptoms show high-risk indicators:', 'आपके लक्षणों में उच्च जोखिम के संकेत हैं:', 'तुमच्या लक्षणांमध्ये उच्च जोखमीचे संकेत आहेत:')}{' '}
                <strong>{flagged || t('chest pain', 'सीने में दर्द', 'छातीत दुखणे')}</strong>.
              </p>
              <p className="mt-1 text-sm">
                {t(
                  "We'll skip the remaining questions and complete your assessment right away.",
                  'हम बाकी प्रश्न छोड़कर तुरंत आपका मूल्यांकन पूरा करेंगे।',
                  'आम्ही उर्वरित प्रश्न वगळून लगेच तुमचे मूल्यांकन पूर्ण करू.'
                )}
              </p>
              <div className="mt-4">
                <Button variant="danger" onClick={acknowledgeRedFlag}>
                  {t('See results', 'परिणाम देखें', 'निकाल पहा')}
                </Button>
              </div>
            </div>
          </div>
        </Notice>
      </div>
    );
  }

  if (genderMismatch) {
    const symptomDisplay =
      genderMismatch.symptom.charAt(0).toUpperCase() + genderMismatch.symptom.slice(1);
    const genderDisplay = genderMismatch.gender;
    return (
      <div className="question-flow" lang={language}>
        <Notice tone="warning" role="alert">
          <h2>
            {t(
              'Check your symptom and sex selection',
              'लक्षण और लिंग का चयन जाँचें',
              'लक्षण आणि लिंगाची निवड तपासा'
            )}
          </h2>
          <p className="mt-1">
            {symptomDisplay} — {genderDisplay}.{' '}
            {t(
              'This symptom does not match the sex selected in this questionnaire. Please review your entries; inaccurate information may affect the assessment.',
              'यह लक्षण इस प्रश्नावली में चुने गए लिंग से मेल नहीं खाता। कृपया अपनी जानकारी जाँचें; गलत जानकारी मूल्यांकन को प्रभावित कर सकती है।',
              'हे लक्षण या प्रश्नावलीतील निवडलेल्या लिंगाशी जुळत नाही. कृपया माहिती तपासा; चुकीच्या माहितीमुळे मूल्यांकनावर परिणाम होऊ शकतो.'
            )}
          </p>
          <div className="row mt-4">
            <Button onClick={dismissMismatch}>
              {t('Review symptoms', 'लक्षण जाँचें', 'लक्षणे तपासा')}
            </Button>
            {onCancel && (
              <Button variant="secondary" onClick={onCancel}>
                {t('Cancel assessment', 'मूल्यांकन रद्द करें', 'मूल्यांकन रद्द करा')}
              </Button>
            )}
          </div>
        </Notice>
      </div>
    );
  }

  return (
    <div className="question-flow" lang={language}>
      <ProgressStepper step={stage === 'q1_age' ? 0 : stage === 'q2_symptoms' ? 1 : 2}/>
      <header className="stack">
        <div className="row between">
          <p className="eyebrow">{stageLabel[stage]?.[language] ?? stage}</p>
          <div className="question-tools">
            <Button
              variant="secondary"
              onClick={toggleMute}
              aria-label={
                isMuted
                  ? t('Turn voice on', 'आवाज़ चालू करें', 'आवाज सुरू करा')
                  : t('Mute voice', 'आवाज़ बंद करें', 'आवाज बंद करा')
              }
              aria-pressed={isMuted}
            >
              {isMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
            </Button>
            <Button
              variant="secondary"
              onClick={toggleLanguage}
              aria-label={t('Change language', 'भाषा बदलें', 'भाषा बदला')}
            >
              <Languages aria-hidden="true" />
              {language === 'en' ? 'English' : language === 'hi' ? 'हिन्दी' : 'मराठी'}
            </Button>
            {onCancel && (
              <Button variant="secondary" onClick={onCancel}>
                {t('Cancel', 'रद्द करें', 'रद्द करा')}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="stack">
        <div className="row between text-xs font-semibold text-slate-600">
          <span>
            {t('Question', 'प्रश्न', 'प्रश्न')} {currentStep + 1} / {totalSteps}
          </span>
          <span className="muted">{progress}%</span>
        </div>
        <progress
          value={progress}
          max={100}
          aria-label={t('Question progress', 'प्रश्नों की प्रगति', 'प्रश्नांची प्रगती')}
        />
      </div>

      {riskSnapshot && !riskSnapshot.isRedFlag && (
        <div className="stack">
          <div>
            <Badge urgency={riskSnapshot.urgency}>
              {t('Urgency', 'तात्कालिकता', 'तातडी')}:{' '}
              {riskSnapshot.urgency === 'High'
                ? t('High', 'उच्च', 'उच्च')
                : riskSnapshot.urgency === 'Medium'
                ? t('Medium', 'मध्यम', 'मध्यम')
                : t('Low', 'कम', 'कमी')}{' '}
              · {riskSnapshot.score}/100
            </Badge>
          </div>
          <p className="muted text-xs">{riskSnapshot.factors.join(' · ')}</p>
        </div>
      )}

      {isRecording && (
        <div className="flex items-center gap-2 p-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-900 text-xs font-medium animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
          <span>
            {t(
              'Listening to your voice… speak your symptom clearly',
              'आपकी आवाज़ सुनी जा रही है… स्पष्ट बोलें',
              'तुमचा आवाज ऐकला जात आहे… स्पष्ट बोला'
            )}
          </span>
        </div>
      )}

      <Section>
        {isLoading ? (
          <div className="py-8 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-700" />
            <p role="status">
              {t('Preparing your next question…', 'अगला प्रश्न तैयार हो रहा है…', 'पुढचा प्रश्न तयार होत आहे…')}
            </p>
          </div>
        ) : currentQuestion ? (
          <>
            <h1 className="question-title">{currentQuestion.question[language]}</h1>
            {isSpeaking && (
              <p role="status" className="muted flex items-center gap-1.5 text-xs text-teal-700 font-medium mt-1">
                <Volume2 className="w-4 h-4 animate-pulse" />
                {t('Reading question aloud…', 'प्रश्न पढ़ा जा रहा है…', 'प्रश्न वाचला जात आहे…')}
              </p>
            )}
            {currentQuestion.type === 'multiselect' && (
              <p className="muted text-xs mt-1">
                {t('Select all that apply.', 'सभी लागू विकल्प चुनें।', 'लागू असलेले सर्व पर्याय निवडा.')}
              </p>
            )}
            {stage === 'q2_symptoms' && <><Field id="symptom-search" label={t('Search symptoms','लक्षण खोजें','लक्षणे शोधा')} type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('Search symptoms…','लक्षण खोजें…','लक्षणे शोधा…')}/>{search && <Button variant="ghost" onClick={()=>setSearch('')}>Clear search</Button>}<div className="symptom-chips">{currentQuestion.options.filter(o=>selectedOptions.includes(o.value)).map(o=><button key={o.value} onClick={()=>handleOptionToggle(o.value)} aria-label={'Remove '+o.label[language]}>{o.label[language]} ×</button>)}</div></>}
            <div className={stage === 'q2_symptoms' ? 'symptom-options mt-4' : 'stack mt-4'}>
              {currentQuestion.options.filter(opt => stage !== 'q2_symptoms' || opt.label[language].toLowerCase().includes(search.toLowerCase())).map(opt => (
                <OptionButton
                  key={opt.value}
                  label={opt.label[language]}
                  isSelected={selectedOptions.includes(opt.value)}
                  onClick={() => handleOptionToggle(opt.value)}
                  disabled={isLoading}
                />
              ))}
              {currentQuestion.allowOther && (
                <OptionButton
                  label={t('Something else', 'कुछ और', 'इतर काही')}
                  isSelected={showCustomInput}
                  onClick={() => handleOptionToggle('other')}
                  disabled={isLoading}
                />
              )}
            </div>
            {showCustomInput && (
              <div className="stack mt-3">
                <Field
                  id="custom-symptom"
                  label={t(
                    'Describe your symptom or condition',
                    'अपना लक्षण या स्थिति लिखें',
                    'तुमचे लक्षण किंवा स्थिती लिहा'
                  )}
                  type="text"
                  value={customInput}
                  onChange={e => handleCustomInputChange(e.target.value)}
                  aria-invalid={!!customInputError}
                  aria-describedby={customInputError ? 'custom-symptom-error' : undefined}
                />
                {customInputError && (
                  <Notice tone="warning" id="custom-symptom-error" role="alert">
                    {customInputError}
                  </Notice>
                )}
              </div>
            )}
          </>
        ) : null}
      </Section>

      <div className="row between">
        <div className="question-tools">
          {engine.canGoBack && <Button variant="secondary" onClick={engine.handleBack} disabled={isLoading}>{t('Back','पीछे','मागे')}</Button>}
          <Button
            variant="secondary"
            onClick={handleVoiceToggle}
            disabled={isLoading}
            aria-pressed={isRecording}
            aria-label={
              isRecording
                ? t('Stop recording', 'रिकॉर्डिंग रोकें', 'रेकॉर्डिंग थांबवा')
                : t('Speak your answer', 'अपना उत्तर बोलें', 'तुमचे उत्तर बोला')
            }
          >
            {isRecording ? <Square className="text-red-600" aria-hidden="true" /> : <Mic aria-hidden="true" />}
            {isRecording ? t('Stop', 'रोकें', 'थांबवा') : t('Speak', 'बोलें', 'बोला')}
          </Button>
          <Button
            variant="secondary"
            onClick={replayQuestion}
            disabled={isLoading || isSpeaking}
            aria-label={t('Read the question again', 'प्रश्न फिर से सुनें', 'प्रश्न पुन्हा ऐका')}
          >
            <RotateCcw aria-hidden="true" />
          </Button>
        </div>
        <Button onClick={handleNext} disabled={!canProceed || isLoading}>
          {stage === 'q11_medications'
            ? t('Review answers', 'उत्तर जाँचें', 'उत्तरे तपासा')
            : t('Continue', 'आगे बढ़ें', 'पुढे जा')}
        </Button>
      </div>

      {voiceError && <Notice tone="warning" role="alert">{voiceError}</Notice>}

      <p className="text-xs text-slate-400 text-center pt-2">
        {t(
          'Emergency: For severe breathing difficulty, sudden crushing chest pain, or collapse, call 108 immediately.',
          'आपातकालीन: गंभीर सांस की तकलीफ या अचानक सीने में दर्द होने पर तुरंत 108 पर संपर्क करें।',
          'आपत्कालीन: श्वास घेण्यास गंभीर त्रास किंवा छातीत तीव्र वेदना असल्यास त्वरित १०८ वर संपर्क साधा.'
        )}
      </p>
    </div>
  );
}

export default AIQuestionEngine;
