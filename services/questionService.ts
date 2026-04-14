import type { QuestionContext, QuestionStep } from "@/components/ai-question-engine/types";

/**
 * Question Service
 * Calls Gemini AI to generate dynamic follow-up questions (Q3-Q8).
 * Falls back to a generic static question if AI fails.
 */

const FALLBACK_QUESTIONS: QuestionStep[] = [
  {
    id: "fallback_1",
    key: "ai_q1",
    type: "mcq",
    question: {
      en: "Have you had similar symptoms before?",
      hi: "क्या आपको पहले भी ऐसे लक्षण हुए हैं?",
      mr: "तुम्हाला आधी असे लक्षणे झाले आहेत का?",
    },
    options: [
      { label: { en: "No, first time", hi: "नहीं, पहली बार", mr: "नाही, पहिल्यांदा" }, value: "first_time", emoji: "🆕" },
      { label: { en: "Yes, occasionally", hi: "हाँ, कभी-कभी", mr: "हो, कधी कधी" }, value: "occasional", emoji: "🔄" },
      { label: { en: "Yes, frequently", hi: "हाँ, अक्सर", mr: "हो, वारंवार" }, value: "frequent", emoji: "📈" },
    ],
  },
  {
    id: "fallback_2",
    key: "ai_q2",
    type: "mcq",
    question: {
      en: "Are your symptoms getting better, worse, or staying the same?",
      hi: "क्या आपके लक्षण बेहतर हो रहे हैं, बिगड़ रहे हैं, या वैसे ही हैं?",
      mr: "तुमची लक्षणे सुधारत आहेत, खालावत आहेत, की तशीच आहेत?",
    },
    options: [
      { label: { en: "Getting better", hi: "बेहतर हो रहे हैं", mr: "सुधारत आहेत" }, value: "improving", emoji: "📈" },
      { label: { en: "Staying the same", hi: "वैसे ही हैं", mr: "तशीच आहेत" }, value: "same", emoji: "➖" },
      { label: { en: "Getting worse", hi: "बिगड़ रहे हैं", mr: "खालावत आहेत" }, value: "worsening", emoji: "📉" },
    ],
  },
  {
    id: "fallback_3",
    key: "ai_q3",
    type: "mcq",
    question: {
      en: "Does anything make your symptoms better or worse?",
      hi: "क्या कोई चीज़ आपके लक्षणों को बेहतर या बदतर बनाती है?",
      mr: "कशामुळे तुमची लक्षणे बरी किंवा वाईट होतात का?",
    },
    options: [
      { label: { en: "Rest makes it better", hi: "आराम से बेहतर होता है", mr: "विश्रामाने बरे वाटते" }, value: "rest_helps", emoji: "🛌" },
      { label: { en: "Activity makes it worse", hi: "गतिविधि से बिगड़ता है", mr: "हालचालीने वाईट होते" }, value: "activity_worsens", emoji: "🏃" },
      { label: { en: "Food/drink affects it", hi: "खाने-पीने से असर होता है", mr: "खाण्या-पिण्याने फरक पडतो" }, value: "food_related", emoji: "🍽️" },
      { label: { en: "Nothing specific", hi: "कुछ खास नहीं", mr: "काही विशेष नाही" }, value: "nothing", emoji: "❓" },
    ],
  },
  {
    id: "fallback_4",
    key: "ai_q4",
    type: "mcq",
    question: {
      en: "Have you recently been in contact with someone who was sick?",
      hi: "क्या आप हाल ही में किसी बीमार व्यक्ति के संपर्क में आए हैं?",
      mr: "तुम्ही अलीकडे कोणत्या आजारी व्यक्तीच्या संपर्कात आलात का?",
    },
    options: [
      { label: { en: "Yes", hi: "हाँ", mr: "हो" }, value: "yes", emoji: "✅" },
      { label: { en: "No", hi: "नहीं", mr: "नाही" }, value: "no", emoji: "❌" },
      { label: { en: "Not sure", hi: "पक्का नहीं", mr: "नक्की नाही" }, value: "unsure", emoji: "❓" },
    ],
  },
  {
    id: "fallback_5",
    key: "ai_q5",
    type: "mcq",
    question: {
      en: "How is your appetite and sleep?",
      hi: "आपकी भूख और नींद कैसी है?",
      mr: "तुमची भूक आणि झोप कशी आहे?",
    },
    options: [
      { label: { en: "Normal", hi: "सामान्य", mr: "सामान्य" }, value: "normal", emoji: "✅" },
      { label: { en: "Reduced appetite", hi: "भूख कम है", mr: "भूक कमी आहे" }, value: "low_appetite", emoji: "🍽️" },
      { label: { en: "Poor sleep", hi: "नींद खराब है", mr: "झोप नीट नाही" }, value: "poor_sleep", emoji: "😴" },
      { label: { en: "Both affected", hi: "दोनों प्रभावित हैं", mr: "दोन्ही प्रभावित आहेत" }, value: "both_affected", emoji: "😟" },
    ],
  },
  {
    id: "fallback_6",
    key: "ai_q6",
    type: "mcq",
    question: {
      en: "Have you taken any medication for these symptoms?",
      hi: "क्या आपने इन लक्षणों के लिए कोई दवाई ली है?",
      mr: "तुम्ही या लक्षणांसाठी कोणती औषधे घेतली आहेत का?",
    },
    options: [
      { label: { en: "No medication taken", hi: "कोई दवाई नहीं ली", mr: "कोणतीही औषधे घेतली नाहीत" }, value: "none", emoji: "❌" },
      { label: { en: "Paracetamol / Painkiller", hi: "पैरासिटामोल / दर्द निवारक", mr: "पॅरासिटामोल / वेदनाशामक" }, value: "painkiller", emoji: "💊" },
      { label: { en: "Prescribed medication", hi: "डॉक्टर की दवाई", mr: "डॉक्टरांनी दिलेली औषधे" }, value: "prescribed", emoji: "🏥" },
      { label: { en: "Home remedies", hi: "घरेलू उपाय", mr: "घरगुती उपाय" }, value: "home_remedy", emoji: "🌿" },
    ],
  },
];

export async function fetchAIQuestion(
  context: QuestionContext
): Promise<QuestionStep> {
  const fallback = FALLBACK_QUESTIONS[context.currentAiStep] ?? FALLBACK_QUESTIONS[0];

  try {
    const response = await fetch("/api/question-gen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error("AI generation failed");

    const question: QuestionStep = await response.json();

    if (question?.question?.en && question?.options?.length > 0) {
      // Ensure mr field exists (Gemini might miss it)
      if (!question.question.mr) question.question.mr = question.question.hi;
      question.options = question.options.map((o) => ({
        ...o,
        label: {
          en: o.label.en,
          hi: o.label.hi,
          mr: o.label.mr || o.label.hi,
        },
      }));
      return question;
    }

    throw new Error("Invalid question format");
  } catch (err) {
    console.warn(`[QuestionService] AI failed for step ${context.currentAiStep}, using fallback:`, err);
    return fallback;
  }
}
