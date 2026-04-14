'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';
import AppShell from '../components/AppShell';
import Dashboard from '../components/Dashboard';
import LanguageModal from '../components/LanguageModal';
import PersonModal from '../components/PersonModal';
import QuestionPanel from '../components/QuestionPanel';
import LoadingScreen from '../components/LoadingScreen';
import ResultsPage from '../components/ResultsPage';

export default function DashboardRoute() {
  const { isLoggedIn, triageScreen } = useApp();
  const router = useRouter();

  // Auth guard — redirect to /login if not authenticated
  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) return null;

  return (
    <AppShell>
      {(triageScreen === 'dashboard' || triageScreen === 'language' || triageScreen === 'person') && (
        <>
          <Dashboard />
          {triageScreen === 'language' && <LanguageModal />}
          {triageScreen === 'person'   && <PersonModal />}
        </>
      )}
      {triageScreen === 'questions' && <QuestionPanel />}
      {triageScreen === 'loading'   && <LoadingScreen />}
      {triageScreen === 'results'   && <ResultsPage />}
    </AppShell>
  );
}
