'use client';

import { useApp } from '../context/AppContext';

interface Question {
  id: number;
  category: string;
  title: string;
  subtitle: string;
  type: 'mcq' | 'multiselect' | 'text';
  options?: { label: string; icon: string; color: string; bg: string; border: string; value: string }[];
  placeholder?: string;
}

const QUESTIONS: Question[] = [
  {
    id: 0, category: 'Demographics', title: 'What is your age group?',
    subtitle: 'Helps in risk adjustment for different age brackets', type: 'mcq',
    options: [
      { label: 'Child (0–12)', icon: '👶', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', value: 'child' },
      { label: 'Teen (13–18)', icon: '👦', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', value: 'teen' },
      { label: 'Adult (19–50)', icon: '👨', color: '#374151', bg: '#F3F4F6', border: '#E5E7EB', value: 'adult' },
      { label: 'Elderly (50+)', icon: '👴', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', value: 'elderly' },
    ],
  },
  {
    id: 1, category: 'Symptoms', title: 'What is your main symptom?',
    subtitle: 'Select all that apply — primary indicators of risk', type: 'multiselect',
    options: [
      { label: 'Fever', icon: '🌡️', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', value: 'fever' },
      { label: 'Headache', icon: '🤕', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', value: 'headache' },
      { label: 'Cough', icon: '🫁', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', value: 'cough' },
      { label: 'Chest Pain', icon: '💔', color: '#DC2626', bg: '#FFF1F2', border: '#FECDD3', value: 'chest_pain' },
      { label: 'Breathing Issue', icon: '😮‍💨', color: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD', value: 'breathing' },
      { label: 'Fatigue', icon: '⚡', color: '#4338CA', bg: '#EEF2FF', border: '#C7D2FE', value: 'fatigue' },
    ],
  },
  {
    id: 2, category: 'Severity', title: 'How severe are your symptoms?',
    subtitle: 'Rate the overall intensity of your discomfort', type: 'mcq',
    options: [
      { label: 'Mild', icon: '😊', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', value: 'mild' },
      { label: 'Moderate', icon: '😐', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', value: 'moderate' },
      { label: 'Severe', icon: '😣', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', value: 'severe' },
    ],
  },
  {
    id: 3, category: 'Duration', title: 'How long have you had these symptoms?',
    subtitle: 'Time elapsed since first symptom onset', type: 'mcq',
    options: [
      { label: 'Few hours', icon: '⏰', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', value: 'hours' },
      { label: '1–2 days', icon: '📅', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', value: 'days' },
      { label: '3+ days', icon: '🗓️', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', value: 'long' },
    ],
  },
  {
    id: 4, category: 'Progression', title: 'Are your symptoms getting worse?',
    subtitle: 'Helps identify the trend of your condition', type: 'mcq',
    options: [
      { label: 'Improving', icon: '📈', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', value: 'improving' },
      { label: 'Same', icon: '➖', color: '#374151', bg: '#F3F4F6', border: '#E5E7EB', value: 'same' },
      { label: 'Getting worse', icon: '📉', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', value: 'worse' },
    ],
  },
  {
    id: 5, category: 'Critical Check', title: 'Are you experiencing any of the following?',
    subtitle: 'Life-threatening indicators of immediate risk', type: 'mcq',
    options: [
      { label: 'None', icon: '✅', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', value: 'none' },
      { label: 'Chest pain', icon: '💔', color: '#DC2626', bg: '#FFF1F2', border: '#FECDD3', value: 'chest_pain' },
      { label: 'Diff. breathing', icon: '🫁', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', value: 'breathing' },
    ],
  },
  {
    id: 6, category: 'History', title: 'Do you have any existing conditions?',
    subtitle: 'Co-morbidities increase overall health risk', type: 'multiselect',
    options: [
      { label: 'None', icon: '✅', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', value: 'none' },
      { label: 'Diabetes', icon: '💉', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', value: 'diabetes' },
      { label: 'Heart Disease', icon: '🫀', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', value: 'heart' },
    ],
  },
  {
    id: 7, category: 'Activity', title: 'Are your daily activities affected?',
    subtitle: 'Functional impact of your symptoms', type: 'mcq',
    options: [
      { label: 'No impact', icon: '🏃', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', value: 'none' },
      { label: 'Slightly', icon: '🚶', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', value: 'slight' },
      { label: 'Unable', icon: '🛌', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', value: 'unable' },
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
  const { currentQuestion, totalQuestions, selectedAnswers, setAnswer, goToPrevQuestion, goToNextQuestion, cancelTest } = useApp();

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
          // If selecting a real condition and 'none' was selected, remove 'none'
          if (value !== 'none') {
            const filtered = parts.filter(v => v !== 'none');
            newAnswer = [...filtered, value].join(',');
          } else {
            // If selecting 'none', clear all others
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
      <div style={{ marginBottom: '22px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '750', color: 'var(--text-1)', letterSpacing: '-0.3px' }}>
          Triage Assessment
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '3px' }}>
          Questionnaire optimized for the SymptoSense Risk Algorithm
        </p>
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
              Question {currentQuestion + 1} <span style={{ color: 'var(--text-4)' }}>of {totalQuestions}</span>
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
          {q.title}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', marginBottom: '22px' }}>{q.subtitle}</p>

        {/* Options grid */}
        {q.options && (
          <div className="mobile-grid-1" style={{
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
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Text area (not used in current 8 questions but kept if needed) */}
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

        {/* Code overlay — shows the logic impact */}
        <div className="code-block" style={{ marginTop: '20px', fontSize: '10.5px' }}>
          <span className="cm">// Risk Logic Connection</span>{'\n'}
          <span className="kw">switch</span>(<span className="str">"{answer || 'waiting...'}"</span>) {'{'} {'\n'}
          &nbsp;&nbsp;<span className="kw">case</span> <span className="str">"elderly"</span>: score += 2;{'\n'}
          &nbsp;&nbsp;<span className="kw">case</span> <span className="str">"chest_pain"</span>: score += 5;{'\n'}
          &nbsp;&nbsp;<span className="kw">case</span> <span className="str">"worse"</span>: score += 2;{'\n'}
          &nbsp;&nbsp;<span className="kw">default</span>: calculateWeights();{'\n'}
          {'}'}
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
          <XIcon /> Cancel Test
        </button>

        <div style={{ flex: 1 }} />

        {currentQuestion > 0 && (
          <button id="q-prev-btn" className="btn btn-outline" onClick={goToPrevQuestion} style={{ gap: '6px' }}>
            <ArrowLeft /> Previous
          </button>
        )}
        <button
          id="q-next-btn"
          className="btn btn-primary"
          onClick={goToNextQuestion}
          disabled={!canProceed}
          style={{ gap: '6px', minWidth: '120px' }}
        >
          {isLast ? 'Analyze Results' : 'Next Question'} <ArrowRight />
        </button>
      </div>
    </div>
  );
}
