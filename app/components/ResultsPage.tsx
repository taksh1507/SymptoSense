'use client';

import { useApp } from '../context/AppContext';

function GaugeChart({ score, max = 100 }: { score: number; max?: number }) {
  const pct = score / max;
  const r = 70;
  const circumference = Math.PI * r;
  const dashOffset = circumference * (1 - pct);
  const colors = { high: '#B91C1C', med: '#B45309', low: '#15803D' };
  const labels = {
    en: { high: 'HIGH', med: 'MEDIUM', low: 'LOW', risk: 'RISK' },
    hi: { high: 'उच्च', med: 'मध्यम', low: 'कम', risk: 'जोखिम' },
    mr: { high: 'उच्च', med: 'मध्यम', low: 'सौम्य', risk: 'जोखीम' }
  };
  
  const status = pct >= 0.7 ? 'high' : pct >= 0.35 ? 'med' : 'low';
  const color = colors[status];
  const emoji = pct >= 0.7 ? '🔴' : pct >= 0.35 ? '🟡' : '🟢';
  
  const { language } = useApp();
  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';
  const displayLabel = labels[langKey][status];
  const riskLabel = labels[langKey]['risk'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="180" height="100" viewBox="0 0 180 100">
        <path d="M 15 90 A 70 70 0 0 1 165 90" fill="none" stroke="var(--border-faint)" strokeWidth="14" strokeLinecap="round" />
        <path d="M 15 90 A 70 70 0 0 1 165 90" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.19, 1, 0.22, 1)' }} />
        <text x="90" y="72" textAnchor="middle" fontSize="32" fontWeight="900" fill={color} style={{ fontFamily: 'var(--font)' }}>{score}</text>
        <text x="90" y="92" textAnchor="middle" fontSize="12" fill="var(--text-4)" style={{ fontFamily: 'var(--font)' }}>/ {max}</text>
      </svg>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px',
        background: pct >= 0.7 ? 'var(--red-light)' : pct >= 0.35 ? '#FFFBEB' : '#F0FDF4',
        border: `1.5px solid ${color}33`, borderRadius: '999px', padding: '6px 20px',
      }}>
        <span style={{ fontSize: '18px' }}>{emoji}</span>
        <span style={{ fontSize: '18px' }}>{emoji}</span>
        <span style={{ fontSize: '15px', fontWeight: '800', color }}>{displayLabel} {riskLabel}</span>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const { language, riskScore, riskLevel, narrative, setTriageScreen, selectedAnswers } = useApp();

  const getRecommendation = (score: number) => {
    if (score >= 70) return { 
        title: { en: 'Seek Emergency Care', hi: 'आपातकालीन देखभाल प्राप्त करें', mr: 'तात्काळ आपत्कालीन मदत घ्या' }, 
        desc: { en: 'Visit the nearest hospital casualty department immediately.', hi: 'तुरंत निकटतम अस्पताल के कैजुअल्टी विभाग में जाएँ।', mr: 'ताबडतोब जवळच्या रुग्णालयाच्या कॅज्युअल्टी विभागात जा.' }, 
        type: 'urgent' 
    };
    if (score >= 35) return { 
        title: { en: 'Consult Your Doctor', hi: 'अपने डॉक्टर से सलाह लें', mr: 'तुमच्या डॉक्टरांचा सल्ला घ्या' }, 
        desc: { en: 'Schedule an appointment within the next 24 hours.', hi: 'अगले 24 घंटों के भीतर अपॉइंटमेंट शेड्यूल करें।', mr: 'पुढील २४ तासांच्या आत डॉक्टरांची भेट घ्या.' }, 
        type: 'moderate' 
    };
    return { 
        title: { en: 'Home Management', hi: 'होम मैनेजमेंट', mr: 'घरीच उपचार' }, 
        desc: { en: 'Monitor symptoms and rest. Consult doctor if conditions worsen.', hi: 'लक्षणों की निगरानी करें और आराम करें। यदि स्थिति बिगड़ती है तो डॉक्टर से परामर्श करें।', mr: 'लक्षणांवर लक्ष ठेवा आणि विश्रांती घ्या. स्थिती बिघडल्यास डॉक्टरांचा सल्ला घ्या.' }, 
        type: 'low' 
    };
  };

  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';
  const rec = getRecommendation(riskScore);
  const detectedSymptoms = (selectedAnswers[1] || '').split(',').filter(Boolean);

  return (
    <div className="mobile-padding" style={{ padding: '32px', minHeight: '100%', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-1)', margin: 0, letterSpacing: '-0.5px' }}>
            {language === 'Hindi' ? 'मूल्यांकन परिणाम' : language === 'Marathi' ? 'मूल्यांकन निकाल' : 'Assessment Result'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', marginTop: '4px' }}>
            {language === 'Hindi' ? 'रिपोर्ट जनरेट की गई:' : 'Report generated on'} {new Date().toLocaleDateString(langKey, { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setTriageScreen('language')}
          style={{ gap: '8px' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
          {language === 'Hindi' ? 'पुनः प्रारंभ' : language === 'Marathi' ? 'पुन्हा सुरू करा' : 'Restart Triage'}
        </button>
      </div>

      <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
        {/* LEFT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Gauge & Analysis */}
          <div className="card" style={{ padding: '32px' }}>
            <div className="mobile-flex-stack" style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
              <div style={{ flexShrink: 0 }}>
                <GaugeChart score={riskScore} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  background: riskScore >= 70 ? 'rgba(185, 28, 28, 0.05)' : riskScore >= 35 ? '#FFFBEB' : '#F0FDF4',
                  borderLeft: `4px solid ${riskScore >= 70 ? 'var(--red)' : riskScore >= 35 ? '#B45309' : '#15803D'}`,
                  padding: '16px 20px', borderRadius: '10px'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '6px' }}>
                    {rec.title[langKey] || rec.title.en}
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-3)', lineHeight: '1.6' }}>
                    {narrative?.[langKey] || rec.desc[langKey] || rec.desc.en}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="code-block" style={{ marginTop: '24px', fontSize: '11px' }}>
              <span className="cm">// Logic Path: {riskLevel.toUpperCase()} RISK detected</span>{'\n'}
              <span className="kw">risk_level</span> = {riskScore} / 100;{'\n'}
              <span className="kw">recommendation</span> = {`"${rec.title.en}"`};
            </div>
          </div>

          {/* Recommendations Breakdown */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             {language === 'Hindi' ? 'अगले कदम' : language === 'Marathi' ? 'पुढील पावले' : 'Next Steps'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { icon: '🏥', title: { en: 'Hospital Visit', hi: 'अस्पताल', mr: 'रुग्णालय भेट' }, active: riskScore >= 70 },
                { icon: '👨‍⚕️', title: { en: 'Call Doctor', hi: 'डॉक्टर को बुलाएं', mr: 'डॉक्टरांना कॉल करा' }, active: riskScore >= 35 },
                { icon: '🩹', title: { en: 'Home Care', hi: 'घर पर देखभाल', mr: 'घरीच काळजी' }, active: true },
                { icon: '💊', title: { en: 'Medication', hi: 'दवा', mr: 'औषधोपचार' }, active: riskScore >= 35 },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '16px', borderRadius: '12px',
                  border: '1.5px solid var(--border)',
                  background: item.active ? 'white' : 'var(--bg)',
                  opacity: item.active ? 1 : 0.4,
                  transition: 'all 0.2s',
                  boxShadow: item.active ? 'var(--shadow-sm)' : 'none'
                }}>
                  <span style={{ fontSize: '24px' }}>{item.icon}</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-1)' }}>{item.title[langKey] || item.title.en}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Symptoms Found */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '16px' }}>
                {language === 'Hindi' ? 'पता लगाए गए लक्षण' : language === 'Marathi' ? 'आढळलेले लक्षणे' : 'Detected Markers'}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {detectedSymptoms.length > 0 ? detectedSymptoms.map((tag) => (
                <span key={tag} style={{
                  background: 'var(--red-light)', color: 'var(--red)', border: '1px solid var(--red-border)',
                  padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', textTransform: 'capitalize'
                }}>{tag.replace('_', ' ')}</span>
              )) : <span style={{ color: 'var(--text-4)' }}>{language === 'Hindi' ? 'कोई लक्षण नहीं चुना गया।' : language === 'Marathi' ? 'कोणतेही लक्षण निवडले नाही.' : 'No specific symptoms selected.'}</span>}
            </div>
            <div className="code-block" style={{ fontSize: '10.5px' }}>
               SELECT * FROM triage_weights WHERE symptom IN ({detectedSymptoms.map(s => `'${s}'`).join(', ') || 'null'})
            </div>
          </div>

          {/* Link to Past Reports */}
          <div className="card" style={{ padding: '24px', flex: 1 }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '16px' }}>
              {language === 'Hindi' ? 'आपका इतिहास' : language === 'Marathi' ? 'तुमचा इतिहास' : 'Your History'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '16px', lineHeight: '1.6' }}>
              {language === 'Hindi' 
                ? 'यह मूल्यांकन आपके खाते में सहेज लिया गया है। समय के साथ अपने स्वास्थ्य के रुझानों को ट्रैक करने के लिए अपनी पिछली सभी रिपोर्ट देखें।'
                : language === 'Marathi'
                ? 'हे मूल्यांकन तुमच्या खात्यात जतन केले गेले आहे. काळानुसार तुमच्या आरोग्याचा कल तपासण्यासाठी तुमचे सर्व जुने अहवाल पहा.'
                : 'This assessment has been saved to your account. View all your past reports to track your health trends over time.'}
            </p>
            <button
              onClick={() => window.location.href = '/dashboard/reports'}
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px' }}
            >
              {language === 'Hindi' ? 'पुरानी रिपोर्ट देखें →' : language === 'Marathi' ? 'जुने अहवाल पहा →' : 'View Past Reports →'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div style={{
        marginTop: '28px', padding: '16px',
        background: 'var(--text-1)', borderRadius: '12px', textAlign: 'center',
      }}>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
          {language === 'Hindi' 
            ? '⚠️ अस्वीकरण: यह एक निर्णय समर्थन उपकरण है। आपात स्थिति के मामले में, तुरंत चिकित्सा पेशेवरों से संपर्क करें।'
            : language === 'Marathi'
            ? '⚠️ अस्वीकरण: हे एक निर्णय समर्थन साधन आहे. आणीबाणीच्या परिस्थितीत, त्वरित वैद्यकीय तज्ञांशी संपर्क साधा.'
            : '⚠️ DISCLAIMER: THIS IS A DECISION SUPPORT TOOL. IN CASE OF EMERGENCY, CONTACT MEDICAL PROFESSIONALS IMMEDIATELY.'}
        </p>
      </div>
    </div>
  );
}
