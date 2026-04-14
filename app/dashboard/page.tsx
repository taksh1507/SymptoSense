'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useApp } from '../context/AppContext';
import AppShell from '../components/AppShell';
import Dashboard from '../components/Dashboard';
import LanguageModal from '../components/LanguageModal';
import PersonModal from '../components/PersonModal';
import LoadingScreen from '../components/LoadingScreen';
import ResultsPage from '../components/ResultsPage';
import { AIQuestionEngine } from '@/components/ai-question-engine/AIQuestionEngine';

export default function DashboardRoute() {
  const { data: session, status } = useSession();
  const { triageScreen, language, handleAIComplete, setTriageScreen } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') return null;
  if (!session) return null;

  const aiLang = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';

  return (
    <AppShell>
      {(triageScreen === 'dashboard' || triageScreen === 'language' || triageScreen === 'person') && (
        <>
          <Dashboard />
          {triageScreen === 'language' && <LanguageModal />}
          {triageScreen === 'person'   && <PersonModal />}
        </>
      )}
      {triageScreen === 'questions' && (
        <div style={{ padding: '28px 32px', minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
          <AIQuestionEngine
            defaultLanguage={aiLang}
            onComplete={handleAIComplete}
            onCancel={() => setTriageScreen('dashboard')}
          />
        </div>
      )}
      {triageScreen === 'loading'   && <LoadingScreen />}
      {triageScreen === 'results'   && <ResultsPage />}
    </AppShell>
  );
}
