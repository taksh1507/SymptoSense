'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

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

export interface Report {
  date: string;
  riskLevel: RiskLevel;
  score: number;
  symptoms: string[];
}

export interface AppState {
  isLoggedIn: boolean;
  triageScreen: TriageScreen;
  language: Language | null;
  personType: PersonType | null;
  currentQuestion: number;
  totalQuestions: number;
  selectedAnswers: Record<number, string>;
  mockReports: Report[];
  riskScore: number;
  riskLevel: RiskLevel;
}

interface AppContextType extends AppState {
  setTriageScreen: (screen: TriageScreen) => void;
  setLanguage: (lang: Language) => void;
  setPersonType: (type: PersonType) => void;
  setAnswer: (qIndex: number, answer: string) => void;
  goToPrevQuestion: () => void;
  goToNextQuestion: () => void;
  login: () => void;
  logout: () => void;
  startTest: () => void;
  cancelTest: () => void;
}

const mockReports: Report[] = [
  { date: '2026-04-14', riskLevel: 'High',   score: 22, symptoms: ['fever', 'chest pain'] },
  { date: '2026-04-10', riskLevel: 'Medium', score: 14, symptoms: ['headache'] },
  { date: '2026-03-29', riskLevel: 'Low',    score: 5,  symptoms: ['cough'] },
];

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    isLoggedIn: false,
    triageScreen: 'dashboard',
    language: null,
    personType: null,
    currentQuestion: 0,
    totalQuestions: 8,
    selectedAnswers: {},
    mockReports,
    riskScore: 22,
    riskLevel: 'High',
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

  const goToNextQuestion = () => {
    setState((s) => {
      const next = s.currentQuestion + 1;
      if (next >= s.totalQuestions) {
        // ── CALCULATE RISK SCORE ──
        let score = 0;
        const ans = s.selectedAnswers;

        // Q1: Age Group
        if (ans[0] === 'elderly') score += 2;

        // Q2: Symptoms (Base weights)
        const symptoms = ans[1] ? ans[1].split(',') : [];
        symptoms.forEach(sym => {
          if (sym === 'fever') score += 2;
          if (sym === 'chest_pain') score += 5;
          if (sym === 'breathing') score += 4;
          if (sym === 'headache') score += 1;
          if (sym === 'cough') score += 2;
          if (sym === 'fatigue') score += 1;
        });

        // Q3: Severity (Multiplier)
        const sevMult = ans[2] === 'severe' ? 3 : ans[2] === 'moderate' ? 2 : 1;
        score = score * sevMult;

        // Q4: Duration
        if (ans[3] === 'days') score += 2;
        if (ans[3] === 'long') score += 4;

        // Q5: Progression
        if (ans[4] === 'worse') score += 2;

        // Q6: Critical Check
        if (ans[5] === 'chest_pain' || ans[5] === 'breathing') score += 5;

        // Q7: History
        const history = ans[6] ? ans[6].split(',') : [];
        if (history.includes('diabetes') || history.includes('heart')) score += 2;

        // Q8: Impact
        if (ans[7] === 'unable') score += 3;
        if (ans[7] === 'slight') score += 1;

        // Cap score at 30
        const finalScore = Math.min(30, score);
        const finalLevel = finalScore >= 20 ? 'High' : finalScore >= 10 ? 'Medium' : 'Low';

        return {
          ...s,
          triageScreen: 'loading',
          riskScore: finalScore,
          riskLevel: finalLevel
        };
      }
      return { ...s, currentQuestion: next };
    });

    setTimeout(() => {
      setState((s) => {
        if (s.triageScreen === 'loading') {
          const newReport: Report = {
            date: new Date().toISOString().split('T')[0],
            riskLevel: s.riskLevel,
            score: s.riskScore,
            symptoms: (s.selectedAnswers[1] || '').split(',')
          };
          return {
            ...s,
            triageScreen: 'results',
            mockReports: [newReport, ...s.mockReports]
          };
        }
        return s;
      });
    }, 2500);
  };

  const login = () =>
    setState((s) => ({ ...s, isLoggedIn: true, triageScreen: 'dashboard' }));

  const logout = () =>
    setState((s) => ({
      ...s,
      isLoggedIn: false,
      triageScreen: 'dashboard',
      language: null,
      personType: null,
      currentQuestion: 0,
      selectedAnswers: {},
    }));

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
        login,
        logout,
        startTest,
        cancelTest,
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
