'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppShell from '@/app/components/AppShell';
import { useApp } from '@/app/context/AppContext';

interface Report {
  id: string;
  createdAt: string;
  score: number;
  urgency: string;
  primaryCategory: string;
  recommendation: string;
}

export default function ReportsPage() {
  const { language } = useApp();
  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';

  const { data: session } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = (session?.user as any)?.id;
    if (!userId) return;
    fetch(`/api/sessions?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [session]);

  const urgencyColor = (u: string) => u === 'High' ? 'var(--red)' : u === 'Medium' ? '#B45309' : '#15803D';
  const urgencyBg = (u: string) => u === 'High' ? 'var(--red-light)' : u === 'Medium' ? '#FFFBEB' : '#F0FDF4';
  const urgencyBorder = (u: string) => u === 'High' ? 'var(--red-border)' : u === 'Medium' ? '#FDE68A' : '#BBF7D0';

  const t = {
    title: { en: 'Past Reports', hi: 'पिछली रिपोर्ट', mr: 'जुने अहवाल' },
    summary: { en: 'total assessments on record', hi: 'कुल मूल्यांकन रिकॉर्ड पर', mr: 'एकूण मूल्यांकन रेकॉर्डवर' },
    loading: { en: 'Loading reports...', hi: 'रिपोर्ट लोड हो रही है...', mr: 'अहवाल लोड होत आहेत...' },
    noReports: { en: 'No reports yet', hi: 'अभी तक कोई रिपोर्ट नहीं', mr: 'अद्याप कोणतेही अहवाल नाहीत' },
    noReportsDesc: { en: 'Complete your first symptom assessment to see results here.', hi: 'यहां परिणाम देखने के लिए अपना पहला लक्षण मूल्यांकन पूरा करें।', mr: 'येथे निकाल पाहण्यासाठी तुमचे पहिले लक्षण मूल्यांकन पूर्ण करा.' }
  };

  return (
    <AppShell>
      <div className="mobile-padding" style={{ padding: '28px 32px', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-1)', letterSpacing: '-0.5px' }}>{t.title[langKey]}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', marginTop: '4px' }}>
            {reports.length} {t.summary[langKey]}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-4)' }}>{t.loading[langKey]}</div>
        ) : reports.length === 0 ? (
          <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📋</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '8px' }}>{t.noReports[langKey]}</div>
            <div style={{ fontSize: '14px', color: 'var(--text-3)' }}>{t.noReportsDesc[langKey]}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reports.map((r) => (
              <div
                key={r.id}
                className="card card-lift"
                onClick={() => router.push(`/dashboard/reports/${r.id}`)}
                style={{ padding: '20px 24px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '999px',
                        background: urgencyBg(r.urgency), color: urgencyColor(r.urgency),
                        border: `1px solid ${urgencyBorder(r.urgency)}`,
                      }}>
                        {r.urgency} Risk
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-4)' }}>
                        {new Date(r.createdAt).toLocaleDateString(langKey === 'hi' ? 'hi-IN' : langKey === 'mr' ? 'mr-IN' : 'en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '6px' }}>
                      <strong>{language === 'Hindi' ? 'श्रेणी' : language === 'Marathi' ? 'वर्ग' : 'Category'}:</strong> {r.primaryCategory || (language === 'Hindi' ? 'सामान्य' : language === 'Marathi' ? 'सामान्य' : 'General')}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: '1.5' }}>
                      {r.recommendation}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: urgencyColor(r.urgency), lineHeight: 1 }}>{r.score}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '2px' }}>/ 100</div>
                    </div>
                    <span style={{ color: 'var(--text-4)', fontSize: '18px' }}>›</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
