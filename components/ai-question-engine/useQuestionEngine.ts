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
import { calculateRisk } from "@/lib/ai-engine/scoring/engine";
import { collectSymptoms } from "@/lib/assessment/findings";

function computeInterimRisk(symptoms: string[], custom?: string, labels: string[] = []): RiskSnapshot {
  const findings = collectSymptoms(symptoms, custom, labels);
  const result = calculateRisk({ symptom: findings[0] ?? custom ?? 'general', symptoms: findings.length ? findings : ['general'], severity: 'mild', duration: '< 1 day' });
  return { urgency: result.urgency, score: result.score, isRedFlag: result.isRedFlag, factors: result.factors.map(f => f.label) };
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
    prevQuestions: { question: string; answer: string; category?: string }[],
    overrides?: { symptoms: string[]; customSymptom?: string; riskSnapshot: RiskSnapshot }
  ) => {
    const generation = ++questionGeneration.current;
    setIsLoading(true);
    const context: QuestionContext = {
      age,
      symptoms: overrides?.symptoms ?? symptoms,
      customSymptom: overrides?.customSymptom ?? customSymptom,
      aiAnswers: currentAiAnswers,
      previousQuestions: prevQuestions,
      currentAiStep: aiStep,
      language,
      gender,
      riskSnapshot: overrides?.riskSnapshot ?? riskSnapshot ?? undefined,
    };
    const q = await fetchAIQuestion(context);
    if (generation !== questionGeneration.current) return;
    setCurrentQuestion(q);
    setSelectedOptions([]);
    setCustomInput("");
    setCustomInputError(null);
    setShowCustomInput(false);
    setIsLoading(false);
  }, [age, symptoms, customSymptom, language, gender, riskSnapshot]);

  const questionGeneration = useRef(0);
  useEffect(() => () => { questionGeneration.current++; cancelRecording(); stop(); }, [cancelRecording, stop]);

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
      await loadAIQuestion(0, {}, [], { symptoms: finalSymptoms, customSymptom: customInput.trim() || undefined, riskSnapshot: interim });

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
      const updatedLabels = { ...aiAnswerLabels, [key]: answerLabel };
      const interim = computeInterimRisk(symptoms, customSymptom, Object.values(updatedLabels));
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
        await loadAIQuestion(nextAiStep, updatedAiAnswers, updatedPrevQuestions, { symptoms, customSymptom, riskSnapshot: interim });
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
    onComplete, previousQuestions, aiAnswerLabels,
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
      const transcript = await startRecording(language);
      if (transcript) {
        const normalized = language !== 'en' ? await translate(transcript, language, 'en') : transcript;
        const matched = matchVoiceToOption(normalized, currentQuestion);
        if (matched) handleOptionToggle(matched); else setLocalError('Please choose from the options.');
      }
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
    questionGeneration.current++;
    cancelRecording(); stop();
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
  }, [loadStaticQuestion, cancelRecording, stop]);

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
      duration || "< 1 day",
      severity || "mild",
      [],
      undefined,
      language
    ));
  }, [age, symptoms, customSymptom, aiAnswers, aiAnswerLabels, language, duration, severity, onComplete]);

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
