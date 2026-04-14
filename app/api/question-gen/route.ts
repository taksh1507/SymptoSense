import { NextResponse } from "next/server";
import { QuestionContext, QuestionStep } from "../../../components/ai-question-engine/types";

// Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

/**
 * AI Question Generator
 * Uses Gemini 1.5 Flash to generate context-aware health follow-up questions.
 */
export async function POST(req: Request) {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY in environment");
    }

    const context: QuestionContext = await req.json();
    const { initialSymptom, answers, language } = context;

    const previousAnswersStr = Object.entries(answers)
      .map(([key, val]) => `${key}: ${val}`)
      .join(", ");

    const systemPrompt = `
      You are an expert medical triage assistant (non-diagnostic). 
      Your goal is to generate one medical follow-up question for a user reporting ${initialSymptom}.
      
      CONTEXT:
      - Initial Symptom: ${initialSymptom}
      - Previous Answers: ${previousAnswersStr}
      - Preferred Language: ${language}
      - Step: ${context.currentStep}
      
      RULES:
      1. Strictly follow the JSON format below.
      2. Strictly use 'mcq' type with 3-4 options.
      3. Each option must have an emoji and a canonical 'value' (English).
      4. Support both English and Hindi in the labels.
      5. DO NOT provide medical diagnosis or urgency scores.
      6. The question should be a logical medical follow-up (e.g., associated symptoms, onset, etc.)
      
      JSON FORMAT:
      {
        "id": "dynamic_step_${context.currentStep}",
        "key": "additional_${context.currentStep}",
        "question": { "en": "Question text?", "hi": "हिंदी प्रश्न?" },
        "type": "mcq",
        "options": [
          { "label": { "en": "Option 1", "hi": "विकल्प 1" }, "value": "option_1", "emoji": "🔵" },
          ...
        ]
      }
    `;

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Gemini API Error]", err);
      throw new Error("Gemini API call failed");
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) throw new Error("Empty response from AI");

    const question: QuestionStep = JSON.parse(resultText);
    return NextResponse.json(question);

  } catch (error) {
    console.error("[QuestionGen API] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate question" },
      { status: 500 }
    );
  }
}
