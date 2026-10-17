import { NextResponse } from "next/server";
import { requireUser } from "@/lib/apiGuard";
import { readJson } from "@/lib/http";
import { record, text, choices, InputError } from "@/lib/assessment/contracts";
import { calculateRisk } from "@/lib/ai-engine/scoring/engine";
import { collectSymptoms } from "@/lib/assessment/findings";
import { validateQuestion } from "@/lib/questionSchema";
import { QuestionContext, QuestionStep } from "../../../components/ai-question-engine/types";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b"; // Fast, high quality, generous free tier

export async function POST(req: Request) {
  const auth = await requireUser(req, "questions", 30); if (auth.response) return auth.response;
  try {
    const b = record(await readJson(req, 12000));
    if (!Number.isInteger(b.currentAiStep) || Number(b.currentAiStep) < 0 || Number(b.currentAiStep) > 5) throw new InputError('Invalid step');
    if (!Array.isArray(b.symptoms) || b.symptoms.length > 20 || !Array.isArray(b.previousQuestions) || b.previousQuestions.length > 6) throw new InputError('Invalid question context');
    const context: QuestionContext = {
      age: choices(b.age, 'age', ['child', 'teen', 'adult', 'elderly']), symptoms: b.symptoms.map(s => text(s, 'symptom')),
      customSymptom: b.customSymptom ? text(b.customSymptom, 'custom symptom') : undefined,
      aiAnswers: Object.fromEntries(Object.entries(record(b.aiAnswers ?? {})).slice(0, 6).map(([k, v]) => [text(k, 'key', 80), text(v, 'answer')])),
      previousQuestions: b.previousQuestions.map(p => { const item = record(p); return { question: text(item.question, 'question'), answer: text(item.answer, 'answer'), category: item.category ? text(item.category, 'category', 80) : undefined }; }),
      currentAiStep: Number(b.currentAiStep), language: choices(b.language, 'language', ['en', 'hi', 'mr']) as QuestionContext['language'],
      gender: b.gender ? text(b.gender, 'gender', 40) : undefined,
    };
    const affirmed = collectSymptoms(context.symptoms, context.customSymptom, context.previousQuestions.map(p => p.answer));
    const interim = calculateRisk({ symptom: affirmed[0] ?? "general", symptoms: affirmed, severity: "mild", duration: "< 1 day" });
    context.riskSnapshot = { score: interim.score, urgency: interim.urgency, isRedFlag: interim.isRedFlag, factors: interim.factors.map(f => f.label) };
    if (!GROQ_API_KEY) throw new Error("Question generation unavailable");
    const { age, symptoms, customSymptom, previousQuestions, currentAiStep, language, gender, riskSnapshot } = context;

    const symptomsStr = [
      ...(symptoms || []),
      ...(customSymptom ? [customSymptom] : []),
    ].join(", ") || "general symptoms";

    const langName = language === "hi" ? "Hindi (Devanagari script)"
      : language === "mr" ? "Marathi (Devanagari script)"
      : "English";

    const genderClinicalNote = '';

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

    // ── Live risk snapshot from the deterministic engine ──────────
    // Lets Groq prioritize probing that matters for the current risk band.
    let riskGuide = '';
    if (riskSnapshot && !riskSnapshot.isRedFlag) {
      const factorList = Array.isArray(riskSnapshot.factors) ? riskSnapshot.factors.join("; ") : '';
      const preferred =
        riskSnapshot.urgency === 'High'
          ? 'clinical_red_flags, symptom_location'
          : riskSnapshot.urgency === 'Medium'
            ? 'symptom_triggers, episode_history'
            : 'body_system_review, lifestyle_environmental';
      riskGuide = `
CURRENT INTERIM RISK (computed by the rules engine from this patient's earlier answers):
- Level: ${riskSnapshot.urgency}
- Score: ${riskSnapshot.score}/100
- Contributing factors: ${factorList || 'n/a'}

PRIORITY: Weight the question toward these categories first: ${preferred}.${
        riskSnapshot.urgency === 'High'
          ? ' Keep the question focused on identifying escalating danger; do not reassure.'
          : riskSnapshot.urgency === 'Medium'
            ? ' Probe whether the situation is stabilizing or deteriorating.'
            : ' Screen for hidden aggravating factors and lifestyle triggers.'
      }
`;
    }

    const systemMessage = `You are a medical triage assistant generating adaptive follow-up questions. You ONLY respond with valid JSON. No explanations, no markdown, no extra text.`;

    const userMessage = `Generate ONE medical follow-up question for this patient.

PATIENT PROFILE:
- Age group: ${age || "adult"}
- Reported symptoms: ${symptomsStr}
- Gender: ${gender || "not specified"}
- Question ${currentAiStep + 1} of 6
${genderClinicalNote ? `\n${genderClinicalNote}\n` : ''}
${riskGuide ? `\n${riskGuide}\n` : ''}

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
    { "label": { "en": "...", "hi": "...", "mr": "..." }, "value": "option_a", "emoji": "" },
    { "label": { "en": "...", "hi": "...", "mr": "..." }, "value": "option_b", "emoji": "" },
    { "label": { "en": "...", "hi": "...", "mr": "..." }, "value": "option_c", "emoji": "" }
  ]
}`;

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      signal: AbortSignal.timeout(6000),
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
      console.error("[Groq API Error]", response.status);
      throw new Error(`Groq API failed: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content;

    if (!resultText) throw new Error("Empty response from Groq");

    const question: QuestionStep = validateQuestion(JSON.parse(resultText), currentAiStep);

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

    return NextResponse.json(question);

  } catch (error) {
    console.error("[QuestionGen API] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to generate question" },
      { status: error instanceof InputError ? 400 : 503 }
    );
  }
}
