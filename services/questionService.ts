import { getNextQuestion as getFallbackQuestion } from "@/components/ai-question-engine/questionFlow";
import type { QuestionContext, QuestionStep } from "@/components/ai-question-engine/types";

/**
 * Question Service
 * Orchestrates dynamic AI question generation with a safe deterministic fallback.
 */

export async function fetchNextQuestion(
  context: QuestionContext
): Promise<QuestionStep | null> {
  const { initialSymptom, currentStep } = context;

  // Hybrid Logic:
  // Step 0 - 1 (Severity, Duration) are usually deterministic for baseline.
  // Step 2+ are AI-driven follow-ups.
  
  if (currentStep < 2) {
    return getFallbackQuestion(currentStep, initialSymptom);
  }

  try {
    // Attempt AI Generation
    const response = await fetch("/api/question-gen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context),
      // Set a reasonable timeout for production-ready responsiveness
      signal: AbortSignal.timeout(3000), 
    });

    if (!response.ok) throw new Error("AI Generation failed");

    const question: QuestionStep = await response.json();
    
    // Basic validation
    if (question && question.question && question.options) {
      console.log(`[QuestionService] AI Question generated for step ${currentStep}`);
      return question;
    }
    
    throw new Error("Invalid question format from AI");
  } catch (error) {
    console.warn(
      `[QuestionService] Falling back to static flow for step ${currentStep}. Reason:`,
      error instanceof Error ? error.message : "Unknown"
    );
    return getFallbackQuestion(currentStep, initialSymptom);
  }
}
