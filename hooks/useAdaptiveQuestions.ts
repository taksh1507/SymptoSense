"use client";

import { useCallback } from "react";
import { useTestSession } from "./useTestSession";
import { QUESTIONS, getNextQuestionId } from "@/lib/questionTree";
import { isRedFlag } from "@/lib/redFlags";

interface UseAdaptiveQuestionsReturn {
  currentQuestion: typeof QUESTIONS[string] | undefined;
  advance: (selectedOptionIds: string[]) => { nextId: string | null; hasRedFlag: boolean };
  goBack: () => void;
  questionNumber: number;
  totalEstimate: number;
  progressPercent: number;
}

export function useAdaptiveQuestions(): UseAdaptiveQuestionsReturn {
  const {
    currentQuestionId,
    visitedQuestionIds,
    answers,
    setCurrentQuestion,
    addAnswer,
    removeLastAnswer,
    setIsComplete,
  } = useTestSession();

  const currentQuestion = QUESTIONS[currentQuestionId];
  const questionNumber = visitedQuestionIds.length;
  const totalEstimate = 10;
  const progressPercent = Math.min(100, Math.round((questionNumber / totalEstimate) * 100));

  const advance = useCallback(
    (selectedOptionIds: string[]): { nextId: string | null; hasRedFlag: boolean } => {
      if (!currentQuestion) return { nextId: null, hasRedFlag: false };

      // Save answer
      addAnswer({
        questionId: currentQuestion.id,
        answer: selectedOptionIds,
        timestamp: Date.now(),
      });

      // Check red flags
      const hasRF = selectedOptionIds.some((id) => {
        const opt = currentQuestion.options?.find((o) => o.id === id);
        return opt?.redFlag || isRedFlag(id);
      });

      // Get next
      const nextId = getNextQuestionId(currentQuestion, selectedOptionIds);

      if (!nextId || currentQuestion.isTerminal) {
        setIsComplete(true);
        return { nextId: null, hasRedFlag: hasRF };
      }

      setCurrentQuestion(nextId);
      return { nextId, hasRedFlag: hasRF };
    },
    [currentQuestion, addAnswer, setCurrentQuestion, setIsComplete]
  );

  const goBack = useCallback(() => {
    if (visitedQuestionIds.length <= 1) return;
    removeLastAnswer();
  }, [visitedQuestionIds, removeLastAnswer]);

  return {
    currentQuestion,
    advance,
    goBack,
    questionNumber,
    totalEstimate,
    progressPercent,
  };
}
