'use client';

import { useApp } from '../context/AppContext';

interface Question {
  id: number;
  category: string;
  title: { en: string; hi: string };
  subtitle: { en: string; hi: string };
  type: 'mcq' | 'multiselect' | 'text';
  options?: { label: { en: string; hi: string }; icon: string; color: string; bg: string; border: string; value: string }[];
  placeholder?: string;
}

const QUESTIONS: Question[] = [
  {
    id: 0, category: 'Demographics', 
    title: { en: 'What is your age group?', hi: 'आपकी आयु वर्ग क्या है?' },
    subtitle: { en: 'Helps in risk adjustment for different age brackets', hi: 'विभिन्न आयु समूहों के लिए जोखिम समायोजन में मदद करता है' }, 
    type: 'mcq',
    options: [
      { label: { en: 'Child (0–12)', hi: 'बच्चा (0-12)' }, icon: '👶', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', value: 'child' },
      { label: { en: 'Teen (13–18)', hi: 'किशोर (13-18)' }, icon: '👦', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', value: 'teen' },
      { label: { en: 'Adult (19–50)', hi: 'वयस्क (19-50)' }, icon: '👨', color: '#374151', bg: '#F3F4F6', border: '#E5E7EB', value: 'adult' },
      { label: { en: 'Elderly (50+)', hi: 'बुजुर्ग (50+)' }, icon: '👴', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', value: 'elderly' },
    ],
  },
  {
    id: 1, category: 'Symptoms', 
    title: { en: 'What is your main symptom?', hi: 'आपका मुख्य लक्षण क्या है?' },
    subtitle: { en: 'Select all that apply — primary indicators of risk', hi: 'जो लागू हों उन्हें चुनें — जोखिम के प्राथमिक संकेत' }, 
    type: 'multiselect',
    options: [
      { label: { en: 'Fever', hi: 'बुखार' }, icon: '🌡️', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', value: 'fever' },
      { label: { en: 'Headache', hi: 'सिरदर्द' }, icon: '🤕', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', value: 'headache' },
      { label: { en: 'Cough', hi: 'खांसी' }, icon: '🫁', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', value: 'cough' },
      { label: { en: 'Chest Pain', hi: 'सीने में दर्द' }, icon: '💔', color: '#DC2626', bg: '#FFF1F2', border: '#FECDD3', value: 'chest_pain' },
      { label: { en: 'Breathing Issue', hi: 'सांस की समस्या' }, icon: '😮‍💨', color: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD', value: 'breathing' },
      { label: { en: 'Fatigue', hi: 'थकान' }, icon: '⚡', color: '#4338CA', bg: '#EEF2FF', border: '#C7D2FE', value: 'fatigue' },
    ],
  },
  {
    id: 2, category: 'Severity', 
    title: { en: 'How severe are your symptoms?', hi: 'आपके लक्षण कितने गंभीर हैं?' },
    subtitle: { en: 'Rate the overall intensity of your discomfort', hi: 'अपनी परेशानी की समग्र तीव्रता को रेट करें' }, 
    type: 'mcq',
    options: [
      { label: { en: 'Mild', hi: 'हल्का' }, icon: '😊', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', value: 'mild' },
      { label: { en: 'Moderate', hi: 'मध्यम' }, icon: '😐', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', value: 'moderate' },
      { label: { en: 'Severe', hi: 'गंभीर' }, icon: '😣', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', value: 'severe' },
    ],
  },
  {
    id: 3, category: 'Duration', 
    title: { en: 'How long have you had these symptoms?', hi: 'आपको ये लक्षण कितने समय से हैं?' },
    subtitle: { en: 'Time elapsed since first symptom onset', hi: 'पहले लक्षण की शुरुआत से बीता समय' }, 
    type: 'mcq',
    options: [
      { label: { en: 'Few hours', hi: 'कुछ घंटे' }, icon: '⏰', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', value: 'hours' },
      { label: { en: '1–2 days', hi: '1-2 दिन' }, icon: '📅', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', value: 'days' },
      { label: { en: '3+ days', hi: '3+ दिन' }, icon: '🗓️', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', value: 'long' },
    ],
  },
  {
    id: 4, category: 'Progression', 
    title: { en: 'Are your symptoms getting worse?', hi: 'क्या आपके लक्षण बिगड़ रहे हैं?' },
    subtitle: { en: 'Helps identify the trend of your condition', hi: 'आपकी स्थिति की प्रवृत्ति की पहचान करने में मदद करता है' }, 
    type: 'mcq',
    options: [
      { label: { en: 'Improving', hi: 'सुधार हो रहा है' }, icon: '📈', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', value: 'improving' },
      { label: { en: 'Same', hi: 'वही है' }, icon: '➖', color: '#374151', bg: '#F3F4F6', border: '#E5E7EB', value: 'same' },
      { label: { en: 'Getting worse', hi: 'बिगड़ रहा है' }, icon: '📉', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', value: 'worse' },
    ],
  },
  {
    id: 5, category: 'Critical Check', 
    title: { en: 'Are you experiencing any of the following?', hi: 'क्या आप निम्न में से किसी का अनुभव कर रहे हैं?' },
    subtitle: { en: 'Life-threatening indicators of immediate risk', hi: 'तत्काल जोखिम के जीवन-धमकाने वाले संकेत' }, 
    type: 'mcq',
    options: [
      { label: { en: 'None', hi: 'कोई नहीं' }, icon: '✅', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', value: 'none' },
      { label: { en: 'Chest pain', hi: 'सीने में दर्द' }, icon: '💔', color: '#DC2626', bg: '#FFF1F2', border: '#FECDD3', value: 'chest_pain' },
      { label: { en: 'Diff. breathing', hi: 'सांस लेने में कठिनाई' }, icon: '🫁', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', value: 'breathing' },
    ],
  },
  {
    id: 6, category: 'History', 
    title: { en: 'Do you have any existing conditions?', hi: 'क्या आपको पहले से कोई बीमारी है?' },
    subtitle: { en: 'Co-morbidities increase overall health risk', hi: 'सह-रुग्णता समग्र स्वास्थ्य जोखिम को बढ़ाती है' }, 
    type: 'multiselect',
    options: [
      { label: { en: 'None', hi: 'कोई नहीं' }, icon: '✅', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', value: 'none' },
      { label: { en: 'Diabetes', hi: 'मधुमेह' }, icon: '💉', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', value: 'diabetes' },
      { label: { en: 'Heart Disease', hi: 'हृदय रोग' }, icon: '🫀', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', value: 'heart' },
    ],
  },
  {
    id: 7, category: 'Activity', 
    title: { en: 'Are your daily activities affected?', hi: 'क्या आपकी दैनिक गतिविधियाँ प्रभावित हैं?' },
    subtitle: { en: 'Functional impact of your symptoms', hi: 'आपके लक्षणों का कार्यात्मक प्रभाव' }, 
    type: 'mcq',
    options: [
      { label: { en: 'No impact', hi: 'कोई प्रभाव नहीं' }, icon: '🏃', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', value: 'none' },
      { label: { en: 'Slightly', hi: 'थोड़ा सा' }, icon: '🚶', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', value: 'slight' },
      { label: { en: 'Unable', hi: 'असमर्थ' }, icon: '🛌', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', value: 'unable' },
    ],
  },
];

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const ArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);
const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

export default function QuestionPanel() {
  const { language, currentQuestion, totalQuestions, selectedAnswers, setAnswer, goToPrevQuestion, goToNextQuestion, cancelTest } = useApp();

  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'hi' : 'en';

  const q = QUESTIONS[currentQuestion];
  const progress = (currentQuestion / totalQuestions) * 100;
  const answer = selectedAnswers[currentQuestion] || '';
  const canProceed = answer.length > 0;
  const isLast = currentQuestion === totalQuestions - 1;

  const handleSelect = (value: string) => {
    if (q.type === 'multiselect') {
      const parts = answer ? answer.split(',') : [];
      const idx = parts.indexOf(value);
      let newAnswer = '';
      if (idx === -1) {
          if (value !== 'none') {
            const filtered = parts.filter(v => v !== 'none');
            newAnswer = [...filtered, value].join(',');
          } else {
            newAnswer = 'none';
          }
      } else {
          newAnswer = parts.filter((v) => v !== value).join(',');
      }
      setAnswer(currentQuestion, newAnswer);
    } else {
      setAnswer(currentQuestion, value);
    }
  };

  const isSelected = (value: string) =>
    q.type === 'multiselect' ? answer.split(',').includes(value) : answer === value;

  return (
    <div className="mobile-padding" style={{ padding: '28px 32px', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ marginBottom: '22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '750', color: 'var(--text-1)', letterSpacing: '-0.3px' }}>
            {language === 'Hindi' ? 'सर्वेक्षण मूल्यांकन' : language === 'Marathi' ? 'तपासणी मूल्यांकन' : 'Triage Assessment'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '3px' }}>
            {language === 'Hindi' ? 'सिम्पटोसेन्स जोखिम एल्गोरिदम के लिए अनुकूलित' : 'Optimized for the SymptoSense Risk Algorithm'}
          </p>
        </div>
        
        {/* Voice UI Toggle (AI Engine Integration) */}
        <button 
          className="btn btn-outline" 
          style={{ borderRadius: '999px', padding: '10px 14px', gap: '8px', background: '#F8FAFC' }}
          onClick={() => alert('AI Voice Engine is being initialized...')}
        >
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B98180' }} />
          <span style={{ fontSize: '12px', fontWeight: '700' }}>Voice Mode</span>
        </button>
      </div>

      {/* Progress */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '999px',
              background: 'var(--red-light)', color: 'var(--red)', border: '1px solid var(--red-border)', letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>{q.category}</span>
            <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>
              {language === 'Hindi' ? 'प्रश्न' : 'Question'} {currentQuestion + 1} <span style={{ color: 'var(--text-4)' }}>of {totalQuestions}</span>
            </span>
          </div>
          <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--red)' }}>
            {Math.round((currentQuestion / totalQuestions) * 100)}%
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question card */}
      <div className="card anim-fadeup" style={{ padding: '26px 28px', marginBottom: '18px' }} key={currentQuestion}>
        <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '5px', letterSpacing: '-0.2px' }}>
          {q.title[langKey] || q.title.en}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', marginBottom: '22px' }}>
          {q.subtitle[langKey] || q.subtitle.en}
        </p>

        {/* Options grid */}
        {q.options && (
          <div className="mobile-grid-questions" style={{
            display: 'grid',
            gridTemplateColumns: q.options.length > 4 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
            gap: '12px',
          }}>
            {q.options.map((opt) => {
              const sel = isSelected(opt.value);
              return (
                <button
                  key={opt.value}
                  id={`q${currentQuestion}-${opt.value}`}
                  onClick={() => handleSelect(opt.value)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                    padding: '20px 14px', borderRadius: 'var(--radius)',
                    border: sel ? `2px solid ${opt.color}` : `1.5px solid var(--border)`,
                    background: sel ? opt.bg : 'white',
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s ease',
                    boxShadow: sel ? `0 4px 12px ${opt.color}20` : 'none',
                    transform: sel ? 'scale(1.02)' : 'scale(1)',
                    position: 'relative',
                  }}
                >
                  {sel && (
                    <div style={{
                      position: 'absolute', top: '10px', right: '10px',
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: opt.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                    }}><CheckIcon /></div>
                  )}
                  <span style={{ fontSize: '28px', lineHeight: 1 }}>{opt.icon}</span>
                  <span style={{ fontSize: '13.5px', fontWeight: '600', color: sel ? opt.color : 'var(--text-2)' }}>
                    {opt.label[langKey] || opt.label.en}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Text area */}
        {q.type === 'text' && (
          <textarea
            id={`q${currentQuestion}-text`}
            value={answer}
            onChange={(e) => setAnswer(currentQuestion, e.target.value)}
            placeholder={q.placeholder}
            rows={4}
            className="input"
            style={{ minHeight: '120px' }}
          />
        )}

        {/* Engineering Stats (AI Engine Branding) */}
        <div style={{ marginTop: '24px', padding: '12px', background: '#F1F5F9', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
           <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B' }}>REAL-TIME RISK VECTOR ANALYSIS</div>
           <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <div style={{ flex: 1, height: '4px', background: '#3B82F6', borderRadius: '2px' }} />
              <div style={{ flex: 1, height: '4px', background: '#E2E8F0', borderRadius: '2px' }} />
              <div style={{ flex: 1, height: '4px', background: '#E2E8F0', borderRadius: '2px' }} />
           </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          id="q-cancel-btn"
          className="btn btn-outline"
          onClick={cancelTest}
          style={{ padding: '10px 16px', color: 'var(--text-3)' }}
        >
          <XIcon /> {language === 'Hindi' ? 'रद्द करें' : 'Cancel'}
        </button>

        <div style={{ flex: 1 }} />

        {currentQuestion > 0 && (
          <button id="q-prev-btn" className="btn btn-outline" onClick={goToPrevQuestion} style={{ gap: '6px' }}>
            <ArrowLeft /> {language === 'Hindi' ? 'पीछे' : 'Previous'}
          </button>
        )}
        <button
          id="q-next-btn"
          className="btn btn-primary"
          onClick={goToNextQuestion}
          disabled={!canProceed}
          style={{ gap: '6px', minWidth: '120px', background: 'linear-gradient(135deg, #B91C1C 0%, #7F1D1D 100%)', boxShadow: '0 4px 12px rgba(185, 28, 28, 0.3)' }}
        >
          {isLast ? (language === 'Hindi' ? 'विश्लेषण करें' : 'Analyze Results') : (language === 'Hindi' ? 'अगला' : 'Next')} <ArrowRight />
        </button>
      </div>
    </div>
  );
}
