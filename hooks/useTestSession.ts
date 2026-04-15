"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Answer, ScoreResult } from "@/lib/scoring";

export interface PastSession {
  sessionId: string;
  personName: string;
  isSelf: boolean;
  date: string;
  score: number;
  urgency: "Low" | "Medium" | "High";
  primarySymptom: string;
}

interface TestSessionState {
  // User / Session identity
  userId: string | null;
  sessionId: string | null;
  language: "en" | "hi" | "mr";
  personName: string;
  isSelf: boolean;

  // Question flow
  currentQuestionId: string;
  answers: Answer[];
  visitedQuestionIds: string[];
  isComplete: boolean;

  // Results
  scoreResult: ScoreResult | null;

  // History
  pastSessions: PastSession[];

  // UI state
  showAuthGate: boolean;
  showLanguageModal: boolean;
  showPersonModal: boolean;
  isLoadingResults: boolean;

  // Actions
  setLanguage: (lang: "en" | "hi" | "mr") => void;
  setPersonName: (name: string) => void;
  setIsSelf: (isSelf: boolean) => void;
  setSessionId: (id: string) => void;
  setUserId: (id: string | null) => void;

  setCurrentQuestion: (id: string) => void;
  addAnswer: (answer: Answer) => void;
  removeLastAnswer: () => void;
  resetFlow: () => void;

  setScoreResult: (result: ScoreResult) => void;
  setIsComplete: (v: boolean) => void;
  setIsLoadingResults: (v: boolean) => void;

  setShowAuthGate: (v: boolean) => void;
  setShowLanguageModal: (v: boolean) => void;
  setShowPersonModal: (v: boolean) => void;

  addPastSession: (session: PastSession) => void;
  clearHistory: () => void;
}

export const useTestSession = create<TestSessionState>()(
  persist(
    (set, get) => ({
      // Identity
      userId: null,
      sessionId: null,
      language: "en",
      personName: "Myself",
      isSelf: true,

      // Flow
      currentQuestionId: "q_start",
      answers: [],
      visitedQuestionIds: [],
      isComplete: false,

      // Results
      scoreResult: null,

      // History
      pastSessions: [],

      // UI
      showAuthGate: false,
      showLanguageModal: false,
      showPersonModal: false,
      isLoadingResults: false,

      // ── Actions ──────────────────────────────────────────
      setLanguage: (lang) => set({ language: lang }),
      setPersonName: (name) => set({ personName: name }),
      setIsSelf: (isSelf) => set({ isSelf }),
      setSessionId: (id) => set({ sessionId: id }),
      setUserId: (id) => set({ userId: id }),

      setCurrentQuestion: (id) =>
        set((s) => ({
          currentQuestionId: id,
          visitedQuestionIds: [...s.visitedQuestionIds, id],
        })),

      addAnswer: (answer) =>
        set((s) => {
          // Replace existing answer for same question
          const filtered = s.answers.filter((a) => a.questionId !== answer.questionId);
          return { answers: [...filtered, answer] };
        }),

      removeLastAnswer: () =>
        set((s) => {
          const visited = [...s.visitedQuestionIds];
          visited.pop();
          const prevId = visited[visited.length - 1] ?? "q_start";
          return {
            answers: s.answers.slice(0, -1),
            visitedQuestionIds: visited,
            currentQuestionId: prevId,
          };
        }),

      resetFlow: () =>
        set({
          sessionId: null,
          currentQuestionId: "q_start",
          answers: [],
          visitedQuestionIds: ["q_start"],
          isComplete: false,
          scoreResult: null,
          isLoadingResults: false,
        }),

      setScoreResult: (result) => set({ scoreResult: result }),
      setIsComplete: (v) => set({ isComplete: v }),
      setIsLoadingResults: (v) => set({ isLoadingResults: v }),

      setShowAuthGate: (v) => set({ showAuthGate: v }),
      setShowLanguageModal: (v) => set({ showLanguageModal: v }),
      setShowPersonModal: (v) => set({ showPersonModal: v }),

      addPastSession: (session) =>
        set((s) => ({
          pastSessions: [session, ...s.pastSessions].slice(0, 20),
        })),

      clearHistory: () => set({ pastSessions: [] }),
    }),
    {
      name: "symptosense-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        language: state.language,
        userId: state.userId,
        pastSessions: state.pastSessions,
      }),
    }
  )
);
