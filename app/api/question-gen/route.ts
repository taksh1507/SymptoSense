import { NextResponse } from "next/server";
import { QuestionContext, QuestionStep } from "../../../components/ai-question-engine/types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export async function POST(req: Request) {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY in environment");
    }

    const context: QuestionContext = await req.json();
    const { age, symptoms, customSymptom, aiAnswers, currentAiStep, language } = context;

    const symptomsStr = [
      ...(symptoms || []),
      ...(customSymptom ? [customSymptom] : []),
    ].join(", ") || "general symptoms";

    const previousAnswersStr = Object.entries(aiAnswers || {})
      .map(([key, val]) => `${key}: ${val}`)
      .join("; ") || "none yet";

    const langName = language === "hi" ? "Hindi (Devanagari script)"
      : language === "mr" ? "Marathi (Devanagari script)"
      : "English";

    const systemPrompt = `You are a medical triage assistant helping assess a patient's symptoms.

PATIENT CONTEXT:
- Age group: ${age || "adult"}
- Reported symptoms: ${symptomsStr}
- Previous follow-up answers: ${previousAnswersStr}
- Follow-up question number: ${currentAiStep + 1} of 6
- Language: ${langName}

Generate ONE medically relevant follow-up question to better understand the patient's condition.

STRICT RULES:
1. Return ONLY valid JSON, no extra text.
2. Use "mcq" type with exactly 3-4 options.
3. Each option needs: label (en, hi, mr), value (English snake_case), emoji.
4. Question must be in all 3 languages: English, Hindi (Devanagari), Marathi (Devanagari).
5. Do NOT repeat questions already answered.
6. Do NOT provide diagnosis or risk scores.
7. Focus on: onset, location, associated symptoms, triggers, or impact on daily life.

REQUIRED JSON FORMAT:
{
  "id": "ai_q${currentAiStep + 1}",
  "key": "ai_q${currentAiStep + 1}",
  "type": "mcq",
  "question": {
    "en": "English question?",
    "hi": "हिंदी प्रश्न?",
    "mr": "मराठी प्रश्न?"
  },
  "options": [
    { "label": { "en": "Option A", "hi": "विकल्प अ", "mr": "पर्याय अ" }, "value": "option_a", "emoji": "🔵" },
    { "label": { "en": "Option B", "hi": "विकल्प ब", "mr": "पर्याय ब" }, "value": "option_b", "emoji": "🟢" },
    { "label": { "en": "Option C", "hi": "विकल्प स", "mr": "पर्याय क" }, "value": "option_c", "emoji": "🟡" }
  ]
}`;

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Gemini API Error]", response.status, err);
      throw new Error(`Gemini API failed: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) throw new Error("Empty response from Gemini");

    const question: QuestionStep = JSON.parse(resultText);

    // Validate required fields
    if (!question?.question?.en || !question?.options?.length) {
      throw new Error("Invalid question structure from Gemini");
    }

    // Ensure mr field exists
    if (!question.question.mr) question.question.mr = question.question.hi;
    question.options = question.options.map((o) => ({
      ...o,
      label: {
        en: o.label.en || "",
        hi: o.label.hi || o.label.en,
        mr: o.label.mr || o.label.hi || o.label.en,
      },
    }));

    console.log(`[QuestionGen] AI question generated for step ${currentAiStep + 1}: "${question.question.en}"`);
    return NextResponse.json(question);

  } catch (error) {
    console.error("[QuestionGen API] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to generate question" },
      { status: 500 }
    );
  }
}
