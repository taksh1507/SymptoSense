'use client';

import React, { createContext, useContext, useState, ReactNode, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useTestSession } from '@/hooks/useTestSession';
import { calculateRisk } from '@/lib/ai-engine/scoring/engine';
import type { SurveyResult } from '@/lib/ai-engine/scoring/types';
import type { FinalAssessmentPayload } from '@/components/ai-question-engine/types';
import { mapAnswersToMLFeatures } from '@/lib/ml/featureMapper';
import type { ScoreResult, Urgency } from '@/lib/ai-engine/scoring/types';

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
export type Relation = 'Parent' | 'Child' | 'Spouse' | 'Sibling' | 'Friend' | 'Other';
export type Gender = 'Male' | 'Female' | 'Other' | 'Prefer not to say';

export interface AppState {
  triageScreen: TriageScreen;
  language: Language | null;
  personType: PersonType | null;
  patientName: string;
  relation: Relation | null;
  gender: Gender | null;
  currentQuestion: number;
  totalQuestions: number;
  selectedAnswers: Record<number, string>;
  riskScore: number;
  riskLevel: RiskLevel;
  // Raw assessment inputs — used for dynamic reasoning on results page
  assessmentPayload: {
    primarySymptom: string;
    severity: string;
    duration: string;
    additionalSymptoms: string[];
    medicalHistory: string[];
  } | null;
  narrative?: {
    en: string;
    hi: string;
    mr: string;
  };
  mlScore: number;
  mlLevel: string;
  mlExplanation: string;
  riskReasoning: string;
  riskFactors: string[];        // Groq-generated bullet factors for "Why this risk?"
  recommendationSteps: string[]; // Groq-generated steps for "What you should do"
  primaryAction: string;        // Groq-generated primary action line
  keyInsights: string[];
}

interface AppContextType extends AppState {
  setTriageScreen: (screen: TriageScreen) => void;
  setLanguage: (lang: Language) => void;
  setPersonType: (type: PersonType) => void;
  setPatientInfo: (name: string, relation: Relation | null, gender: Gender | null) => void;
  setAnswer: (qIndex: number, answer: string) => void;
  goToPrevQuestion: () => void;
  goToNextQuestion: () => void;
  startTest: () => void;
  cancelTest: () => void;
  handleAIComplete: (data: FinalAssessmentPayload) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const RISK_ENCODING = { "Low": 0, "Medium": 1, "High": 2 } as const;

export function AppProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const isSavingRef = useRef(false);
  const [state, setState] = useState<AppState>({
    triageScreen: 'dashboard',
    language: null,
    personType: 'self',
    patientName: '',
    relation: null,
    gender: null,
    currentQuestion: 0,
    totalQuestions: 8,
    selectedAnswers: {},
    riskScore: 0,
    riskLevel: 'Low',
    assessmentPayload: null,
    mlScore: 0,
    mlLevel: 'High',
    mlExplanation: '',
    riskReasoning: '',
    riskFactors: [],
    recommendationSteps: [],
    primaryAction: '',
    keyInsights: [],
  });

  const setTriageScreen = (screen: TriageScreen) =>
    setState((s) => ({ ...s, triageScreen: screen }));

  const setLanguage = (lang: Language) =>
    setState((s) => ({ ...s, language: lang }));

  const setPersonType = (type: PersonType) =>
    setState((s) => ({ ...s, personType: type }));

  const setPatientInfo = (name: string, relation: Relation | null, gender: Gender | null) =>
    setState((s) => ({ ...s, patientName: name, relation, gender }));

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
    userId?: string,
    confidence?: {
      score: number; level: string; explanation: string;
      riskReason: string; riskSummary?: string; riskFactors?: string[];
      primaryAction?: string; recommendationSteps?: string[]; insights: string[];
    }
  ) => {
    try {
      const symptoms = (answers[1] || "").split(",").filter(Boolean);
      const primaryCategory = symptoms[0] || "general";

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
        personName: state.patientName || 'Myself',
        isSelf: state.personType !== 'family',
        relation: state.relation ?? null,
        gender: state.gender ?? null,
        language: state.language === 'Hindi' ? 'hi' : state.language === 'Marathi' ? 'mr' : 'en',
        answers: answersArray,
        result: {
          score,
          urgency,
          factors: symptoms.map((s) => ({ id: s, label: s, score: 0, isRedFlag: false, category: 'general' })),
          primaryCategory,
          recommendation: getRecommendation(score, state.language),
          confidenceScore: confidence?.score !== undefined ? confidence.score / 100 : undefined,
          confidenceLevel: confidence?.level,
          confidenceExplanation: confidence?.explanation,
          riskReasoning: confidence?.riskReason,
          riskSummary: confidence?.riskSummary,
          riskFactors: confidence?.riskFactors,
          primaryAction: confidence?.primaryAction,
          recommendationSteps: confidence?.recommendationSteps,
          keyInsights: confidence?.insights,
          hasRedFlag: score >= 20,
          symptomCount: symptoms.length,
          highestSeverity: urgency,
        },
      };

      // Create session first, then complete it
      const createRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: payload.userId,
          personName: payload.personName,
          isSelf: payload.isSelf,
          relation: payload.relation,
          gender: payload.gender,
          language: payload.language,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        console.error('[saveTest] Session create failed:', createRes.status, err);
        return;
      }

      const createData = await createRes.json();
      const sessionId = createData.sessionId;
      if (!sessionId) {
        console.error('[saveTest] No sessionId returned from POST /api/sessions');
        return;
      }

      // Complete the session with answers and result
      const patchRes = await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, answers: payload.answers, result: payload.result }),
      });

      if (!patchRes.ok) {
        const err = await patchRes.text();
        console.error('[saveTest] Session complete failed:', patchRes.status, err);
      } else {
        console.log('[saveTest] Session saved successfully:', sessionId);
      }
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
    const additionalSymptoms = [
      ...(data.symptoms?.slice(1) || []),
      ...(data.customSymptom && !data.symptoms?.includes(data.customSymptom) ? [data.customSymptom] : []),
      ...Object.values(data.aiAnswers || {}).filter(v => v && v !== 'none'),
    ];
    const medicalHistory = data.medications?.filter(m => m !== 'none') || [];
    const additionalSymptom = additionalSymptoms[0] || 'none';

    const input: SurveyResult = {
      symptom: primarySymptom,
      severity: data.severity || 'mild',
      duration: data.duration || '< 1 day',
      additional: additionalSymptom,
      history: medicalHistory[0] || 'none',
    };

    const result = calculateRisk(input);

    // Finalize confidence with score context
    const getFinalConfidence = async () => {
      try {
        const features = {
          ...mapAnswersToMLFeatures(data),
          rule_score: result.score,
          risk_level: RISK_ENCODING[result.urgency as keyof typeof RISK_ENCODING] || 0
        };

        // Hard 6-second timeout — the route.ts already has 5 s, this is a safety net
        const mlController = new AbortController();
        const mlTimeoutId = setTimeout(() => mlController.abort(), 6000);
        let res: Response;
        try {
          res = await fetch('/api/ml/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(features),
            signal: mlController.signal,
          });
        } finally {
          clearTimeout(mlTimeoutId);
        }
        const mlResult = await res.json();

        // Fetch dynamic reasoning from Groq — pass real symptom context
        let reasonData: any = {};
        try {
          const reasonRes = await fetch('/api/explanation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              features: {
                ...features,
                confidence_score: Math.round(mlResult.confidence * 100)
              },
              // Real clinical context for specific one-liners
              clinicalContext: {
                primarySymptom,
                severity: data.severity,
                duration: data.duration,
                additionalSymptoms: additionalSymptoms.slice(0, 3),
                medicalHistory,
                riskLevel: result.urgency,
                riskScore: result.score,
              },
              language: state.language
            }),
          });
          reasonData = await reasonRes.json();
        } catch (e) {
          console.error("Reasoning Error:", e);
          // Fallback: use local deterministic engine so output is still dynamic
          const { generateRiskExplanation, generateRecommendations } = await import('@/lib/report/reasoningEngine');
          const localInput = {
            primarySymptom,
            severity: data.severity || 'mild',
            duration: data.duration || '< 1 day',
            additionalSymptoms,
            medicalHistory,
            riskLevel: result.urgency as 'High' | 'Medium' | 'Low',
            riskScore: result.score,
          };
          const localReasoning = generateRiskExplanation(localInput);
          const localRecs = generateRecommendations(localInput);
          reasonData = {
            confidenceReasoning: mlResult.confidence > 0.8
              ? "Consistent inputs with clear symptom pattern."
              : "Some input inconsistency; interpret with caution.",
            riskReasoning: `${result.urgency} risk based on ${primarySymptom.replace(/_/g, ' ')} with ${data.severity} severity.`,
            riskSummary: localReasoning.summary,
            riskFactors: localReasoning.factors,
            primaryAction: localRecs.primaryAction,
            recommendationSteps: localRecs.steps,
            keyInsights: [
              `${primarySymptom.replace(/_/g, ' ')} identified as primary concern`,
              `${data.severity} severity with ${data.duration} duration`,
              medicalHistory.length > 0 ? `Medical history: ${medicalHistory[0].replace(/_/g, ' ')}` : 'No significant medical history reported',
            ],
          };
        }

        setState(s => ({
          ...s,
          mlScore: Math.round(mlResult.confidence * 100),
          mlLevel: mlResult.confidenceLevel,
          mlExplanation: reasonData.confidenceReasoning || "",
          riskReasoning: reasonData.riskReasoning || "",
          riskFactors: reasonData.riskFactors || [],
          recommendationSteps: reasonData.recommendationSteps || [],
          primaryAction: reasonData.primaryAction || "",
          keyInsights: reasonData.keyInsights || []
        }));
        return {
          score: mlResult.confidence,
          level: mlResult.confidenceLevel,
          explanation: reasonData.confidenceReasoning,
          riskReason: reasonData.riskReasoning,
          riskSummary: reasonData.riskSummary,
          riskFactors: reasonData.riskFactors,
          primaryAction: reasonData.primaryAction,
          recommendationSteps: reasonData.recommendationSteps,
          insights: reasonData.keyInsights
        };
      } catch (e) {
        console.error("Final ML Error:", e);
        // Return a local fallback so the loading screen always proceeds
        return {
          score: 0.7,
          level: "Medium",
          explanation: "Confidence estimated from symptom pattern.",
          riskReason: `${result.urgency} risk based on ${primarySymptom.replace(/_/g, ' ')}.`,
          riskSummary: undefined,
          riskFactors: [],
          primaryAction: undefined,
          recommendationSteps: [],
          insights: []
        };
      }
    };

    setState((s) => ({
      ...s,
      triageScreen: 'loading',
      riskScore: result.score,
      riskLevel: result.urgency as RiskLevel,
      assessmentPayload: {
        primarySymptom,
        severity: data.severity || 'mild',
        duration: data.duration || '< 1 day',
        additionalSymptoms,
        medicalHistory,
      },
      narrative: result.narrative
        ? { en: result.narrative.en, hi: result.narrative.hi, mr: result.narrative.mr ?? result.narrative.en }
        : undefined,
    }));

    getFinalConfidence().then((ml) => {
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

              const finalResult: ScoreResult = {
                score: result.score,
                urgency: result.urgency as Urgency,
                factors: data.symptoms?.map(s => ({ id: s, label: s, score: 0, isRedFlag: false, category: 'general' })) || [],
                recommendation: result.recommendation.en,
                primaryCategory: primarySymptom,
                hasRedFlag: result.isRedFlag,
                symptomCount: data.symptoms?.length || 0,
                highestSeverity: result.urgency,
                confidenceScore: ml?.score,
                confidenceLevel: ml?.level,
                confidenceExplanation: ml?.explanation,
                riskReasoning: ml?.riskReason,
                riskSummary: ml?.riskSummary,
                riskFactors: ml?.riskFactors,
                primaryAction: ml?.primaryAction,
                recommendationSteps: ml?.recommendationSteps,
                keyInsights: ml?.insights,
                narrative: result.narrative ? {
                  en: result.narrative.en,
                  hi: result.narrative.hi,
                  mr: result.narrative.hi ?? result.narrative.en
                } : undefined
              };

              // Sync with useTestSession store for Results page
              useTestSession.getState().setScoreResult(finalResult);

              saveTestToDatabase(
                answersRecord,
                finalResult.score,
                finalResult.urgency as RiskLevel,
                userId,
                ml ? {
                  score: Math.round(ml.score * 100),
                  level: ml.level,
                  explanation: ml.explanation,
                  riskReason: ml.riskReason,
                  riskSummary: ml.riskSummary,
                  riskFactors: ml.riskFactors,
                  primaryAction: ml.primaryAction,
                  recommendationSteps: ml.recommendationSteps,
                  insights: ml.insights
                } : undefined
              )
                .finally(() => { isSavingRef.current = false; });
            }
            return { ...s, triageScreen: 'results' };
          }
          return s;
        });
      }, 2500);
    });
  };

  const startTest = () =>
    setState((s) => ({ ...s, triageScreen: 'language', personType: 'self', patientName: '', relation: null, gender: null }));

  const cancelTest = () =>
    setState((s) => ({
      ...s,
      triageScreen: 'dashboard',
      currentQuestion: 0,
      selectedAnswers: {},
      personType: 'self',
      patientName: '',
      relation: null,
      gender: null,
      assessmentPayload: null,
    }));

  return (
    <AppContext.Provider
      value={{
        ...state,
        setTriageScreen,
        setLanguage,
        setPersonType,
        setPatientInfo,
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
