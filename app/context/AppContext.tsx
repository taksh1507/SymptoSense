'use client';
import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import type { FinalAssessmentPayload } from '@/components/ai-question-engine/types';
import type { ScoreResult } from '@/lib/ai-engine/scoring/types';
import { evaluateAssessment, assessmentContext } from '@/lib/assessment/evaluate';
import type { DiseasePrediction } from '@/lib/ml/disease';

export type TriageScreen = 'dashboard' | 'language' | 'person' | 'questions' | 'loading' | 'results';
export type Language = 'English' | 'Hindi' | 'Marathi';
export type PersonType = 'self' | 'family';
export type RiskLevel = 'High' | 'Medium' | 'Low';
export type Relation = 'Parent' | 'Child' | 'Spouse' | 'Sibling' | 'Friend' | 'Other';
export type Gender = 'Male' | 'Female' | 'Other' | 'Prefer not to say';
export interface AppState {
  triageScreen: TriageScreen; language: Language | null; personType: PersonType | null;
  patientName: string; relation: Relation | null; gender: Gender | null;
  currentQuestion: number; totalQuestions: number; selectedAnswers: Record<number, string>;
  riskScore: number; riskLevel: RiskLevel;
  assessmentPayload: { primarySymptom: string; severity: string; duration: string; additionalSymptoms: string[]; medicalHistory: string[] } | null;
  narrative?: { en: string; hi: string; mr: string };
  diseasePrediction: DiseasePrediction | null; diseaseStatus: 'idle' | 'loading' | 'ready' | 'unavailable'; diseaseError: string;
  mlScore: number; mlLevel: string; mlExplanation: string; riskReasoning: string;
  riskFactors: string[]; recommendationSteps: string[]; primaryAction: string; keyInsights: string[];
  saveStatus: 'idle' | 'saving' | 'saved' | 'failed'; saveError: string; sessionId: string | null;
}
interface AppContextType extends AppState {
  setTriageScreen: (screen: TriageScreen) => void; setLanguage: (lang: Language) => void;
  setPersonType: (type: PersonType) => void;
  setPatientInfo: (name: string, relation: Relation | null, gender: Gender | null) => void;
  setAnswer: (qIndex: number, answer: string) => void; goToPrevQuestion: () => void; goToNextQuestion: () => void;
  startTest: () => void; cancelTest: () => void; handleAIComplete: (data: FinalAssessmentPayload) => void; retrySave: () => void;
}
const AppContext = createContext<AppContextType | null>(null);
const emptyResults = {
  riskScore: 0, riskLevel: 'Low' as RiskLevel, assessmentPayload: null, narrative: undefined,
  diseasePrediction: null, diseaseStatus: 'idle' as AppState['diseaseStatus'], diseaseError: '',
  mlScore: 0, mlLevel: 'unavailable', mlExplanation: '', riskReasoning: '', riskFactors: [] as string[],
  recommendationSteps: [] as string[], primaryAction: '', keyInsights: [] as string[],
  saveStatus: 'idle' as AppState['saveStatus'], saveError: '', sessionId: null,
};
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    triageScreen: 'dashboard', language: null, personType: 'self', patientName: '', relation: null, gender: null,
    currentQuestion: 0, totalQuestions: 11, selectedAnswers: {}, ...emptyResults,
  });
  const generation = useRef(0);
  const diseaseController = useRef<AbortController | null>(null);
  const controller = useRef<AbortController | null>(null);
  const pending = useRef<{ data: FinalAssessmentPayload; personName: string; isSelf: boolean; relation: Relation | null; gender: Gender | null; id: number; sessionId?: string } | null>(null);
  const saving = useRef<number | null>(null);
  useEffect(() => () => { generation.current++; controller.current?.abort(); diseaseController.current?.abort(); }, []);
  const reset = (screen: TriageScreen) => {
    generation.current++;
    controller.current?.abort(); diseaseController.current?.abort(); pending.current = null;
    setState(s => ({ ...s, ...emptyResults, triageScreen: screen, currentQuestion: 0, selectedAnswers: {}, personType: 'self', patientName: '', relation: null, gender: null }));
  };
  const applyResult = (result: ScoreResult) => {
    setState(s => ({ ...s, riskScore: result.score, riskLevel: result.urgency,
      narrative: result.narrative, mlScore: result.confidenceScore == null ? 0 : Math.round(result.confidenceScore * 100),
      mlLevel: result.confidenceLevel ?? 'unavailable', mlExplanation: result.confidenceExplanation ?? '',
      riskReasoning: result.riskReasoning ?? '', riskFactors: result.riskFactors ?? [],
      recommendationSteps: result.recommendationSteps ?? [], primaryAction: result.primaryAction ?? '', keyInsights: result.keyInsights ?? [],
    }));
  };
  const persist = async () => {
    const request = pending.current;
    if (!request || saving.current === request.id || request.id !== generation.current) return;
    saving.current = request.id;
    const activeController = new AbortController(); controller.current = activeController;
    const timeout = setTimeout(() => activeController.abort(), 30000);
    setState(s => ({ ...s, saveStatus: 'saving', saveError: '' }));
    try {
      if (!request.sessionId) {
        const created = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personName: request.personName, isSelf: request.isSelf, relation: request.relation, gender: request.gender, language: request.data.language }), signal: activeController.signal });
        if (!created.ok) throw new Error('Could not create the assessment record.');
        const body = await created.json();
        if (typeof body.sessionId !== 'string') throw new Error('Invalid assessment response.');
        request.sessionId = body.sessionId;
      }
      const res = await fetch('/api/sessions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: request.sessionId, assessment: request.data }), signal: activeController.signal });
      if (!res.ok) throw new Error('Could not save the assessment. Please retry.');
      const body = await res.json();
      if (request.id !== generation.current) return;
      applyResult(body.result);
      setState(s => ({ ...s, saveStatus: 'saved', saveError: '', sessionId: request.sessionId ?? null }));
      // Reasoning is optional; the rule result and saved record are already available.
      void fetch('/api/explanation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: request.sessionId }), signal: AbortSignal.timeout(8000) })
        .then(r => r.ok ? r.json() : null).then(prose => { if (prose && request.id === generation.current) setState(s => ({ ...s, riskReasoning: prose.riskReasoning ?? s.riskReasoning, riskFactors: prose.riskFactors ?? s.riskFactors })); }).catch(() => {});
    } catch (error) {
      if (request.id === generation.current) setState(s => ({ ...s, saveStatus: 'failed', saveError: error instanceof Error ? error.message : 'Could not save the assessment.' }));
    } finally { clearTimeout(timeout); if (saving.current === request.id) saving.current = null; }
  };
  const runDisease = async (data: FinalAssessmentPayload, id: number) => {
    diseaseController.current?.abort();
    const active = new AbortController(); diseaseController.current = active;
    const timer = setTimeout(() => active.abort(), 35000);
    setState(s => ({ ...s, diseaseStatus: 'loading', diseaseError: '' }));
    try {
      const context = assessmentContext(data);
      const raw = [...data.symptoms, ...(data.customSymptom ? [data.customSymptom] : []), ...context.adaptive];
      let extracted: string[] = [];
      // Extraction failure leaves the completed questionnaire as the source of symptoms.
      try {
        const response = await fetch('/api/ml/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: raw.join(', ').replace(/_/g, ' '), language: data.language }), signal: active.signal });
        if (response.ok) { const body = await response.json(); if (Array.isArray(body.symptoms)) extracted = body.symptoms; }
      } catch { /* Continue the existing question flow. */ }
      if (id !== generation.current) return;
      const prepared = { ...data, symptoms: [...new Set([...data.symptoms, ...extracted])] };
      const ruleResult = evaluateAssessment(prepared);
      if (pending.current?.id === id) pending.current.data = prepared;
      applyResult(ruleResult);
      setState(s => ({ ...s, assessmentPayload: assessmentContext(prepared) }));
      void persist();
      const symptoms = [...new Set([...context.selected, ...context.adaptive, ...extracted])].filter(s => s.length <= 100).slice(0, 132);
      const response = await fetch('/api/ml/disease', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Assessment-Language': data.language }, body: JSON.stringify({ symptoms, age_group: data.age, severity: data.severity, duration: data.duration }), signal: active.signal });
      const prediction = await response.json();
      if (!response.ok) throw new Error(response.status === 422 ? 'No supported dataset symptoms were found. Continue with the questionnaire triage and consult a doctor.' : 'Disease model unavailable. The rule triage result remains available.');
      if (id !== generation.current) return;
      setState(s => ({ ...s, diseasePrediction: prediction as DiseasePrediction, diseaseStatus: 'ready', diseaseError: '' }));
    } catch (error) {
      if (id === generation.current) setState(s => ({ ...s, diseasePrediction: null, diseaseStatus: 'unavailable', diseaseError: error instanceof Error ? error.message : 'Disease model unavailable.' }));
    } finally { clearTimeout(timer); }
  };
  const handleAIComplete = (data: FinalAssessmentPayload) => {
    controller.current?.abort(); generation.current++;
    const result = evaluateAssessment(data);
    const context = assessmentContext(data);
    pending.current = { data, personName: state.patientName || 'Myself', isSelf: state.personType !== 'family', relation: state.relation, gender: state.gender, id: generation.current };
    setState(s => ({ ...s, ...emptyResults, triageScreen: 'results', language: data.language === 'hi' ? 'Hindi' : data.language === 'mr' ? 'Marathi' : 'English',
      riskScore: result.score, riskLevel: result.urgency, assessmentPayload: context,
      narrative: result.narrative, riskReasoning: result.riskReasoning ?? '', riskFactors: result.riskFactors ?? [],
      primaryAction: result.primaryAction ?? '', recommendationSteps: result.recommendationSteps ?? [],
      mlExplanation: 'Model score pending. This heuristic score is not a probability that the assessment is correct.', saveStatus: 'saving',
    }));
    void runDisease(data, generation.current);
  };
  return <AppContext.Provider value={{ ...state,
    setTriageScreen: screen => screen === 'dashboard' || screen === 'language' ? reset(screen) : setState(s => ({ ...s, triageScreen: screen })),
    setLanguage: language => setState(s => ({ ...s, language })), setPersonType: personType => setState(s => ({ ...s, personType })),
    setPatientInfo: (patientName, relation, gender) => setState(s => ({ ...s, patientName, relation, gender })),
    setAnswer: (index, answer) => setState(s => ({ ...s, selectedAnswers: { ...s.selectedAnswers, [index]: answer } })),
    goToPrevQuestion: () => setState(s => ({ ...s, currentQuestion: Math.max(0, s.currentQuestion - 1) })),
    goToNextQuestion: () => setState(s => ({ ...s, currentQuestion: Math.min(s.totalQuestions - 1, s.currentQuestion + 1) })),
    startTest: () => reset('language'), cancelTest: () => reset('dashboard'), handleAIComplete, retrySave: () => { void persist(); },
  }}>{children}</AppContext.Provider>;
}
export function useApp() { const value = useContext(AppContext); if (!value) throw new Error('useApp must be used within AppProvider'); return value; }
