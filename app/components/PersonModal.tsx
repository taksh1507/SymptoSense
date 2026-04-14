'use client';

import { useApp, PersonType } from '../context/AppContext';

const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const OPTIONS: { type: PersonType; icon: React.ReactNode; label: { en: string; hi: string; mr: string }; desc: { en: string; hi: string; mr: string } }[] = [
  { 
    type: 'self', icon: <UserIcon />, 
    label: { en: 'Myself', hi: 'मेरे लिए', mr: 'स्वतःसाठी' }, 
    desc: { en: 'Assess your own symptoms', hi: 'अपने लक्षणों का आकलन करें', mr: 'स्वतःच्या लक्षणांचे मूल्यांकन करा' } 
  },
  { 
    type: 'family', icon: <UsersIcon />, 
    label: { en: 'Family Member', hi: 'परिवार के सदस्य', mr: 'कुटुंबातील सदस्य' }, 
    desc: { en: 'Assess someone else\'s symptoms', hi: 'किसी और के लक्षणों का आकलन करें', mr: 'इतर सदस्याच्या लक्षणांचे मूल्यांकन करा' } 
  },
];

export default function PersonModal() {
  const { language, personType, setPersonType, setTriageScreen, cancelTest } = useApp();
  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';

  return (
    <div className="modal-overlay" onClick={cancelTest}>
      <div
        className="card modal-in"
        style={{ width: '100%', maxWidth: '420px', padding: '28px', margin: '16px', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '5px' }}>
          {language === 'Hindi' ? 'यह परीक्षण किसके लिए है?' : language === 'Marathi' ? 'ही चाचणी कोणासाठी आहे?' : 'Who is this test for?'}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '22px' }}>
          {language === 'Hindi' ? 'तय करें कि आप किसका मूल्यांकन कर रहे हैं' : language === 'Marathi' ? 'तुम्ही कोणाचे मूल्यांकन करत आहात ते निवडा' : 'Determine who you are assessing today'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '22px' }}>
          {OPTIONS.map((opt) => {
            const sel = personType === opt.type;
            return (
              <button
                key={opt.type}
                id={`person-${opt.type}`}
                onClick={() => setPersonType(opt.type)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                  padding: '20px 14px', borderRadius: '12px', cursor: 'pointer',
                  border: sel ? '1.5px solid #B91C1C' : '1.5px solid var(--border)',
                  background: sel ? '#FEF2F2' : 'white',
                  fontFamily: 'inherit', transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                {sel && (
                  <div style={{
                    position: 'absolute', top: '10px', right: '10px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: '#B91C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                  }}><CheckIcon /></div>
                )}
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: sel ? '#FEE2E2' : '#F3F4F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: sel ? '#B91C1C' : '#6B7280',
                  transition: 'all 0.15s ease',
                }}>{opt.icon}</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: '700', color: sel ? '#991B1B' : 'var(--text-1)' }}>{opt.label[langKey]}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-4)', marginTop: '2px' }}>{opt.desc[langKey]}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button id="person-cancel-btn" className="btn btn-outline" onClick={cancelTest} style={{ flex: 1, justifyContent: 'center' }}>
            {language === 'Hindi' ? 'पीछे' : language === 'Marathi' ? 'मागे' : 'Back'}
          </button>
          <button
            id="person-continue-btn"
            className="btn btn-primary"
            onClick={() => { if (personType) setTriageScreen('questions'); }}
            disabled={!personType}
            style={{ flex: 2, justifyContent: 'center', opacity: personType ? 1 : 0.45, cursor: personType ? 'pointer' : 'not-allowed' }}
          >
            {language === 'Hindi' ? 'चाचणी शुरू करें' : language === 'Marathi' ? 'चाचणी सुरू करा' : 'Start Assessment'} →
          </button>
        </div>
      </div>
    </div>
  );
}
