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
    const { age, symptoms, customSymptom, aiAnswers, previousQuestions, currentAiStep, language, gender } = context;

    const symptomsStr = [
      ...(symptoms || []),
      ...(customSymptom ? [customSymptom] : []),
    ].join(", ") || "general symptoms";

    const langName = language === "hi" ? "Hindi (Devanagari script)"
      : language === "mr" ? "Marathi (Devanagari script)"
      : "English";

    // ── Gender-symptom clinical mismatch detection ────────────────
    // Detects anatomically impossible combinations and injects a note
    // so Groq avoids generating irrelevant or misleading follow-up questions.
    const FEMALE_ONLY_SYMPTOMS = [
      'delayed_periods', 'missed_period', 'menstrual_pain', 'vaginal_discharge',
      'pelvic_pain', 'pregnancy_symptoms', 'menstruation', 'period', 'ovarian',
    ];
    const MALE_ONLY_SYMPTOMS = [
      'testicular_torsion', 'testicular_pain', 'scrotal_pain', 'prostate',
      'erectile', 'penile',
    ];

    const allSymptomTokens = [symptomsStr, ...(Object.values(aiAnswers || {}))].join(' ').toLowerCase();

    let genderClinicalNote = '';

    if (gender === 'Male') {
      const mismatch = FEMALE_ONLY_SYMPTOMS.find(s => allSymptomTokens.includes(s));
      if (mismatch) {
        genderClinicalNote = `⚠️ CLINICAL NOTE: The patient is recorded as Male, but the symptom "${mismatch}" is anatomically specific to females. Do NOT generate follow-up questions about this symptom. Focus on other reported symptoms instead.`;
      }
    } else if (gender === 'Female') {
      const mismatch = MALE_ONLY_SYMPTOMS.find(s => allSymptomTokens.includes(s));
      if (mismatch) {
        genderClinicalNote = `⚠️ CLINICAL NOTE: The patient is recorded as Female, but the symptom "${mismatch}" is anatomically specific to males. Do NOT generate follow-up questions about this symptom. Focus on other reported symptoms instead.`;
      }
    }

    // Build a rich Q&A history string so Groq knows exactly what was asked and answered
    const historyStr = previousQuestions && previousQuestions.length > 0
      ? previousQuestions.map((p, i) =>
          `Q${i + 1}: "${p.question}" → Patient answered: "${p.answer}"`
        ).join("\n")
      : "No previous questions yet.";

    // Derive which categories are already covered from history
    const ALL_CATEGORIES = [
      "symptom_location",
      "symptom_triggers",
      "associated_symptoms",
      "body_system_review",
      "lifestyle_environmental",
      "episode_history",
      "clinical_red_flags",
    ];
    const coveredCategories = previousQuestions
      ?.map(p => p.category)
      .filter(Boolean) as string[];
    const remainingCategories = ALL_CATEGORIES.filter(c => !coveredCategories.includes(c));

    const systemMessage = `You are a medical triage assistant generating adaptive follow-up questions. You ONLY respond with valid JSON. No explanations, no markdown, no extra text.`;

    const userMessage = `Generate ONE medical follow-up question for this patient.

PATIENT PROFILE:
- Age group: ${age || "adult"}
- Reported symptoms: ${symptomsStr}
- Gender: ${gender || "not specified"}
- Question ${currentAiStep + 1} of 6
${genderClinicalNote ? `\n${genderClinicalNote}\n` : ''}

CONVERSATION HISTORY (questions already asked — DO NOT repeat these topics):
${historyStr}

CATEGORIES STILL AVAILABLE (pick ONE from this list):
${remainingCategories.length > 0 ? remainingCategories.join(", ") : ALL_CATEGORIES.join(", ")}

CATEGORY DEFINITIONS:
- symptom_location: WHERE exactly is the symptom felt? (body part, side, radiation)
- symptom_triggers: WHAT makes it better or worse? (movement, food, posture, stress)
- associated_symptoms: Any OTHER symptoms accompanying the main one?
- body_system_review: Related body system check (breathing, digestion, urination, vision)
- lifestyle_environmental: Recent changes in sleep, diet, stress, travel, or environment
- episode_history: Has this happened before? Was it diagnosed or treated?
- clinical_red_flags: Sudden onset, loss of consciousness, numbness, vision/speech changes

STRICT RULES:
- Pick the category most clinically relevant to "${symptomsStr}"
- NEVER ask about duration, severity, age, or medications/drugs/treatments — these are asked separately
- NEVER ask about: current medications, prescribed drugs, over-the-counter medicine, supplements, dosage, treatment history
- NEVER repeat a question topic already in the conversation history above
- Use "mcq" type with exactly 3-4 options
- Include the chosen category as "category" field in your response
- All text in English (en), Hindi (hi), and Marathi (mr)
- Language for display: ${langName}

Respond with ONLY this JSON:
{
  "id": "ai_q${currentAiStep + 1}",
  "key": "ai_q${currentAiStep + 1}",
  "type": "mcq",
  "category": "<chosen_category_from_list>",
  "question": {
    "en": "...",
    "hi": "...",
    "mr": "..."
  },
  "options": [
    { "label": { "en": "...", "hi": "...", "mr": "..." }, "value": "option_a", "emoji": "🔵" },
    { "label": { "en": "...", "hi": "...", "mr": "..." }, "value": "option_b", "emoji": "🟢" },
    { "label": { "en": "...", "hi": "...", "mr": "..." }, "value": "option_c", "emoji": "🟡" }
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
        temperature: 0.8,
        max_tokens: 600,
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
