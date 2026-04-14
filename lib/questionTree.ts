// ============================================================
// QUESTION TREE — Full adaptive branching logic for SymptoSense
// ============================================================

export type QuestionType = "mcq" | "yesno" | "scale" | "text";

export interface QuestionOption {
  id: string;
  label: string;
  emoji?: string;
  nextQuestionId?: string;
  redFlag?: boolean;
  score?: number;
}

export interface Question {
  id: string;
  text: string;
  subtext?: string;
  type: QuestionType;
  options?: QuestionOption[];
  multiSelect?: boolean;
  nextQuestionId?: string; // default next (for scale/text/yesno)
  yesNextId?: string;
  noNextId?: string;
  category: string;
  weight: number; // base importance weight 1-3
  isTerminal?: boolean; // ends the flow
  allowOther?: boolean; // allow free-text input if "Other" is selected
  otherPlaceholder?: string;
}

// ============================================================
// QUESTION DEFINITIONS
// ============================================================

export const QUESTIONS: Record<string, Question> = {
  // ── Profile ────────────────────────────────────────────────
  q_age: {
    id: "q_age",
    text: "How old are you?",
    subtext: "Age helps us tailor our health analysis",
    type: "mcq",
    category: "profile",
    weight: 1,
    nextQuestionId: "q_gender",
    options: [
      { id: "child", label: "0-12 (Child)", emoji: "👶" },
      { id: "teen",  label: "13-19 (Teen)", emoji: "👦" },
      { id: "adult", label: "20-60 (Adult)", emoji: "👨" },
      { id: "senior", label: "60+ (Senior)", emoji: "👴" },
    ],
  },

  q_gender: {
    id: "q_gender",
    text: "What is your gender?",
    subtext: "This helps us provide more accurate health guidance",
    type: "mcq",
    category: "profile",
    weight: 1,
    nextQuestionId: "q_start",
    options: [
      { id: "male",   label: "Male",   emoji: "👨" },
      { id: "female", label: "Female", emoji: "👩" },
      { id: "nonbinary", label: "Non-binary", emoji: "👤" },
      { id: "prefer_not_to_say", label: "Prefer not to say", emoji: "🤐" },
    ],
  },

  // ── Entry ──────────────────────────────────────────────────
  q_start: {
    id: "q_start",
    text: "What is your primary symptom today?",
    subtext: "Select all that apply — we'll ask more about each one",
    type: "mcq",
    multiSelect: true,
    category: "triage",
    weight: 3,
    nextQuestionId: "q_duration",
    options: [
      { id: "chest_pain",        label: "Chest pain or tightness",  emoji: "💔", nextQuestionId: "q_chest_1",       redFlag: true, score: 35 },
      { id: "headache",          label: "Headache or head pressure", emoji: "🤕", nextQuestionId: "q_head_1",        score: 15 },
      { id: "fever",             label: "Fever or chills",           emoji: "🌡️", nextQuestionId: "q_fever_1",       score: 20 },
      { id: "cough",             label: "Cough or sore throat",      emoji: "😷", nextQuestionId: "q_resp_1",        score: 15 },
      { id: "shortness_of_breath", label: "Shortness of breath",    emoji: "💨", nextQuestionId: "q_chest_1",       redFlag: true, score: 35 },
      { id: "stomach_pain",      label: "Stomach pain or nausea",    emoji: "🤢", nextQuestionId: "q_stomach_1",    score: 20 },
      { id: "dizziness",         label: "Dizziness or fainting",     emoji: "😵", nextQuestionId: "q_dizzy_1",      score: 25 },
      { id: "skin_rash",         label: "Skin rash or swelling",     emoji: "🔴", nextQuestionId: "q_skin_1",       score: 15 },
      { id: "joint_pain",        label: "Joint or muscle pain",      emoji: "🦴", nextQuestionId: "q_pain_scale",   score: 15 },
      { id: "anxiety_stress",    label: "Anxiety or mental distress",emoji: "😰", nextQuestionId: "q_mental_1",    score: 20 },
      { id: "something_else",    label: "Something else...",         emoji: "🔍", score: 10 },
    ],
    allowOther: true,
    otherPlaceholder: "Please describe your symptom briefly...",
  },

  // ── Chest / Cardiac ─────────────────────────────────────────
  q_chest_1: {
    id: "q_chest_1",
    text: "Describe the chest sensation:",
    type: "mcq",
    multiSelect: false,
    category: "cardiac",
    weight: 3,
    nextQuestionId: "q_chest_2",
    options: [
      { id: "pressure",       label: "Heavy pressure or squeezing",  emoji: "🏋️", score: 30 },
      { id: "sharp_stabbing", label: "Sharp stabbing pain",          emoji: "🔪", score: 25 },
      { id: "burning",        label: "Burning sensation",            emoji: "🔥", score: 20 },
      { id: "tightness_mild", label: "Mild tightness only",         emoji: "😟", score: 15 },
      { id: "palpitations",   label: "Heart racing or fluttering",   emoji: "💓", score: 20 },
    ],
  },

  q_chest_2: {
    id: "q_chest_2",
    text: "Does the pain/discomfort spread to your arm, jaw, or back?",
    type: "yesno",
    category: "cardiac",
    weight: 3,
    yesNextId: "q_chest_3",
    noNextId: "q_duration",
    options: [
      { id: "yes", label: "Yes", score: 35, redFlag: true },
      { id: "no",  label: "No",  score: 0 },
    ],
  },

  q_chest_3: {
    id: "q_chest_3",
    text: "Are you also experiencing any of these?",
    type: "mcq",
    multiSelect: true,
    category: "cardiac",
    weight: 3,
    nextQuestionId: "q_duration",
    options: [
      { id: "sweating",         label: "Cold sweats",         emoji: "💧", score: 20 },
      { id: "nausea_cardiac",   label: "Nausea or vomiting",  emoji: "🤢", score: 15 },
      { id: "shortness_breath", label: "Shortness of breath", emoji: "💨", score: 30, redFlag: true },
      { id: "lightheaded",      label: "Feeling lightheaded",  emoji: "😵", score: 20 },
      { id: "none_of_above",    label: "None of the above",   emoji: "❌", score: 0 },
    ],
  },

  // ── Head / Neuro ─────────────────────────────────────────────
  q_head_1: {
    id: "q_head_1",
    text: "How would you describe the headache?",
    type: "mcq",
    multiSelect: false,
    category: "neurological",
    weight: 2,
    nextQuestionId: "q_head_2",
    options: [
      { id: "thunderclap",   label: "Sudden, worst headache of my life", emoji: "⚡", score: 35, redFlag: true, nextQuestionId: "q_head_severe" },
      { id: "throbbing",     label: "Throbbing / pulsating",             emoji: "💢", score: 20 },
      { id: "tension",       label: "Pressure / band around head",       emoji: "🎗️", score: 12 },
      { id: "behind_eyes",   label: "Pain behind the eyes",              emoji: "👀", score: 15 },
      { id: "one_side",      label: "One-sided (migraine-like)",         emoji: "🧠", score: 18 },
    ],
  },

  q_head_2: {
    id: "q_head_2",
    text: "Are you experiencing vision changes, numbness, or weakness on one side of your body?",
    type: "yesno",
    category: "neurological",
    weight: 3,
    yesNextId: "q_stroke_symptoms",
    noNextId: "q_duration",
    options: [
      { id: "yes", label: "Yes", score: 40, redFlag: true },
      { id: "no",  label: "No",  score: 0 },
    ],
  },

  q_head_severe: {
    id: "q_head_severe",
    text: "Is this accompanied by fever, stiff neck, or sensitivity to light?",
    type: "yesno",
    category: "neurological",
    weight: 3,
    yesNextId: "q_duration",
    noNextId: "q_duration",
    options: [
      { id: "yes", label: "Yes", score: 35, redFlag: true },
      { id: "no",  label: "No",  score: 20 },
    ],
  },

  q_stroke_symptoms: {
    id: "q_stroke_symptoms",
    text: "Are you having any of these right now?",
    subtext: "These are potential stroke warning signs — please be honest",
    type: "mcq",
    multiSelect: true,
    category: "neurological",
    weight: 3,
    nextQuestionId: "q_duration",
    options: [
      { id: "face_drooping",    label: "Face drooping on one side",  emoji: "😶", score: 40, redFlag: true },
      { id: "arm_weakness",     label: "Sudden arm weakness",        emoji: "💪", score: 40, redFlag: true },
      { id: "speech_slurred",   label: "Slurred or confused speech", emoji: "🗣️", score: 40, redFlag: true },
      { id: "sudden_confusion", label: "Sudden confusion",           emoji: "❓", score: 35, redFlag: true },
      { id: "none",             label: "None of these",              emoji: "✅", score: 0 },
    ],
  },

  // ── Fever / Infection ────────────────────────────────────────
  q_fever_1: {
    id: "q_fever_1",
    text: "What is your approximate temperature?",
    type: "mcq",
    multiSelect: false,
    category: "infection",
    weight: 2,
    nextQuestionId: "q_fever_2",
    options: [
      { id: "below_38",    label: "Below 38°C (100.4°F) — Mild",   emoji: "🟡", score: 8 },
      { id: "38_to_39",    label: "38–39°C (100–102°F) — Moderate", emoji: "🟠", score: 18 },
      { id: "above_39",    label: "Above 39°C (102°F+) — High",    emoji: "🔴", score: 30 },
      { id: "not_checked", label: "I haven't checked",              emoji: "❓", score: 12 },
    ],
  },

  q_fever_2: {
    id: "q_fever_2",
    text: "Are you experiencing any of these alongside the fever?",
    type: "mcq",
    multiSelect: true,
    category: "infection",
    weight: 2,
    nextQuestionId: "q_duration",
    options: [
      { id: "body_aches",    label: "Severe body aches",        emoji: "💪", score: 12 },
      { id: "stiff_neck",    label: "Stiff neck",               emoji: "🦒", score: 25, redFlag: false },
      { id: "rash_fever",    label: "New skin rash",            emoji: "🔴", score: 20 },
      { id: "confusion_fever",label: "Confusion or drowsiness", emoji: "😴", score: 25 },
      { id: "travel_recent", label: "Recent travel abroad",     emoji: "✈️", score: 15 },
      { id: "none_fever",    label: "None of these",            emoji: "✅", score: 0 },
    ],
  },

  // ── Respiratory ───────────────────────────────────────────────
  q_resp_1: {
    id: "q_resp_1",
    text: "Describe your cough:",
    type: "mcq",
    multiSelect: false,
    category: "respiratory",
    weight: 2,
    nextQuestionId: "q_resp_2",
    options: [
      { id: "dry_cough",      label: "Dry, persistent cough",      emoji: "😮‍💨", score: 10 },
      { id: "wet_cough",      label: "Wet / productive cough",     emoji: "🦠", score: 15 },
      { id: "blood_cough",    label: "Coughing up blood",          emoji: "🩸", score: 40, redFlag: true },
      { id: "wheezing",       label: "Wheezing or whistling",      emoji: "🎵", score: 20 },
      { id: "barking_cough",  label: "Barking cough",              emoji: "🔊", score: 12 },
    ],
  },

  q_resp_2: {
    id: "q_resp_2",
    text: "How is your breathing?",
    type: "mcq",
    multiSelect: false,
    category: "respiratory",
    weight: 3,
    nextQuestionId: "q_duration",
    options: [
      { id: "normal_breath",   label: "Normal, not affected",      emoji: "✅", score: 0 },
      { id: "mild_difficulty", label: "Slightly harder than usual", emoji: "😮", score: 15 },
      { id: "moderate_difficulty", label: "Noticeably difficult",  emoji: "😰", score: 28 },
      { id: "severe_difficulty", label: "Gasping or very labored", emoji: "🚨", score: 40, redFlag: true },
    ],
  },

  // ── Stomach / GI ─────────────────────────────────────────────
  q_stomach_1: {
    id: "q_stomach_1",
    text: "Where is the stomach pain located?",
    type: "mcq",
    multiSelect: false,
    category: "gastrointestinal",
    weight: 2,
    nextQuestionId: "q_stomach_2",
    options: [
      { id: "upper_right",  label: "Upper right (below ribs)",   emoji: "🫀", score: 20 },
      { id: "lower_right",  label: "Lower right — appendix area",emoji: "⚠️", score: 28 },
      { id: "center",       label: "Center / all over",          emoji: "🎯", score: 15 },
      { id: "lower",        label: "Lower abdomen / pelvis",     emoji: "⬇️", score: 15 },
      { id: "upper_center", label: "Upper center / below chest", emoji: "⬆️", score: 18 },
    ],
  },

  q_stomach_2: {
    id: "q_stomach_2",
    text: "Are you experiencing vomiting or diarrhea?",
    type: "mcq",
    multiSelect: true,
    category: "gastrointestinal",
    weight: 2,
    nextQuestionId: "q_duration",
    options: [
      { id: "vomiting",       label: "Vomiting",                  emoji: "🤮", score: 15 },
      { id: "blood_vomit",    label: "Vomiting blood",            emoji: "🩸", score: 40, redFlag: true },
      { id: "diarrhea",       label: "Diarrhea",                  emoji: "🚽", score: 12 },
      { id: "blood_stool",    label: "Blood in stool",            emoji: "🩸", score: 35, redFlag: true },
      { id: "no_vomit_diar",  label: "Neither",                   emoji: "✅", score: 0 },
    ],
  },

  // ── Dizziness / Balance ───────────────────────────────────────
  q_dizzy_1: {
    id: "q_dizzy_1",
    text: "How would you describe the dizziness?",
    type: "mcq",
    multiSelect: false,
    category: "neurological",
    weight: 2,
    nextQuestionId: "q_dizzy_2",
    options: [
      { id: "room_spinning",    label: "Room is spinning (vertigo)", emoji: "🌀", score: 20 },
      { id: "lightheaded",      label: "Lightheaded / faint feeling", emoji: "😵", score: 18 },
      { id: "balance_loss",     label: "Can't walk straight",        emoji: "🚶", score: 25 },
      { id: "blacked_out",      label: "Actually fainted / blacked out", emoji: "⚫", score: 35, redFlag: true },
      { id: "mild_dizzy",       label: "Mild / brief dizziness",     emoji: "😌", score: 10 },
    ],
  },

  q_dizzy_2: {
    id: "q_dizzy_2",
    text: "Is the dizziness associated with any of the following?",
    type: "mcq",
    multiSelect: true,
    category: "neurological",
    weight: 2,
    nextQuestionId: "q_duration",
    options: [
      { id: "standing_up",     label: "Standing up quickly",       emoji: "⬆️", score: 8 },
      { id: "ear_ringing",     label: "Ear ringing (tinnitus)",    emoji: "👂", score: 12 },
      { id: "hearing_loss",    label: "Hearing loss",              emoji: "🦻", score: 18 },
      { id: "sudden_onset",    label: "Started very suddenly",     emoji: "⚡", score: 25 },
      { id: "head_movement",   label: "Triggered by head movement",emoji: "↩️", score: 15 },
      { id: "no_association",  label: "None of these",             emoji: "✅", score: 0 },
    ],
  },

  // ── Skin ─────────────────────────────────────────────────────
  q_skin_1: {
    id: "q_skin_1",
    text: "Describe the skin rash or swelling:",
    type: "mcq",
    multiSelect: false,
    category: "dermatological",
    weight: 2,
    nextQuestionId: "q_skin_2",
    options: [
      { id: "hives",          label: "Hives / urticaria",           emoji: "🔴", score: 18 },
      { id: "spreading_red",  label: "Spreading red patches",       emoji: "📍", score: 20 },
      { id: "blisters",       label: "Blisters or oozing sores",    emoji: "🫧", score: 22 },
      { id: "swollen_face",   label: "Swollen face, lips, or tongue",emoji: "😮", score: 40, redFlag: true },
      { id: "localized",      label: "Small localized rash only",   emoji: "🔵", score: 10 },
    ],
  },

  q_skin_2: {
    id: "q_skin_2",
    text: "Have you been exposed to a new product, food, or insect bite recently?",
    type: "yesno",
    category: "dermatological",
    weight: 1,
    yesNextId: "q_duration",
    noNextId: "q_duration",
    options: [
      { id: "yes", label: "Yes — possible allergic trigger", score: 12 },
      { id: "no",  label: "No known trigger", score: 5 },
    ],
  },

  // ── Pain Scale (general) ────────────────────────────────────
  q_pain_scale: {
    id: "q_pain_scale",
    text: "On a scale of 1–10, how severe is your pain or discomfort right now?",
    subtext: "1 = barely noticeable, 10 = worst pain ever",
    type: "scale",
    category: "general",
    weight: 2,
    nextQuestionId: "q_duration",
  },

  // ── Mental Health ─────────────────────────────────────────────
  q_mental_1: {
    id: "q_mental_1",
    text: "How is your current mental state?",
    type: "mcq",
    multiSelect: true,
    category: "mental_health",
    weight: 2,
    nextQuestionId: "q_mental_2",
    options: [
      { id: "anxiety",          label: "Persistent anxiety or panic",  emoji: "😰", score: 18 },
      { id: "depression",       label: "Feeling hopeless or depressed",emoji: "😞", score: 20 },
      { id: "sleep_issues",     label: "Unable to sleep",              emoji: "😮‍💨", score: 12 },
      { id: "intrusive_thoughts",label: "Disturbing/intrusive thoughts",emoji: "🧠", score: 22 },
      { id: "self_harm",        label: "Thoughts of self-harm",        emoji: "🚨", score: 45, redFlag: true },
      { id: "overwhelmed",      label: "Feeling overwhelmed",          emoji: "😵", score: 15 },
    ],
  },

  q_mental_2: {
    id: "q_mental_2",
    text: "Have you recently experienced a traumatic event or major life change?",
    type: "yesno",
    category: "mental_health",
    weight: 1,
    yesNextId: "q_duration",
    noNextId: "q_duration",
    options: [
      { id: "yes", label: "Yes", score: 12 },
      { id: "no",  label: "No",  score: 0 },
    ],
  },

  // ── Common END questions ────────────────────────────────────
  q_duration: {
    id: "q_duration",
    text: "How long have you been experiencing these symptoms?",
    type: "mcq",
    multiSelect: false,
    category: "general",
    weight: 2,
    nextQuestionId: "q_severity",
    options: [
      { id: "hours",    label: "Less than 24 hours", emoji: "⏰", score: 5 },
      { id: "days",     label: "1–3 days",            emoji: "📅", score: 12 },
      { id: "week",     label: "4–7 days",             emoji: "📆", score: 15 },
      { id: "weeks",    label: "1–4 weeks",            emoji: "🗓️", score: 18 },
      { id: "months",   label: "More than a month",   emoji: "⌚", score: 22 },
    ],
  },

  q_severity: {
    id: "q_severity",
    text: "How much are these symptoms affecting your daily activities?",
    type: "mcq",
    multiSelect: false,
    category: "general",
    weight: 2,
    nextQuestionId: "q_medications",
    options: [
      { id: "mild",     label: "Mild — I can do everything normally", emoji: "✅", score: 5 },
      { id: "moderate", label: "Moderate — Some things are harder",   emoji: "⚠️", score: 18 },
      { id: "severe",   label: "Severe — Mostly unable to function",  emoji: "🚫", score: 30 },
      { id: "critical", label: "Critical — Cannot get out of bed",    emoji: "🛏️", score: 38 },
    ],
  },

  q_medications: {
    id: "q_medications",
    text: "Are you currently on any medications or have any known conditions?",
    type: "mcq",
    multiSelect: true,
    category: "general",
    weight: 1,
    nextQuestionId: "q_additional",
    options: [
      { id: "blood_thinners",   label: "Blood thinners (Warfarin etc.)", emoji: "💊", score: 10 },
      { id: "diabetes_meds",    label: "Diabetes medications",           emoji: "💉", score: 8 },
      { id: "heart_meds",       label: "Heart or BP medications",        emoji: "❤️", score: 10 },
      { id: "immunosuppressants",label:"Immunosuppressants",             emoji: "🛡️", score: 12 },
      { id: "no_medications",   label: "No medications / conditions",    emoji: "✅", score: 0 },
      { id: "other_meds",       label: "Other (please specify below)",   emoji: "📋", score: 5 },
    ],
  },

  q_additional: {
    id: "q_additional",
    text: "Is there anything else you'd like to add about your symptoms?",
    subtext: "Describe anything unusual — the more detail, the better",
    type: "text",
    category: "general",
    weight: 1,
    nextQuestionId: "q_final",
  },

  q_final: {
    id: "q_final",
    text: "Last question — have you experienced these exact symptoms before?",
    type: "mcq",
    multiSelect: false,
    category: "general",
    weight: 1,
    isTerminal: true,
    options: [
      { id: "first_time",   label: "No, this is the first time",       emoji: "🆕", score: 8 },
      { id: "recurring",    label: "Yes, similar episodes before",     emoji: "🔄", score: 12 },
      { id: "chronic",      label: "Yes, this is a chronic condition", emoji: "📋", score: 15 },
      { id: "worsening",    label: "Yes, but it's getting worse",      emoji: "📈", score: 20 },
    ],
  },
};

// ============================================================
// QUESTION ORDER — default linear flow (adaptive overrides)
// ============================================================
export const DEFAULT_QUESTION_IDS = [
  "q_age",
  "q_gender",
  "q_start",
  "q_duration",
  "q_severity",
  "q_medications",
  "q_additional",
  "q_final",
];

export function getQuestion(id: string): Question | undefined {
  return QUESTIONS[id];
}

export function getAllQuestions(): Question[] {
  return Object.values(QUESTIONS);
}

// Determine next question based on selected answer IDs
export function getNextQuestionId(
  question: Question,
  selectedOptionIds: string[]
): string | null {
  if (question.isTerminal) return null;

  // For yesno: check first selected option
  if (question.type === "yesno" && selectedOptionIds.length > 0) {
    const sel = selectedOptionIds[0];
    if (sel === "yes" && question.yesNextId) return question.yesNextId;
    if (sel === "no" && question.noNextId) return question.noNextId;
  }

  // For MCQ: check if any option has a specific nextQuestionId override
  if (question.type === "mcq" && !question.multiSelect && selectedOptionIds.length > 0) {
    const opt = question.options?.find((o) => o.id === selectedOptionIds[0]);
    if (opt?.nextQuestionId) return opt.nextQuestionId;
  }

  // Default next
  return question.nextQuestionId ?? null;
}

// Estimate total questions for the progress bar
export function estimateTotalQuestions(): number {
  return 10; // Reasonable average for adaptive flow
}
