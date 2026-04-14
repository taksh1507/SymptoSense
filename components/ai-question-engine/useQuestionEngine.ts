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
import type { AnswerMap, EngineProps, Language, QuestionStep, QuestionContext } from "./types";

export interface QuestionEngineAPI {
  currentQuestion: QuestionStep | null;
  currentStep: number;           // 0-10 (display)
  totalSteps: number;            // 11
  progress: number;
  stage: FlowStage;
  selectedOptions: string[];     // supports multiselect
  customInput: string;           // "other" text field value
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
  onCancel,
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

  // Accumulated answers
  const [age, setAge] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState<string | undefined>();
  const [aiAnswers, setAiAnswers] = useState<AnswerMap>({});
  const [currentAiStep, setCurrentAiStep] = useState(0);
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState("");
  const [medications, setMedications] = useState<string[]>([]);
  const [customMedication, setCustomMedication] = useState<string | undefined>();

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
  const loadAIQuestion = useCallback(async (aiStep: number, currentAiAnswers: AnswerMap) => {
    setIsLoading(true);
    const context: QuestionContext = {
      age,
      symptoms,
      customSymptom,
      aiAnswers: currentAiAnswers,
      currentAiStep: aiStep,
      language,
    };
    const q = await fetchAIQuestion(context);
    setCurrentQuestion(q);
    setSelectedOptions([]);
    setCustomInput("");
    setCustomInputError(null);
    setShowCustomInput(false);
    setIsLoading(false);
  }, [age, symptoms, customSymptom, language]);

  // Initial load
  useEffect(() => {
    loadStaticQuestion("q1_age");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // TTS on question change
  const lastSpokenRef = useRef<string>("");
  useEffect(() => {
    if (!currentQuestion || isComplete || isLoading) return;
    const text = currentQuestion.question[language];
    if (text === lastSpokenRef.current) return;
    lastSpokenRef.current = text;
    speak(text, language);
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
      setCurrentStep(2);
      setStage("ai_questions");
      setCurrentAiStep(0);
      await loadAIQuestion(0, {});

    } else if (stage === "ai_questions") {
      if (selectedOptions.length === 0) return;
      const key = currentQuestion.key;
      const value = selectedOptions.join(",");
      const updatedAiAnswers = { ...aiAnswers, [key]: value };
      setAiAnswers(updatedAiAnswers);

      const nextAiStep = currentAiStep + 1;
      if (nextAiStep >= AI_QUESTION_COUNT) {
        // Move to Q9
        setCurrentStep(8);
        setStage("q9_duration");
        loadStaticQuestion("q9_duration");
      } else {
        setCurrentAiStep(nextAiStep);
        setCurrentStep(2 + nextAiStep);
        await loadAIQuestion(nextAiStep, updatedAiAnswers);
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
      setMedications(finalMeds);
      if (customInput.trim()) setCustomMedication(customInput.trim());

      setIsComplete(true);
      onComplete(buildFinalOutput(
        age,
        symptoms,
        customSymptom,
        aiAnswers,
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
    aiAnswers, currentAiStep, age, symptoms, customSymptom, duration, severity, language, onComplete,
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
        const matched = matchVoiceToOption(normalized, currentQuestion, language);
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
    speak(currentQuestion.question[language], language);
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
    setCurrentAiStep(0);
    setDuration("");
    setSeverity("");
    setMedications([]);
    setCustomMedication(undefined);
    setLocalError(null);
    loadStaticQuestion("q1_age");
  }, [loadStaticQuestion]);

  const toggleLanguage = useCallback(() => {
    cancelRecording();
    stop();
    lastSpokenRef.current = "";
    setLanguage((prev) => prev === "en" ? "hi" : prev === "hi" ? "mr" : "en");
  }, [cancelRecording, stop]);

  const canProceed =
    stage === "q2_symptoms" || stage === "q11_medications"
      ? selectedOptions.length > 0 || customInput.trim().length >= 3
      : selectedOptions.length > 0;

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
    handleOptionToggle,
    handleCustomInputChange,
    handleNext,
    handleVoiceToggle,
    replayQuestion,
    reset,
  };
}
