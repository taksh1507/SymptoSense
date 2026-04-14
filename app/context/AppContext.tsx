'use client';

import React, { createContext, useContext, useState, ReactNode, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { calculateRisk } from '@/lib/ai-engine/scoring/engine';
import type { SurveyResult } from '@/lib/ai-engine/scoring/types';
import type { FinalAssessmentPayload } from '@/components/ai-question-engine/types';

// Dashboard-level screens only (triage flow)
export type TriageScreen =
  | 'dashboard'
  | 'language'
  | 'person'
  | 'questions'
  | 'loading'
  | 'results';

export type Language = 'English' | 'Hindi' | 'Marathi';
export type PersonType = 'self' | 'family';
export type RiskLevel = 'High' | 'Medium' | 'Low';

export interface AppState {
  triageScreen: TriageScreen;
  language: Language | null;
  personType: PersonType | null;
  currentQuestion: number;
  totalQuestions: number;
  selectedAnswers: Record<number, string>;
  riskScore: number;
  riskLevel: RiskLevel;
  narrative?: {
    en: string;
    hi: string;
    mr: string;
  };
}

interface AppContextType extends AppState {
  setTriageScreen: (screen: TriageScreen) => void;
  setLanguage: (lang: Language) => void;
  setPersonType: (type: PersonType) => void;
  setAnswer: (qIndex: number, answer: string) => void;
  goToPrevQuestion: () => void;
  goToNextQuestion: () => void;
  startTest: () => void;
  cancelTest: () => void;
  handleAIComplete: (data: FinalAssessmentPayload) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const isSavingRef = useRef(false);
  const [state, setState] = useState<AppState>({
    triageScreen: 'dashboard',
    language: null,
    personType: null,
    currentQuestion: 0,
    totalQuestions: 8,
    selectedAnswers: {},
    riskScore: 0,
    riskLevel: 'Low',
  });

  const setTriageScreen = (screen: TriageScreen) =>
    setState((s) => ({ ...s, triageScreen: screen }));

  const setLanguage = (lang: Language) =>
    setState((s) => ({ ...s, language: lang }));

  const setPersonType = (type: PersonType) =>
    setState((s) => ({ ...s, personType: type }));

  const setAnswer = (qIndex: number, answer: string) =>
    setState((s) => ({
      ...s,
      selectedAnswers: { ...s.selectedAnswers, [qIndex]: answer },
    }));

  const goToPrevQuestion = () =>
    setState((s) => ({
      ...s,
      currentQuestion: Math.max(0, s.currentQuestion - 1),
    }));

  // Save completed test to database
  const saveTestToDatabase = async (
    answers: Record<number, string>,
    score: number,
    urgency: RiskLevel,
    userId?: string
  ) => {
    try {
      const symptoms = (answers[1] || '').split(',').filter(Boolean);
      const primaryCategory = symptoms[0] || 'general';

      const getRecommendation = (s: number, l: Language | null) => {
        if (s >= 20) {
          if (l === 'Hindi') return 'तुरंत चिकित्सा सहायता लें।';
          if (l === 'Marathi') return 'ताबडतोब वैद्यकीय मदत घ्या.';
          return 'Seek emergency care immediately.';
        }
        if (s >= 10) {
          if (l === 'Hindi') return '24 घंटे के भीतर अपने डॉक्टर से सलाह लें।';
          if (l === 'Marathi') return '२४ तासांच्या आत डॉक्टरांचा सल्ला घ्या.';
          return 'Consult your doctor within 24 hours.';
        }
        if (l === 'Hindi') return 'घर पर लक्षणों की निगरानी करें।';
        if (l === 'Marathi') return 'घरीच लक्षणांचे निरीक्षण करा.';
        return 'Monitor symptoms at home. See a doctor if they worsen.';
      };

      // Format answers as array for storage
      const answersArray = Object.entries(answers).map(([qId, answer]) => ({
        questionId: `q${qId}`,
        answer,
        timestamp: Date.now(),
      }));

      const payload = {
        userId: userId || null,
        personName: 'Myself',
        isSelf: true,
        language: state.language === 'Hindi' ? 'hi' : state.language === 'Marathi' ? 'mr' : 'en',
        answers: answersArray,
        result: {
          score,
          urgency,
          factors: symptoms.map((s) => ({ id: s, label: s, score: 0, isRedFlag: false, category: 'general' })),
          primaryCategory,
          recommendation: getRecommendation(score, state.language),
          hasRedFlag: score >= 20,
          symptomCount: symptoms.length,
          highestSeverity: urgency,
        },
      };

      // Create session first, then complete it
      const createRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: payload.userId, personName: payload.personName, isSelf: true, language: 'en' }),
      });
      const { sessionId } = await createRes.json();

      // Complete the session with answers and result
      await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, answers: payload.answers, result: payload.result }),
      });
    } catch (err) {
      console.error('Failed to save test to database:', err);
    }
  };

  const goToNextQuestion = () => {
    // Legacy function kept for compatibility — AI engine handles the flow now
    setState((s) => {
      const next = s.currentQuestion + 1;
      if (next >= s.totalQuestions) {
        return { ...s, triageScreen: 'results' };
      }
      return { ...s, currentQuestion: next };
    });
  };

  // Called when AIQuestionEngine completes
  const handleAIComplete = (data: FinalAssessmentPayload) => {
    const primarySymptom = data.symptoms?.[0] || data.customSymptom || 'general';
    const additionalSymptom = Object.values(data.aiAnswers || {})[0] || 'none';

    const input: SurveyResult = {
      symptom: primarySymptom,
      severity: data.severity || 'mild',
      duration: data.duration || '< 1 day',
      additional: additionalSymptom,
      history: data.medications?.filter(m => m !== 'none')[0] || 'none',
    };

    const result = calculateRisk(input);

    setState((s) => ({
      ...s,
      triageScreen: 'loading',
      riskScore: result.score,
      riskLevel: result.urgency as RiskLevel,
      narrative: result.narrative
        ? { en: result.narrative.en, hi: result.narrative.hi, mr: result.narrative.hi }
        : undefined,
    }));

    setTimeout(() => {
      setState((s) => {
        if (s.triageScreen === 'loading') {
          if (!isSavingRef.current) {
            isSavingRef.current = true;
            const userId = (session?.user as any)?.id;
            const answersRecord: Record<number, string> = {
              0: data.age || 'adult',
              1: data.symptoms?.join(',') || primarySymptom,
              2: data.severity,
              3: data.duration,
              4: additionalSymptom,
            };
            saveTestToDatabase(answersRecord, s.riskScore, s.riskLevel, userId)
              .finally(() => { isSavingRef.current = false; });
          }
          return { ...s, triageScreen: 'results' };
        }
        return s;
      });
    }, 2500);
  };

  const startTest = () =>
    setState((s) => ({ ...s, triageScreen: 'language' }));

  const cancelTest = () =>
    setState((s) => ({
      ...s,
      triageScreen: 'dashboard',
      currentQuestion: 0,
      selectedAnswers: {},
      personType: null,
    }));

  return (
    <AppContext.Provider
      value={{
        ...state,
        setTriageScreen,
        setLanguage,
        setPersonType,
        setAnswer,
        goToPrevQuestion,
        goToNextQuestion,
        startTest,
        cancelTest,
        handleAIComplete,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
