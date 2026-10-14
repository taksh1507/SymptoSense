'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FileText, ChevronRight } from 'lucide-react';
import { Badge, Button, Notice, Section, Table, Skeleton, EmptyState } from '@/components/ui/primitives';
import { useUiText } from '@/components/ui/use-ui-text';
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
  const text = useUiText();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    fetch('/api/sessions?page=' + page)
      .then(r => {
        if (!r.ok) throw new Error('Could not load reports.');
        return r.json();
      })
      .then(data => {
        if (active) {
          setReports(data.sessions ?? []);
          setTotal(data.total ?? 0);
        }
      })
      .catch(e => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session, page]);

  const t = {
    title: { en: 'Past Reports', hi: 'पिछली रिपोर्ट', mr: 'जुने अहवाल' },
    summary: { en: 'total assessments on record', hi: 'कुल मूल्यांकन रिकॉर्ड पर', mr: 'एकूण मूल्यांकन रेकॉर्डवर' },
    noReports: { en: 'No reports yet', hi: 'अभी तक कोई रिपोर्ट नहीं', mr: 'अद्याप कोणतेही अहवाल नाहीत' },
    noReportsDesc: {
      en: 'Complete your first symptom assessment to see verified records here.',
      hi: 'यहाँ सत्यापित रिकॉर्ड देखने के लिए अपना पहला लक्षण मूल्यांकन पूरा करें।',
      mr: 'येथे पडताळलेले अहवाल पाहण्यासाठी पहिले मूल्यांकन पूर्ण करा.',
    },
  };

  return (
    <AppShell>
      <div className="page">
        <div className="content-wrapper stack-lg">
          <header className="stack">
            <p className="eyebrow">{text('Your health record', 'आपका स्वास्थ्य रिकॉर्ड', 'तुमची आरोग्य नोंद')}</p>
            <h1>{t.title[langKey]}</h1>
            <p className="muted">
              {total} {t.summary[langKey]}
            </p>
          </header>

          {error && <Notice tone="warning" role="alert">{error}</Notice>}

          {loading ? (
            <div className="stack">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : reports.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-8 h-8 text-teal-700" />}
              title={t.noReports[langKey]}
              description={t.noReportsDesc[langKey]}
              action={
                <Button onClick={() => (window.location.href = '/dashboard')}>
                  {text('Start an assessment', 'मूल्यांकन शुरू करें', 'मूल्यांकन सुरू करा')}
                </Button>
              }
            />
          ) : (
            <Section>
              <Table className="reports-table" aria-label={t.title[langKey]}>
                <thead>
                  <tr>
                    <th>{text('Assessment', 'मूल्यांकन', 'मूल्यांकन')}</th>
                    <th>{text('Urgency', 'तात्कालिकता', 'तातडी')}</th>
                    <th>{text('Score', 'स्कोर', 'स्कोअर')}</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id}>
                      <td>
                        <Link className="table-report-link font-semibold text-teal-800 hover:text-teal-900" href={`/dashboard/reports/${r.id}`}>
                          {new Date(r.createdAt).toLocaleDateString(
                            langKey === 'hi' ? 'hi-IN' : langKey === 'mr' ? 'mr-IN' : 'en-US',
                            { year: 'numeric', month: 'short', day: 'numeric' }
                          )}
                        </Link>
                        <p className="text-xs text-slate-700 mt-0.5">{r.primaryCategory || text('General', 'सामान्य', 'सामान्य')}</p>
                        <p className="muted text-xs mt-0.5">{r.recommendation}</p>
                      </td>
                      <td>
                        <Badge urgency={r.urgency}>
                          {r.urgency === 'High'
                            ? text('High', 'उच्च', 'उच्च')
                            : r.urgency === 'Medium'
                            ? text('Medium', 'मध्यम', 'मध्यम')
                            : text('Low', 'कम', 'कमी')}
                        </Badge>
                      </td>
                      <td className="font-semibold text-slate-800">{r.score} / 100</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Section>
          )}

          {total > 20 && (
            <nav className="row between" aria-label={text('Report pages', 'रिपोर्ट के पृष्ठ', 'अहवालाची पाने')}>
              <Button
                variant="secondary"
                disabled={page === 1 || loading}
                onClick={() => setPage(p => p - 1)}
              >
                {text('Previous', 'पिछला', 'मागील')}
              </Button>
              <span className="text-xs text-slate-500 font-medium">
                {text('Page', 'पृष्ठ', 'पान')} {page}
              </span>
              <Button
                variant="secondary"
                disabled={page * 20 >= total || loading}
                onClick={() => setPage(p => p + 1)}
              >
                {text('Next', 'अगला', 'पुढील')}
              </Button>
            </nav>
          )}
        </div>
      </div>
    </AppShell>
  );
}
