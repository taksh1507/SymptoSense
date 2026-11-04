import { NextResponse } from "next/server";
import { requireUser } from "@/lib/apiGuard";
import { readJson } from "@/lib/http";
import { record, text, choices, InputError } from "@/lib/assessment/contracts";
import { calculateRisk } from "@/lib/ai-engine/scoring/engine";
import { collectSymptoms } from "@/lib/assessment/findings";
import { validateQuestion } from "@/lib/questionSchema";
import { isDuplicateQuestion } from "@/lib/questionDeduplication";
import { QuestionContext, QuestionStep } from "../../../components/ai-question-engine/types";

const CLINICAL_CATEGORY_FALLBACKS: Record<string, (step: number) => QuestionStep> = {
  episode_history: (step) => ({
    id: `ai_q${step + 1}`,
    key: `ai_q${step + 1}`,
    type: 'mcq',
    singleSelect: true,
    category: 'episode_history',
    question: {
      en: 'Have you experienced similar symptoms like this in the past?',
      hi: 'क्या आपको पहले कभी इस तरह के लक्षण महसूस हुए हैं?',
      mr: 'तुम्हाला यापूर्वी कधी अशा प्रकारचा त्रास झाला आहे का?',
    },
    options: [
      { label: { en: 'No, this is the first time', hi: 'नहीं, यह पहली बार है', mr: 'नाही, हे पहिल्यांदाच आहे' }, value: 'first_time', emoji: '•' },
      { label: { en: 'Yes, occasional mild episodes', hi: 'हाँ, कभी-कभार हल्के लक्षण', mr: 'होय, अधूनमधून सौम्य लक्षणे' }, value: 'occasional_episodes', emoji: '•' },
      { label: { en: 'Yes, frequent recurring episodes', hi: 'हाँ, बार-बार होते हैं', mr: 'होय, वारंवार होतात' }, value: 'frequent_episodes', emoji: '•' },
    ],
  }),
  lifestyle_environmental: (step) => ({
    id: `ai_q${step + 1}`,
    key: `ai_q${step + 1}`,
    type: 'mcq',
    singleSelect: true,
    category: 'lifestyle_environmental',
    question: {
      en: 'Have you had recent sick contacts, changes in sleep, or high physical stress?',
      hi: 'क्या आप किसी बीमार व्यक्ति के संपर्क में आए हैं या नींद/तनाव में बदलाव हुआ है?',
      mr: 'तुम्ही अलीकडे आजारी व्यक्तीच्या संपर्कात आला आहात किंवा झोप/तणावात बदल झाला आहे का?',
    },
    options: [
      { label: { en: 'None of these', hi: 'इनमें से कोई नहीं', mr: 'यापैकी काहीही नाही' }, value: 'none', emoji: '•' },
      { label: { en: 'Recent contact with someone sick', hi: 'बीमार व्यक्ति के संपर्क में आए', mr: 'आजारी व्यक्तीच्या संपर्कात आलो' }, value: 'sick_contact', emoji: '•' },
      { label: { en: 'Poor sleep or significant physical stress', hi: 'खराब नींद या अत्यधिक शारीरिक तनाव', mr: 'अपुरी झोप किंवा मोठा शारीरिक ताण' }, value: 'poor_sleep_stress', emoji: '•' },
    ],
  }),
  body_system_review: (step) => ({
    id: `ai_q${step + 1}`,
    key: `ai_q${step + 1}`,
    type: 'mcq',
    singleSelect: true,
    category: 'body_system_review',
    question: {
      en: 'Have you noticed any changes in your appetite, hydration, or digestion?',
      hi: 'क्या आपने अपनी भूख, पानी पीने की मात्रा या पाचन में कोई बदलाव देखा है?',
      mr: 'तुम्हाला तुमच्या भूक, पाणी पिणे किंवा पचनात काही बदल जाणवला आहे का?',
    },
    options: [
      { label: { en: 'Normal appetite and digestion', hi: 'सामान्य भूख और पाचन', mr: 'सामान्य भूक आणि पचन' }, value: 'normal_digestion', emoji: '•' },
      { label: { en: 'Decreased appetite or nausea', hi: 'भूख कम लगना या मतली', mr: 'भूक मंदावणे किंवा मळमळ' }, value: 'poor_appetite_nausea', emoji: '•' },
      { label: { en: 'Trouble drinking enough fluids', hi: 'पर्याप्त तरल पदार्थ पीने में परेशानी', mr: 'पुरेसे पाणी पिण्यास त्रास' }, value: 'poor_fluids', emoji: '•' },
    ],
  }),
  associated_symptoms: (step) => ({
    id: `ai_q${step + 1}`,
    key: `ai_q${step + 1}`,
    type: 'mcq',
    singleSelect: true,
    category: 'associated_symptoms',
    question: {
      en: 'Are you experiencing fatigue, body aches, or lightheadedness?',
      hi: 'क्या आपको अत्यधिक थकान, शरीर दर्द या चक्कर महसूस हो रहे हैं?',
      mr: 'तुम्हाला जास्त थकवा, अंगदुखी किंवा चक्कर आल्यासारखे वाटत आहे का?',
    },
    options: [
      { label: { en: 'No other symptoms', hi: 'कोई अन्य लक्षण नहीं', mr: 'इतर कोणतीही लक्षणे नाहीत' }, value: 'none', emoji: '•' },
      { label: { en: 'General fatigue or body aches', hi: 'थकान या शरीर में दर्द', mr: 'थकवा किंवा अंगदुखी' }, value: 'fatigue_aches', emoji: '•' },
      { label: { en: 'Dizziness or lightheadedness', hi: 'चक्कर आना', mr: 'चक्कर येणे' }, value: 'dizziness', emoji: '•' },
    ],
  }),
};

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

    const hasChestSymptom = /\b(chest|angina|heart|sternum)\b/i.test(symptomsStr);
    let chestClinicalGuide = '';
    if (hasChestSymptom) {
      chestClinicalGuide = `
ADAPTIVE CHEST-PAIN / DISCOMFORT CLINICAL GUIDELINES:
The patient reports chest discomfort or related cardiac symptoms. Prioritize differentiating acute coronary conditions:
1. Rest vs. Exertion (symptom_triggers): Ask if discomfort occurs even at rest, or if it is triggered by physical exertion and relieved by rest (maps to DDXPlus E_14 'chest pain even at rest' vs E_218 'increased with exertion, alleviated with rest').
2. New or Worsening Episodes (episode_history): Inquire whether episodes have worsened over the last 2 weeks with progressively less effort required (maps to DDXPlus E_13).
3. Episode Duration & Frequency: Inquire if episodes are increasing in frequency, severity, or lasting longer than 20 minutes.
4. Pain Radiation (symptom_location): Check if discomfort radiates to the left arm, neck, shoulder, or jaw (maps to DDXPlus E_57).
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
${chestClinicalGuide ? `\n${chestClinicalGuide}\n` : ''}

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

- Pick the category most clinically relevant to "${symptomsStr}"
- NEVER ask about duration, severity, age, or medications/drugs/treatments — these are asked separately
- NEVER ask about: current medications, prescribed drugs, over-the-counter medicine, supplements, dosage, treatment history
- NEVER repeat a question topic or intent already in the conversation history above
- NEVER ask a second "better or worse" or "what makes it worse" question if triggers have already been asked
- NEVER combine multiple unrelated symptoms into a single question like "What makes your stomach pain, cough, or fever better or worse?". Keep questions concise, targeted, and easy to answer.
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

    let question: QuestionStep = validateQuestion(JSON.parse(resultText), currentAiStep);

    if (!question?.question?.en || !question?.options?.length) {
      throw new Error("Invalid question structure from Groq");
    }

    // Semantic Duplicate Detection: Avoid repeating clinical intent (e.g. redundant trigger/better-or-worse questions)
    if (previousQuestions && isDuplicateQuestion(question.question.en, question.category, previousQuestions)) {
      const unusedCat = remainingCategories.find(c => c !== question.category && c !== 'symptom_triggers') || 'body_system_review';
      const fallbackFn = CLINICAL_CATEGORY_FALLBACKS[unusedCat] || CLINICAL_CATEGORY_FALLBACKS.episode_history;
      question = fallbackFn(currentAiStep);
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
