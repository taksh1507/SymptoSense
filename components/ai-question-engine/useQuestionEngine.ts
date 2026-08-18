"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAIQuestion } from "@/services/questionService";
import { matchVoiceToOption } from "@/utils/matchVoiceInput";
import { useSarvamTTS } from "./useSarvamTTS";
import { useSarvamSTT } from "./useSarvamSTT";
import { useSarvamTranslate } from "./useSarvamTranslate";
import {
  getStaticQuestion,
  buildFinalOutput,
  TOTAL_STEPS,
  AI_QUESTION_COUNT,
  type FlowStage,
} from "./questionFlow";
import type { AnswerMap, EngineProps, Language, QuestionStep, QuestionContext, RiskSnapshot } from "./types";
import { SCORING_DATASET } from "@/lib/ai-engine/scoring/rules";

const FEMALE_ONLY: string[] = [
  'delayed_periods', 'missed_period', 'menstrual_pain', 'vaginal_discharge',
  'pelvic_pain', 'pregnancy_symptoms', 'menstruation', 'period', 'ovarian',
];
const MALE_ONLY: string[] = [
  'testicular_torsion', 'testicular_pain', 'scrotal_pain', 'prostate',
  'erectile', 'penile',
];

// High-acuity symptom values selectable in Q2 that are treated as red flags
// immediately (their free-text aliases are caught by SCORING_DATASET.redFlags).
const RED_FLAG_SYMPTOM_VALUES: string[] = ["chest_pain", "breathlessness"];

// Interim risk estimation from early answers (before severity/duration are asked).
function computeInterimRisk(symptoms: string[], custom?: string): RiskSnapshot {
  const values = [...symptoms, ...(custom ? [custom] : [])];
  const text = values.join(" ").replace(/_/g, " ").toLowerCase();

  const flaggedValue = symptoms.find((s) => RED_FLAG_SYMPTOM_VALUES.includes(s));
  const flaggedText = flaggedValue
    ? flaggedValue.replace(/_/g, " ")
    : SCORING_DATASET.redFlags.find((flag) => text.includes(flag));

  if (flaggedText) {
    return {
      urgency: "High",
      score: 100,
      isRedFlag: true,
      factors: [`Red flag: ${flaggedText}`],
    };
  }

  const primary = symptoms[0] ?? custom ?? "general";
  const baseScore =
    SCORING_DATASET.symptoms[primary] ??
    SCORING_DATASET.symptoms[primary.replace(/_/g, " ")] ??
    15;
  const additional = symptoms[1];
  const additionalScore = additional
    ? SCORING_DATASET.additionalSymptoms[additional] ??
      SCORING_DATASET.additionalSymptoms[additional.replace(/_/g, " ")] ??
      SCORING_DATASET.symptoms[additional] ??
      10
    : symptoms.length > 1
      ? 10
      : 0;

  const score = Math.min(100, baseScore + additionalScore);
  const urgency = score >= 55 ? "High" : score >= 28 ? "Medium" : "Low";

  const factors: string[] = [`${primary.replace(/_/g, " ")} (base ${baseScore})`];
  if (additional) factors.push(`${additional.replace(/_/g, " ")} (${additionalScore})`);

  return { urgency, score, isRedFlag: false, factors };
}

export interface QuestionEngineAPI {
  currentQuestion: QuestionStep | null;
  currentStep: number;
  totalSteps: number;
  progress: number;
  stage: FlowStage;
  selectedOptions: string[];
  customInput: string;
  customInputError: string | null;
  showCustomInput: boolean;
  language: Language;
  toggleLanguage: () => void;
  isSpeaking: boolean;
  isRecording: boolean;
  isLoading: boolean;
  isComplete: boolean;
  voiceError: string | null;
  isMuted: boolean;
  toggleMute: () => void;
  genderMismatch: { symptom: string; gender: string } | null; // non-null = show warning popup
  dismissMismatch: () => void;
  riskSnapshot: RiskSnapshot | null;
  redFlagPending: boolean;
  acknowledgeRedFlag: () => void;
  handleOptionToggle: (value: string) => void;
  handleCustomInputChange: (text: string) => void;
  handleNext: () => void;
  handleVoiceToggle: () => void;
  replayQuestion: () => void;
  reset: () => void;
}

export function useQuestionEngine({
  defaultLanguage = "en",
  onComplete,
  gender,
}: EngineProps): QuestionEngineAPI {
  const [stage, setStage] = useState<FlowStage>("q1_age");
  const [currentStep, setCurrentStep] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionStep | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [customInputError, setCustomInputError] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [genderMismatch, setGenderMismatch] = useState<{ symptom: string; gender: string } | null>(null);
  const [riskSnapshot, setRiskSnapshot] = useState<RiskSnapshot | null>(null);
  const [redFlagPending, setRedFlagPending] = useState(false);

  // Gender-symptom mismatch lookup tables
  const checkGenderMismatch = useCallback((selectedSymptoms: string[], custom?: string): { symptom: string; gender: string } | null => {
    if (!gender || gender === 'Other' || gender === 'Prefer not to say') return null;
    const tokens = [...selectedSymptoms, custom || ''].join(' ').toLowerCase();
    if (gender === 'Male') {
      const hit = FEMALE_ONLY.find(s => tokens.includes(s));
      if (hit) return { symptom: hit.replace(/_/g, ' '), gender: 'Male' };
    }
    if (gender === 'Female') {
      const hit = MALE_ONLY.find(s => tokens.includes(s));
      if (hit) return { symptom: hit.replace(/_/g, ' '), gender: 'Female' };
    }
    return null;
  }, [gender]);

  const dismissMismatch = useCallback(() => setGenderMismatch(null), []);

  // Accumulated answers
  const [age, setAge] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState<string | undefined>();
  const [aiAnswers, setAiAnswers] = useState<AnswerMap>({});
  const [aiAnswerLabels, setAiAnswerLabels] = useState<AnswerMap>({});
  const [previousQuestions, setPreviousQuestions] = useState<{ question: string; answer: string; category?: string }[]>([]);
  const [currentAiStep, setCurrentAiStep] = useState(0);
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState("");

  // Mute persistence
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("symptosense_muted") === "true";
      if (saved) setIsMuted(true);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem("symptosense_muted", String(next));
      return next;
    });
  }, []);

  // Sarvam services
  const { speak: rawSpeak, stop, isSpeaking } = useSarvamTTS();
  const speak = useCallback((text: string, lang: Language) => {
    if (isMuted) return;
    rawSpeak(text, lang);
  }, [isMuted, rawSpeak]);

  const { startRecording, stopRecording, cancelRecording, isRecording, error: sttError } = useSarvamSTT();
  const { translate } = useSarvamTranslate();

  // Load a static question
  const loadStaticQuestion = useCallback((s: FlowStage) => {
    const q = getStaticQuestion(s);
    setCurrentQuestion(q);
    setSelectedOptions([]);
    setCustomInput("");
    setCustomInputError(null);
    setShowCustomInput(false);
  }, []);

  // Load an AI question
  const loadAIQuestion = useCallback(async (
    aiStep: number,
    currentAiAnswers: AnswerMap,
    prevQuestions: { question: string; answer: string; category?: string }[]
  ) => {
    setIsLoading(true);
    const context: QuestionContext = {
      age,
      symptoms,
      customSymptom,
      aiAnswers: currentAiAnswers,
      previousQuestions: prevQuestions,
      currentAiStep: aiStep,
      language,
      gender,
      riskSnapshot: riskSnapshot ?? undefined,
    };
    const q = await fetchAIQuestion(context);
    setCurrentQuestion(q);
    setSelectedOptions([]);
    setCustomInput("");
    setCustomInputError(null);
    setShowCustomInput(false);
    setIsLoading(false);
  }, [age, symptoms, customSymptom, language, gender, riskSnapshot]);

  // Initial load
  useEffect(() => {
    loadStaticQuestion("q1_age");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // TTS on question change — reads question then each option as one utterance
  const lastSpokenRef = useRef<string>("");
  useEffect(() => {
    if (!currentQuestion || isComplete || isLoading) return;
    const questionText = currentQuestion.question[language];
    if (questionText === lastSpokenRef.current) return;
    lastSpokenRef.current = questionText;

    // Build a single string: question + numbered options separated by pauses
    const optionLabels = currentQuestion.options.map(
      (opt, i) => `${i + 1}. ${opt.speech?.[language] ?? opt.label[language]}`
    );
    const fullText = [questionText, ...optionLabels].join(". ");

    speak(fullText, language);
    return () => stop();
  }, [currentQuestion, language, isComplete, isLoading, speak, stop]);

  // ── Option toggle (handles single/multi select) ──────────────
  const handleOptionToggle = useCallback((value: string) => {
    if (!currentQuestion) return;

    const isSingle = currentQuestion.singleSelect || currentQuestion.type === "mcq";

    if (value === "other") {
      setShowCustomInput((prev) => !prev);
      return;
    }

    if (isSingle) {
      setSelectedOptions([value]);
      setShowCustomInput(false);
    } else {
      setSelectedOptions((prev) => {
        if (value === "none") return ["none"];
        const filtered = prev.filter((v) => v !== "none");
        return prev.includes(value)
          ? filtered.filter((v) => v !== value)
          : [...filtered, value];
      });
    }
  }, [currentQuestion]);

  // ── Custom input validation ───────────────────────────────────
  const validateCustomInput = useCallback((text: string): boolean => {
    const trimmed = text.trim();
    if (trimmed.length < 3) {
      setCustomInputError(
        language === "hi" ? "कृपया कम से कम 3 अक्षर लिखें।"
        : language === "mr" ? "कृपया किमान 3 अक्षरे लिहा."
        : "Please enter at least 3 characters."
      );
      return false;
    }
    if (/^[^a-zA-Z\u0900-\u097F\u0980-\u09FF]+$/.test(trimmed)) {
      setCustomInputError(
        language === "hi" ? "कृपया एक वैध लक्षण या स्थिति दर्ज करें।"
        : language === "mr" ? "कृपया एक वैध लक्षण किंवा स्थिती प्रविष्ट करा."
        : "Please enter a valid symptom or condition."
      );
      return false;
    }
    setCustomInputError(null);
    return true;
  }, [language]);

  const handleCustomInputChange = useCallback((text: string) => {
    setCustomInput(text);
    if (customInputError) setCustomInputError(null);
  }, [customInputError]);

  // ── Advance to next stage ─────────────────────────────────────
  const handleNext = useCallback(async () => {
    if (!currentQuestion) return;

    // Validate custom input if shown
    if (showCustomInput && customInput.trim()) {
      if (!validateCustomInput(customInput)) return;
    }

    stop();

    // Save answer based on current stage
    if (stage === "q1_age") {
      if (selectedOptions.length === 0) return;
      setAge(selectedOptions[0]);
      setCurrentStep(1);
      setStage("q2_symptoms");
      loadStaticQuestion("q2_symptoms");

    } else if (stage === "q2_symptoms") {
      if (selectedOptions.length === 0 && !customInput.trim()) return;
      const finalSymptoms = selectedOptions.filter((v) => v !== "other");

      // Check for gender-symptom mismatch before proceeding
      const mismatch = checkGenderMismatch(finalSymptoms, customInput.trim() || undefined);
      if (mismatch) {
        setGenderMismatch(mismatch);
        return; // block progression — popup will show
      }

      setSymptoms(finalSymptoms);
      if (customInput.trim()) setCustomSymptom(customInput.trim());

      // ── Live risk snapshot: short-circuit on red flags ──────────
      const interim = computeInterimRisk(finalSymptoms, customInput.trim() || undefined);
      setRiskSnapshot(interim);
      if (interim.isRedFlag) {
        setRedFlagPending(true);
        return; // UI shows the urgent-care interstitial next
      }

      setCurrentStep(2);
      setStage("ai_questions");
      setCurrentAiStep(0);
      await loadAIQuestion(0, {}, []);

    } else if (stage === "ai_questions") {
      if (selectedOptions.length === 0) return;
      const key = currentQuestion.key;
      const value = selectedOptions.join(",");
      const updatedAiAnswers = { ...aiAnswers, [key]: value };
      setAiAnswers(updatedAiAnswers);

      // Record the full question text + answer for context
      const answerLabel = currentQuestion.options
        .filter(o => selectedOptions.includes(o.value))
        .map(o => o.label.en)
        .join(", ") || value;
      const updatedPrevQuestions = [
        ...previousQuestions,
        {
          question: currentQuestion.question.en,
          answer: answerLabel,
          category: currentQuestion.category,
        },
      ];
      setPreviousQuestions(updatedPrevQuestions);
      setAiAnswerLabels((prev) => ({ ...prev, [key]: answerLabel }));

      // ── Re-check interim risk after each adaptive answer ────────
      const interim = computeInterimRisk(symptoms, customSymptom);
      if (interim.isRedFlag) {
        setRiskSnapshot(interim);
        setRedFlagPending(true);
        return; // short-circuit to the urgent-care interstitial
      }
      setRiskSnapshot(interim);

      const nextAiStep = currentAiStep + 1;
      if (nextAiStep >= AI_QUESTION_COUNT) {
        setCurrentStep(8);
        setStage("q9_duration");
        loadStaticQuestion("q9_duration");
      } else {
        setCurrentAiStep(nextAiStep);
        setCurrentStep(2 + nextAiStep);
        await loadAIQuestion(nextAiStep, updatedAiAnswers, updatedPrevQuestions);
      }

    } else if (stage === "q9_duration") {
      if (selectedOptions.length === 0) return;
      setDuration(selectedOptions[0]);
      setCurrentStep(9);
      setStage("q10_severity");
      loadStaticQuestion("q10_severity");

    } else if (stage === "q10_severity") {
      if (selectedOptions.length === 0) return;
      setSeverity(selectedOptions[0]);
      setCurrentStep(10);
      setStage("q11_medications");
      loadStaticQuestion("q11_medications");

    } else if (stage === "q11_medications") {
      const finalMeds = selectedOptions.filter((v) => v !== "other");

      setIsComplete(true);
      onComplete(buildFinalOutput(
        age,
        symptoms,
        customSymptom,
        aiAnswers,
        aiAnswerLabels,
        duration,
        severity,
        finalMeds,
        customInput.trim() || undefined,
        language
      ));
    }
  }, [
    currentQuestion, stage, selectedOptions, customInput, showCustomInput,
    validateCustomInput, stop, loadStaticQuestion, loadAIQuestion,
    aiAnswers, currentAiStep, age, symptoms, customSymptom, duration, severity, language,
    onComplete, checkGenderMismatch, previousQuestions, aiAnswerLabels,
  ]);

  // ── Voice toggle ──────────────────────────────────────────────
  const handleVoiceToggle = useCallback(async () => {
    if (!currentQuestion) return;
    if (isRecording) {
      setIsLoading(true);
      try {
        const transcript = await stopRecording();
        if (!transcript) return;
        let normalized = transcript;
        if (language !== "en") {
          normalized = await translate(transcript, language, "en");
        }
        const matched = matchVoiceToOption(normalized, currentQuestion);
        if (matched) {
          handleOptionToggle(matched);
        } else {
          const msg = language === "en"
            ? "I didn't understand. Please choose from the options."
            : language === "hi"
            ? "मुझे समझ नहीं आया। कृपया विकल्पों में से चुनें।"
            : "मला समजले नाही. कृपया पर्यायांमधून निवडा.";
          setLocalError(msg);
          speak(msg, language);
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      setLocalError(null);
      await startRecording(language);
    }
  }, [isRecording, currentQuestion, language, stopRecording, startRecording, translate, handleOptionToggle, speak]);

  const replayQuestion = useCallback(() => {
    if (!currentQuestion) return;
    lastSpokenRef.current = "";
    const questionText = currentQuestion.question[language];
    const optionLabels = currentQuestion.options.map(
      (opt, i) => `${i + 1}. ${opt.speech?.[language] ?? opt.label[language]}`
    );
    speak([questionText, ...optionLabels].join(". "), language);
  }, [currentQuestion, language, speak]);

  const reset = useCallback(() => {
    setStage("q1_age");
    setCurrentStep(0);
    setSelectedOptions([]);
    setCustomInput("");
    setCustomInputError(null);
    setShowCustomInput(false);
    setIsComplete(false);
    setAge("");
    setSymptoms([]);
    setCustomSymptom(undefined);
    setAiAnswers({});
    setAiAnswerLabels({});
    setCurrentAiStep(0);
    setPreviousQuestions([]);
    setDuration("");
    setSeverity("");
    setLocalError(null);
    setRiskSnapshot(null);
    setRedFlagPending(false);
    loadStaticQuestion("q1_age");
  }, [loadStaticQuestion]);

  // ── Red-flag short-circuit: finish the assessment immediately ──
  // The deterministic engine already judged this High/emergency, so we skip
  // the remaining adaptive + static questions and let AppContext produce the
  // emergency result (severity defaults to "severe" to keep scoring consistent).
  const acknowledgeRedFlag = useCallback(() => {
    setIsComplete(true);
    setRedFlagPending(false);
    onComplete(buildFinalOutput(
      age,
      symptoms,
      customSymptom,
      aiAnswers,
      aiAnswerLabels,
      "< 1 day",
      "severe",
      [],
      undefined,
      language
    ));
  }, [age, symptoms, customSymptom, aiAnswers, aiAnswerLabels, language, onComplete]);

  const toggleLanguage = useCallback(() => {
    cancelRecording();
    stop();
    lastSpokenRef.current = "";
    setLanguage((prev) => prev === "en" ? "hi" : prev === "hi" ? "mr" : "en");
  }, [cancelRecording, stop]);

  return {
    currentQuestion,
    currentStep,
    totalSteps: TOTAL_STEPS,
    progress: Math.round((currentStep / TOTAL_STEPS) * 100),
    stage,
    selectedOptions,
    customInput,
    customInputError,
    showCustomInput,
    language,
    toggleLanguage,
    isSpeaking,
    isRecording,
    isLoading,
    isComplete,
    voiceError: localError || sttError,
    isMuted,
    toggleMute,
    genderMismatch,
    dismissMismatch,
    riskSnapshot,
    redFlagPending,
    acknowledgeRedFlag,
    handleOptionToggle,
    handleCustomInputChange,
    handleNext,
    handleVoiceToggle,
    replayQuestion,
    reset,
  };
}
