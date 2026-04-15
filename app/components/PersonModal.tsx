'use client';

import { useState } from 'react';
import { useApp, PersonType, Relation, Gender } from '../context/AppContext';

const UserIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const UsersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const RELATIONS: Relation[] = ['Parent', 'Child', 'Spouse', 'Sibling', 'Friend', 'Other'];

const OPTIONS: {
  type: PersonType;
  icon: React.ReactNode;
  label: { en: string; hi: string; mr: string };
  desc: { en: string; hi: string; mr: string };
}[] = [
    {
      type: 'self',
      icon: <UserIcon />,
      label: { en: 'Myself', hi: 'मेरे लिए', mr: 'स्वतःसाठी' },
      desc: { en: 'Assess your own symptoms', hi: 'अपने लक्षणों का आकलन करें', mr: 'स्वतःच्या लक्षणांचे मूल्यांकन करा' },
    },
    {
      type: 'family',
      icon: <UsersIcon />,
      label: { en: 'Someone Else', hi: 'किसी और के लिए', mr: 'दुसऱ्यासाठी' },
      desc: { en: "Assess someone else's symptoms", hi: 'किसी और के लक्षणों का आकलन करें', mr: 'इतरांच्या लक्षणांचे मूल्यांकन करा' },
    },
  ];

export default function PersonModal() {
  const { language, personType, setPersonType, setPatientInfo, setTriageScreen, cancelTest } = useApp();
  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';

  const [name, setName] = useState('');
  const [relation, setRelation] = useState<Relation | ''>('');
  const [customRelation, setCustomRelation] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');

  const GENDERS: { value: Gender; label: { en: string; hi: string; mr: string }; emoji: string }[] = [
    { value: 'Male', label: { en: 'Male', hi: 'पुरुष', mr: 'पुरुष' }, emoji: '♂️' },
    { value: 'Female', label: { en: 'Female', hi: 'महिला', mr: 'महिला' }, emoji: '♀️' },
    { value: 'Other', label: { en: 'Other', hi: 'अन्य', mr: 'इतर' }, emoji: '⚧️' },
    { value: 'Prefer not to say', label: { en: 'Prefer not to say', hi: 'बताना नहीं', mr: 'सांगणे नको' }, emoji: '🔒' },
  ];

  const canProceed =
    personType !== null &&
    name.trim().length >= 2 &&
    gender !== '' &&
    (personType === 'self' || (personType === 'family' && relation !== ''));

  const handleContinue = () => {
    if (!personType || !canProceed) return;
    const finalRelation: Relation | null =
      personType === 'self'
        ? null
        : relation === 'Other'
          ? ((customRelation.trim() || 'Other') as Relation)
          : (relation as Relation);
    setPatientInfo(name.trim(), finalRelation, gender as Gender);
    setTriageScreen('questions');
  };

  return (
    <div className="modal-overlay" onClick={cancelTest}>
      <div
        className="card modal-in"
        style={{ width: '100%', maxWidth: '440px', padding: '28px', margin: '16px', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '20px' }}>
          {language === 'Hindi' ? 'यह मूल्यांकन किसके लिए है?' : language === 'Marathi' ? 'हे मूल्यांकन कोणासाठी आहे?' : 'Who is this assessment for?'}
        </h2>

        {/* Person type selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {OPTIONS.map((opt) => {
            const sel = personType === opt.type;
            return (
              <button
                key={opt.type}
                id={`person-${opt.type}`}
                onClick={() => { setPersonType(opt.type); setName(''); setRelation(''); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                  padding: '16px 12px', borderRadius: '12px', cursor: 'pointer',
                  border: sel ? '1.5px solid #B91C1C' : '1.5px solid var(--border)',
                  background: sel ? '#FEF2F2' : 'white',
                  fontFamily: 'inherit', transition: 'all 0.15s ease', position: 'relative',
                }}
              >
                {sel && (
                  <div style={{ position: 'absolute', top: '8px', right: '8px', width: '16px', height: '16px', borderRadius: '50%', background: '#B91C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <CheckIcon />
                  </div>
                )}
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: sel ? '#FEE2E2' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sel ? '#B91C1C' : '#6B7280' }}>
                  {opt.icon}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: sel ? '#991B1B' : 'var(--text-1)' }}>{opt.label[langKey]}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '2px' }}>{opt.desc[langKey]}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Name + relation + gender inputs */}
        {personType && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-2)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {personType === 'self'
                  ? (language === 'Hindi' ? 'आपका नाम' : language === 'Marathi' ? 'तुमचे नाव' : 'Your name')
                  : (language === 'Hindi' ? 'मरीज़ का नाम' : language === 'Marathi' ? 'रुग्णाचे नाव' : "Patient's name")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={personType === 'self'
                  ? (language === 'Hindi' ? 'जैसे रिषभ' : language === 'Marathi' ? 'उदा. रिषभ' : 'e.g. Rishabh')
                  : (language === 'Hindi' ? 'जैसे अमित' : language === 'Marathi' ? 'उदा. अमित' : 'e.g. Amit')}
                className="input"
                style={{ width: '100%' }}
                autoFocus
              />
            </div>

            {personType === 'family' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-2)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {language === 'Hindi' ? 'संबंध' : language === 'Marathi' ? 'नाते' : 'Relation'}
                </label>
                <select
                  value={relation}
                  onChange={(e) => setRelation(e.target.value as Relation)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="">
                    {language === 'Hindi' ? 'संबंध चुनें...' : language === 'Marathi' ? 'नाते निवडा...' : 'Select relation...'}
                  </option>
                  {RELATIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {relation === 'Other' && (
                  <input
                    type="text"
                    value={customRelation}
                    onChange={(e) => setCustomRelation(e.target.value)}
                    placeholder={language === 'Hindi' ? 'संबंध बताएं...' : language === 'Marathi' ? 'नाते सांगा...' : 'Specify relation...'}
                    className="input"
                    style={{ width: '100%', marginTop: '8px' }}
                  />
                )}
              </div>
            )}

            {/* Gender selector — shown for both self and family */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {language === 'Hindi' ? 'लिंग' : language === 'Marathi' ? 'लिंग' : 'Gender'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {GENDERS.map((g) => {
                  const sel = gender === g.value;
                  return (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGender(g.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '9px 12px', borderRadius: '9px', cursor: 'pointer',
                        border: sel ? '1.5px solid #B91C1C' : '1.5px solid var(--border)',
                        background: sel ? '#FEF2F2' : 'white',
                        fontFamily: 'inherit', transition: 'all 0.12s ease',
                      }}
                    >
                      <span style={{ fontSize: '15px', lineHeight: 1 }}>{g.emoji}</span>
                      <span style={{ fontSize: '12.5px', fontWeight: sel ? '700' : '500', color: sel ? '#991B1B' : 'var(--text-2)' }}>
                        {g.label[langKey]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={cancelTest} style={{ flex: 1, justifyContent: 'center' }}>
            {language === 'Hindi' ? 'पीछे' : language === 'Marathi' ? 'मागे' : 'Back'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleContinue}
            disabled={!canProceed}
            style={{ flex: 2, justifyContent: 'center', opacity: canProceed ? 1 : 0.45, cursor: canProceed ? 'pointer' : 'not-allowed' }}
          >
            {language === 'Hindi' ? 'मूल्यांकन शुरू करें →' : language === 'Marathi' ? 'मूल्यांकन सुरू करा →' : 'Start Assessment →'}
          </button>
        </div>
      </div>
    </div>
  );
}
