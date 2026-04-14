'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/app/components/AppShell';
import { useApp } from '@/app/context/AppContext';

interface Factor {
  id: string;
  label: string;
  score: number;
  isRedFlag: boolean;
  category: string;
}

interface ReportDetail {
  id: string;
  createdAt: string;
  score: number;
  urgency: string;
  primaryCategory: string;
  recommendation: string;
  factors: string;
  answers: string;
  personName: string;
}

function GaugeChart({ score, max = 100 }: { score: number; max?: number }) {
  const pct = score / max;
  const r = 70;
  const circumference = Math.PI * r;
  const dashOffset = circumference * (1 - pct);
  const color = pct >= 0.7 ? '#B91C1C' : pct >= 0.35 ? '#B45309' : '#15803D';
  const emoji = pct >= 0.7 ? '🔴' : pct >= 0.35 ? '🟡' : '🟢';

  const { language } = useApp();
  const labels = {
    en: { high: 'HIGH', med: 'MEDIUM', low: 'LOW', risk: 'RISK' },
    hi: { high: 'उच्च', med: 'मध्यम', low: 'कम', risk: 'जोखिम' },
    mr: { high: 'उच्च', med: 'मध्यम', low: 'सौम्य', risk: 'जोखीम' }
  };
  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';
  const status = pct >= 0.7 ? 'high' : pct >= 0.35 ? 'med' : 'low';
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
        <span style={{ fontSize: '15px', fontWeight: '800', color }}>{displayLabel} {riskLabel}</span>
      </div>
    </div>
  );
}

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { language } = useApp();
  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sessions?sessionId=${id}`)
      .then((r) => r.json())
      .then((data) => setReport(data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-4)' }}>
          {language === 'Hindi' ? 'रिपोर्ट लोड हो रही है...' : language === 'Marathi' ? 'अहवाल लोड होत आहे...' : 'Loading report...'}
        </div>
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-3)' }}>Report not found.</p>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard/reports')} style={{ marginTop: '16px' }}>
            Back to Reports
          </button>
        </div>
      </AppShell>
    );
  }

  const score = report.score ?? 0;
  const urgency = report.urgency ?? 'Low';
  const factors: Factor[] = (() => { try { return JSON.parse(report.factors || '[]'); } catch { return []; } })();
  const urgencyColor = urgency === 'High' ? '#B91C1C' : urgency === 'Medium' ? '#B45309' : '#15803D';

  const getRecommendation = (s: number) => {
    if (s >= 70) return { 
        title: { en: 'Seek Emergency Care', hi: 'आपातकालीन देखभाल प्राप्त करें', mr: 'तात्काळ आपत्कालीन मदत घ्या' }, 
        desc: { en: 'Visit the nearest hospital casualty department immediately.', hi: 'तुरंत निकटतम अस्पताल के कैजुअल्टी विभाग में जाएँ।', mr: 'ताबडतोब जवळच्या रुग्णालयाच्या कॅज्युअल्टी विभागात जा.' }, 
        type: 'urgent' 
    };
    if (s >= 35) return { 
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
  const rec = getRecommendation(score);

  return (
    <AppShell>
      <div className="mobile-padding" style={{ padding: '28px 32px', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <button
              onClick={() => router.push('/dashboard/reports')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '13px', fontFamily: 'inherit', marginBottom: '8px', padding: 0 }}
            >
              ← {language === 'Hindi' ? 'रिपोर्ट पर वापस जाएं' : language === 'Marathi' ? 'अहवालांकडे परत जा' : 'Back to Reports'}
            </button>
            <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-1)', letterSpacing: '-0.5px', margin: 0 }}>
              {language === 'Hindi' ? 'मूल्यांकन परिणाम' : language === 'Marathi' ? 'मूल्यांकन निकाल' : 'Assessment Result'}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-3)', marginTop: '4px' }}>
              {new Date(report.createdAt).toLocaleDateString(langKey === 'hi' ? 'hi-IN' : langKey === 'mr' ? 'mr-IN' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {report.personName && report.personName !== 'Myself' && ` · ${language === 'Hindi' ? 'के लिए' : language === 'Marathi' ? 'साठी' : 'For'} ${report.personName}`}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard')} style={{ gap: '8px' }}>
            {language === 'Hindi' ? 'नया मूल्यांकन' : language === 'Marathi' ? 'नवीन मूल्यांकन' : 'New Assessment'}
          </button>
        </div>

        <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Gauge + Recommendation */}
            <div className="card" style={{ padding: '32px' }}>
              <div className="mobile-flex-stack" style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                <div style={{ flexShrink: 0 }}>
                  <GaugeChart score={score} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    background: score >= 70 ? 'rgba(185,28,28,0.05)' : score >= 35 ? '#FFFBEB' : '#F0FDF4',
                    borderLeft: `4px solid ${urgencyColor}`,
                    padding: '16px 20px', borderRadius: '10px',
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '6px' }}>{rec.title[langKey]}</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-3)', lineHeight: '1.6' }}>{rec.desc[langKey]}</p>
                  </div>
                  {report.recommendation && (
                    <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '12px', lineHeight: '1.6', fontStyle: 'italic' }}>
                      {report.recommendation}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '20px' }}>
                {language === 'Hindi' ? 'अगले कदम' : language === 'Marathi' ? 'पुढील पावले' : 'Next Steps'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { icon: '🏥', title: { en: 'Hospital Visit', hi: 'अस्पताल', mr: 'रुग्णालय भेट' }, active: score >= 70 },
                  { icon: '👨‍⚕️', title: { en: 'Call Doctor', hi: 'डॉक्टर को बुलाएं', mr: 'डॉक्टरांना कॉल करा' }, active: score >= 35 },
                  { icon: '🩹', title: { en: 'Home Care', hi: 'घर पर देखभाल', mr: 'घरीच काळजी' }, active: true },
                  { icon: '💊', title: { en: 'Medication', hi: 'दवा', mr: 'औषधोपचार' }, active: score >= 35 },
                ].map((item) => (
                  <div key={item.title.en} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '16px', borderRadius: '12px',
                    border: '1.5px solid var(--border)',
                    background: item.active ? 'white' : 'var(--bg)',
                    opacity: item.active ? 1 : 0.4,
                    boxShadow: item.active ? 'var(--shadow-sm)' : 'none',
                  }}>
                    <span style={{ fontSize: '24px' }}>{item.icon}</span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-1)' }}>{item.title[langKey]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Risk Factors */}
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '16px' }}>
                {language === 'Hindi' ? 'जोखिम कारक' : language === 'Marathi' ? 'जोखीम घटक' : 'Risk Factors'} {factors.length > 0 && <span style={{ fontSize: '12px', color: 'var(--text-4)', fontWeight: '500' }}>({factors.length} {language === 'Hindi' ? 'पाया गया' : language === 'Marathi' ? 'सापडले' : 'detected'})</span>}
              </h3>
              {factors.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-4)' }}>No specific factors recorded.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {factors.map((f) => (
                    <span key={f.id} style={{
                      background: f.isRedFlag ? 'var(--red-light)' : 'var(--bg)',
                      color: f.isRedFlag ? 'var(--red)' : 'var(--text-2)',
                      border: `1px solid ${f.isRedFlag ? 'var(--red-border)' : 'var(--border)'}`,
                      padding: '5px 12px', borderRadius: '999px',
                      fontSize: '12px', fontWeight: '600',
                    }}>
                      {f.isRedFlag && '⚠️ '}{f.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Category & Score Breakdown */}
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '16px' }}>
                {language === 'Hindi' ? 'सारांश' : language === 'Marathi' ? 'सारांश' : 'Summary'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: { en: 'Risk Score', hi: 'जोखिम स्कोर', mr: 'जोखीम स्कोअर' }, value: `${score} / 100` },
                  { label: { en: 'Urgency Level', hi: 'उग्रता स्तर', mr: 'तातडीची पातळी' }, value: language === 'Hindi' ? (urgency === 'High' ? 'उच्च' : urgency === 'Medium' ? 'मध्यम' : 'कम') : language === 'Marathi' ? (urgency === 'High' ? 'उच्च' : urgency === 'Medium' ? 'मध्यम' : 'सौम्य') : urgency },
                  { label: { en: 'Primary Category', hi: 'प्राथमिक श्रेणी', mr: 'मुख्य श्रेणी' }, value: report.primaryCategory || (language === 'Hindi' ? 'सामान्य' : language === 'Marathi' ? 'सामान्य' : 'General') },
                  { label: { en: 'Date', hi: 'दिनांक', mr: 'तारीख' }, value: new Date(report.createdAt).toLocaleDateString(langKey === 'hi' ? 'hi-IN' : langKey === 'mr' ? 'mr-IN' : 'en-US') },
                ].map((item) => (
                  <div key={item.label.en} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-faint)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-3)', fontWeight: '600' }}>{item.label[langKey]}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-1)', fontWeight: '700' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop: '28px', padding: '16px', background: 'var(--text-1)', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
            {language === 'Hindi' 
              ? '⚠️ अस्वीकरण: यह एक निर्णय समर्थन उपकरण है। आपात स्थिति के मामले में, तुरंत चिकित्सा पेशेवरों से संपर्क करें।'
              : language === 'Marathi'
              ? '⚠️ अस्वीकरण: हे एक निर्णय समर्थन साधन आहे. आणीबाणीच्या परिस्थितीत, त्वरित वैद्यकीय तज्ञांशी संपर्क साधा.'
              : '⚠️ DISCLAIMER: THIS IS A DECISION SUPPORT TOOL. IN CASE OF EMERGENCY, CONTACT MEDICAL PROFESSIONALS IMMEDIATELY.'}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
