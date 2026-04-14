import { NextResponse } from "next/server";
import { QuestionContext, QuestionStep } from "../../../components/ai-question-engine/types";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile"; // Fast, high quality, generous free tier

export async function POST(req: Request) {
  try {
    if (!GROQ_API_KEY) {
      throw new Error("Missing GROQ_API_KEY in environment");
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

    const systemMessage = `You are a medical triage assistant. You ONLY respond with valid JSON. No explanations, no markdown, no extra text — just the JSON object.`;

    const userMessage = `Generate ONE medical follow-up question for a patient with these details:
- Age group: ${age || "adult"}
- Reported symptoms: ${symptomsStr}
- Previous answers: ${previousAnswersStr}
- Question number: ${currentAiStep + 1} of 6
- Language: ${langName}

Rules:
- Ask about: onset, location, associated symptoms, triggers, or daily impact
- Do NOT diagnose or give risk scores
- Do NOT repeat already-answered topics
- Use "mcq" type with 3-4 options
- All text must appear in English (en), Hindi (hi), and Marathi (mr)

Respond with ONLY this JSON structure:
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

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Groq API Error]", response.status, err);
      throw new Error(`Groq API failed: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content;

    if (!resultText) throw new Error("Empty response from Groq");

    const question: QuestionStep = JSON.parse(resultText);

    if (!question?.question?.en || !question?.options?.length) {
      throw new Error("Invalid question structure from Groq");
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

    console.log(`[QuestionGen] Groq question for step ${currentAiStep + 1}: "${question.question.en}"`);
    return NextResponse.json(question);

  } catch (error) {
    console.error("[QuestionGen API] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to generate question" },
      { status: 500 }
    );
  }
}
