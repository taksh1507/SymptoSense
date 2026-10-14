'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowRight, ChevronDown, FileText, Activity, Calendar, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Badge, Button, Notice, Section, Skeleton, EmptyState } from '@/components/ui/primitives';
import { useUiText } from '@/components/ui/use-ui-text';

interface Report {
  id: string;
  createdAt: string;
  score: number;
  urgency: string;
  primaryCategory: string;
  answers: string;
  isSelf: boolean;
  personName: string;
}

const W = 340, H = 140, PAD = { l: 28, r: 10, t: 8, b: 22 };

function RiskChart({ data }: { data: { m: string; v: number }[] }) {
  const t = useUiText();
  if (data.length < 2) {
    return (
      <div className="py-6 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center">
        <p className="text-xs text-slate-500 font-medium">
          {t(
            'Complete at least 2 assessments to visualize your urgency progression over time.',
            'समय के साथ तात्कालिकता का रुझान देखने के लिए कम से कम 2 मूल्यांकन पूरे करें।',
            'कालांतराने तातडीचा कल पाहण्यासाठी किमान २ मूल्यांकने पूर्ण करा.'
          )}
        </p>
      </div>
    );
  }

  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const maxV = Math.max(...data.map(d => d.v), 10);
  const pts = data.map((d, i) => ({
    x: PAD.l + (i / (data.length - 1)) * iW,
    y: PAD.t + (1 - d.v / maxV) * iH,
    ...d
  }));
  const line = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');

  return (
    <figure className="history-figure">
      <svg
        className="chart-history"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t('Urgency score history', 'तात्कालिकता स्कोर का इतिहास', 'तातडीच्या स्कोअरचा इतिहास')}
      >
        <title>{data.map(d => d.m + ': ' + d.v).join('; ')}</title>
        {[0, Math.round(maxV / 3), Math.round((maxV * 2) / 3), maxV].map(v => (
          <g key={v}>
            <line
              x1={PAD.l}
              y1={PAD.t + (1 - v / maxV) * iH}
              x2={W - PAD.r}
              y2={PAD.t + (1 - v / maxV) * iH}
              stroke="var(--border)"
            />
            <text
              x={PAD.l - 5}
              y={PAD.t + (1 - v / maxV) * iH + 4}
              fontSize="12"
              fill="var(--text-3)"
              textAnchor="end"
            >
              {v}
            </text>
          </g>
        ))}
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="var(--accent)" />
            <text x={p.x} y={H - 4} fontSize="10" fill="var(--text-3)" textAnchor="middle">
              {p.m}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="muted">
        {t(
          'Past scores show urgency at the time of each assessment.',
          'पिछले स्कोर हर मूल्यांकन के समय की तात्कालिकता दिखाते हैं।',
          'मागील स्कोअर प्रत्येक मूल्यांकनाच्या वेळची तातडी दर्शवतात.'
        )}
      </figcaption>
    </figure>
  );
}

type ChartFilter = 'all' | 'self' | 'family';

export default function Dashboard() {
  const t = useUiText();
  const { startTest } = useApp();
  const { data: session } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [chartFilter, setChartFilter] = useState<ChartFilter>('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = () => setDropdownOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [dropdownOpen]);

  // Fetch real reports from DB
  useEffect(() => {
    const userId = (session?.user as any)?.id;
    if (!userId) return;
    fetch(`/api/sessions?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setReports(Array.isArray(data.sessions) ? data.sessions : []);
      })
      .catch(() => setReports([]))
      .finally(() => setLoadingReports(false));
  }, [session]);

  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'there';
  const userImage = session?.user?.image || null;
  const initials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const { language } = useApp();
  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';

  const lastReport = reports[0];
  const lastScore = lastReport?.score ?? null;
  const lastUrgency = lastReport?.urgency ?? null;
  const lastDate = lastReport
    ? new Date(lastReport.createdAt).toLocaleDateString(langKey, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  // Build chart data from real reports (last 7)
  const filteredReports = reports.filter(r =>
    chartFilter === 'all' ? true : chartFilter === 'self' ? r.isSelf : !r.isSelf
  );
  const chartData = filteredReports
    .slice(0, 7)
    .reverse()
    .map(r => ({
      m: new Date(r.createdAt).toLocaleDateString(langKey, { month: 'short', day: 'numeric' }),
      v: r.score ?? 0,
    }));
  const peakScore = filteredReports.length > 0 ? Math.max(...filteredReports.map(r => r.score ?? 0)) : 0;

  const filterLabel = {
    all: langKey === 'hi' ? 'सभी' : langKey === 'mr' ? 'सर्व' : 'All',
    self: langKey === 'hi' ? 'मेरे लिए' : langKey === 'mr' ? 'स्वतःसाठी' : 'Myself',
    family: langKey === 'hi' ? 'किसी और के लिए' : langKey === 'mr' ? 'दुसऱ्यासाठी' : 'Someone Else',
  };

  const greetingHour = new Date().getHours();
  const greetings = {
    en: greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening',
    hi: greetingHour < 12 ? 'सुप्रभात' : greetingHour < 17 ? 'नमस्कार' : 'शुभ संध्या',
    mr: greetingHour < 12 ? 'सुप्रभात' : greetingHour < 17 ? 'नमस्कार' : 'शुभ संध्या',
  };
  const greeting = greetings[langKey];

  return (
    <div className="page">
      <div className="content-wrapper stack-lg">
        <header className="row between">
          <div className="stack">
            <p className="eyebrow">{t('Your overview', 'आपका विवरण', 'तुमचा आढावा')}</p>
            <h1>
              {greeting}, {userName}
            </h1>
            <p className="muted">
              {new Date().toLocaleDateString(langKey, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          {userImage ? (
            <Image src={userImage} alt="" width={38} height={38} unoptimized />
          ) : (
            <span className="initials">{initials}</span>
          )}
        </header>

        {lastUrgency === 'High' && (
          <Notice tone="danger" role="alert">
            <strong>
              {t(
                'Your last assessment indicated High urgency.',
                'पिछले मूल्यांकन में उच्च तात्कालिकता थी।',
                'मागील मूल्यांकनात उच्च तातडी होती.'
              )}
            </strong>
            <p>
              {t(
                'Please seek medical attention. Your last score was',
                'कृपया चिकित्सा सहायता लें। पिछला स्कोर था',
                'कृपया वैद्यकीय मदत घ्या. मागील स्कोअर होता'
              )}{' '}
              {lastScore}.
            </p>
          </Notice>
        )}

        <Section>
          <div className="row between">
            <div className="stack">
              <h2>{t('How are you feeling?', 'आप कैसा महसूस कर रहे हैं?', 'तुम्हाला कसे वाटत आहे?')}</h2>
              <p>
                {t(
                  'Answer questions about your symptoms to understand the urgency and your next steps.',
                  'लक्षणों के बारे में प्रश्नों के उत्तर दें और तात्कालिकता व अगले कदम समझें।',
                  'लक्षणांविषयी प्रश्नांची उत्तरे देऊन तातडी आणि पुढील पावले समजून घ्या.'
                )}
              </p>
            </div>
            <Button id="start-test-btn" onClick={startTest}>
              {t('Start assessment', 'मूल्यांकन शुरू करें', 'मूल्यांकन सुरू करा')}
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </Section>

        <dl className="dashboard-summary">
          <div>
            <dt>{t('Active profile', 'सक्रिय प्रोफ़ाइल', 'सक्रिय प्रोफाइल')}</dt>
            <dd>
              <strong>{userName}</strong>
            </dd>
          </div>
          <div>
            <dt>{t('Last assessment', 'पिछला मूल्यांकन', 'मागील मूल्यांकन')}</dt>
            <dd>{lastDate ?? t('No assessments yet', 'अभी कोई मूल्यांकन नहीं', 'अद्याप मूल्यांकन नाही')}</dd>
            {lastUrgency && (
              <dd>
                <Badge urgency={lastUrgency}>
                  {lastUrgency === 'High'
                    ? t('High', 'उच्च', 'उच्च')
                    : lastUrgency === 'Medium'
                    ? t('Medium', 'मध्यम', 'मध्यम')
                    : t('Low', 'कम', 'कमी')}
                </Badge>{' '}
                · {lastScore}
              </dd>
            )}
          </div>
          <div>
            <dt>{t('Assessments loaded', 'लोड किए गए मूल्यांकन', 'लोड केलेली मूल्यांकने')}</dt>
            <dd className="metric-value">{reports.length}</dd>
          </div>
        </dl>

        <div className="dashboard-main">
          <Section title={t('Urgency over time', 'समय के साथ तात्कालिकता', 'कालानुसार तातडी')}>
            <div className="row between">
              <p className="muted">
                {t('Last', 'पिछले', 'मागील')} {chartData.length} {t('assessments', 'मूल्यांकन', 'मूल्यांकने')}
              </p>
              <div className="filter-menu">
                <Button
                  variant="secondary"
                  aria-expanded={dropdownOpen}
                  onClick={e => {
                    e.stopPropagation();
                    setDropdownOpen(o => !o);
                  }}
                >
                  {filterLabel[chartFilter]}
                  <ChevronDown aria-hidden="true" />
                </Button>
                {dropdownOpen && (
                  <div className="filter-options">
                    {(['all', 'self', 'family'] as ChartFilter[]).map(opt => (
                      <button
                        key={opt}
                        className="nav-link"
                        aria-pressed={chartFilter === opt}
                        onClick={() => {
                          setChartFilter(opt);
                          setDropdownOpen(false);
                        }}
                      >
                        {filterLabel[opt]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {peakScore > 0 && (
              <p className="muted">
                {t('Highest score', 'सबसे अधिक स्कोर', 'सर्वाधिक स्कोअर')}: {peakScore}
              </p>
            )}
            {mounted && <RiskChart data={chartData} />}
          </Section>

          <Section title={t('Recent reports', 'हालिया रिपोर्ट', 'अलीकडील अहवाल')}>
            {loadingReports ? (
              <div className="stack">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : reports.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-8 h-8 text-teal-700" />}
                title={t('No assessments yet', 'अभी तक कोई मूल्यांकन नहीं', 'अद्याप कोणतेही मूल्यांकन नाही')}
                description={t(
                  'Your saved check-ins, symptom summaries, and urgency estimates will appear here.',
                  'आपकी सहेजी हुई जाँच, लक्षणों के सारांश और तात्कालिकता के अनुमान यहाँ दिखेंगे।',
                  'तुमच्या जतन केलेल्या तपासण्या, लक्षणांचे सारांश आणि तातडीचे अंदाज येथे दिसतील.'
                )}
                action={
                  <Button onClick={startTest}>
                    {t('Start your first assessment', 'पहला मूल्यांकन शुरू करें', 'पहिले मूल्यांकन सुरू करा')}
                  </Button>
                }
              />
            ) : (
              <div>
                {reports.slice(0, 5).map(r => (
                  <Link key={r.id} className="report-link" href={`/dashboard/reports/${r.id}`}>
                    <span>
                      <strong>
                        {new Date(r.createdAt).toLocaleDateString(langKey, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </strong>
                      <span className="report-category">
                        {r.primaryCategory || t('General', 'सामान्य', 'सामान्य')}
                      </span>
                    </span>
                    <span>
                      <Badge urgency={r.urgency}>
                        {r.urgency === 'High'
                          ? t('High', 'उच्च', 'उच्च')
                          : r.urgency === 'Medium'
                          ? t('Medium', 'मध्यम', 'मध्यम')
                          : t('Low', 'कम', 'कमी')}
                      </Badge>
                      <span className="report-category">{r.score} / 100</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <Button variant="secondary" onClick={() => router.push('/dashboard/reports')}>
              {t('All reports', 'सभी रिपोर्ट', 'सर्व अहवाल')}
            </Button>
          </Section>
        </div>
      </div>
    </div>
  );
}
