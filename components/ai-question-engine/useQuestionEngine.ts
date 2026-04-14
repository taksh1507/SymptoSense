"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchNextQuestion } from "@/services/questionService";
import { matchVoiceToOption } from "@/utils/matchVoiceInput";
import { useSarvamTTS } from "./useSarvamTTS";
import { useSarvamSTT } from "./useSarvamSTT";
import { useSarvamTranslate } from "./useSarvamTranslate";
import { buildFinalOutput, isFlowComplete } from "./questionFlow";
import type { AnswerMap, EngineProps, Language, QuestionStep, QuestionContext } from "./types";

export interface QuestionEngineAPI {
  currentQuestion: QuestionStep | null;
  currentStep: number;
  totalSteps: number;
  progress: number;
  selectedOption: string | null;
  language: Language;
  toggleLanguage: () => void;
  isSpeaking: boolean;
  isRecording: boolean;
  isLoading: boolean;
  isComplete: boolean;
  voiceError: string | null;
  isMuted: boolean;
  toggleMute: () => void;
  handleAnswer: (value: string) => void;
  handleVoiceToggle: () => void;
  replayQuestion: () => void;
  reset: () => void;
}

const MAX_STEPS = 4; // Standardized flow depth

export function useQuestionEngine({
  initialSymptom,
  defaultLanguage = "en",
  onComplete,
}: EngineProps): QuestionEngineAPI {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionStep | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Persistence for Mute
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

  // Services Hooks
  const { speak: rawSpeak, stop, isSpeaking } = useSarvamTTS();
  const speak = useCallback((text: string, lang: Language) => {
    if (isMuted) return;
    rawSpeak(text, lang);
  }, [isMuted, rawSpeak]);

  const { startRecording, stopRecording, cancelRecording, isRecording, error: sttError } = useSarvamSTT();
  const { translate } = useSarvamTranslate();

  // Load next question (Dynamic or Fallback)
  const loadQuestion = useCallback(async (step: number, currentAnswers: AnswerMap) => {
    setIsLoading(true);
    const context: QuestionContext = {
      initialSymptom,
      answers: currentAnswers,
      currentStep: step,
      language,
    };
    
    const nextQ = await fetchNextQuestion(context);
    setCurrentQuestion(nextQ);
    setIsLoading(false);
  }, [initialSymptom, language]);

  // Initial load
  useEffect(() => {
    loadQuestion(0, {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // TTS Automation
  const lastSpokenRef = useRef<string>("");
  useEffect(() => {
    if (!currentQuestion || isComplete || isLoading) return;

    const stripEmojis = (str: string) => 
      str.replace(/(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g, "").trim();

    const text = stripEmojis(currentQuestion.question[language]);
    const opts = currentQuestion.options.map((o) => stripEmojis(o.label[language]));
    
    // Check for custom speech override
    const speechText = currentQuestion.options.map(o => o.speech?.[language]).filter(Boolean);
    const optionsToSpeak = speechText.length === opts.length ? speechText : opts;
    
    // Non-mutating: use slice instead of pop to avoid corrupting the array
    const lastOpt = optionsToSpeak[optionsToSpeak.length - 1];
    const restOpts = optionsToSpeak.slice(0, -1);
    const combinedText = language === "en"
      ? `${text}. You can choose: ${restOpts.join("... ")}, or ${lastOpt}.`
      : `${text}. आप चुन सकते हैं: ${restOpts.join("... ")}, या ${lastOpt}.`;

    if (combinedText === lastSpokenRef.current) return;
    lastSpokenRef.current = combinedText;
    speak(combinedText, language);

    return () => stop();
  }, [currentQuestion, language, isComplete, isLoading, speak, stop]);

  const handleAnswer = useCallback((value: string) => {
    if (!currentQuestion || isComplete) return;

    setSelectedOption(value);
    stop();

    const updatedAnswers = { ...answers, [currentQuestion.key]: value };
    setAnswers(updatedAnswers);

    setTimeout(async () => {
      const nextStep = currentStep + 1;
      if (nextStep >= MAX_STEPS || isFlowComplete(nextStep, initialSymptom)) {
        setIsComplete(true);
        onComplete(buildFinalOutput(initialSymptom, updatedAnswers, language));
      } else {
        setCurrentStep(nextStep);
        setSelectedOption(null);
        await loadQuestion(nextStep, updatedAnswers);
      }
    }, 400);
  }, [currentQuestion, isComplete, answers, currentStep, initialSymptom, onComplete, loadQuestion, stop]);

  const handleVoiceToggle = useCallback(async () => {
    if (!currentQuestion) return;
    if (isRecording) {
      setIsLoading(true);
      try {
        const transcript = await stopRecording();
        if (!transcript) return;

        let normalized = transcript;
        if (language === "hi") {
          normalized = await translate(transcript, "hi", "en");
        }

        const matched = matchVoiceToOption(normalized, currentQuestion, language);
        if (matched) {
          handleAnswer(matched);
        } else {
          const retryMessage = language === "en"
            ? "I didn't understand. Please choose from the options."
            : "मुझे समझ नहीं आया। कृपया विकल्पों में से चुनें।";
          setLocalError(retryMessage);
          speak(retryMessage, language);
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      setLocalError(null);
      await startRecording(language);
    }
  }, [isRecording, currentQuestion, language, stopRecording, startRecording, translate, handleAnswer, speak]);

  const replayQuestion = useCallback(() => {
    if (!currentQuestion) return;
    lastSpokenRef.current = "";
    const text = currentQuestion.question[language];
    speak(text, language);
  }, [currentQuestion, language, speak]);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setAnswers({});
    setIsComplete(false);
    setSelectedOption(null);
    setLocalError(null);
    loadQuestion(0, {});
  }, [loadQuestion]);

  const toggleLanguage = useCallback(() => {
    cancelRecording();
    stop();
    lastSpokenRef.current = "";
    setLanguage((prev) => (prev === "en" ? "hi" : "en"));
  }, [cancelRecording, stop]);

  return {
    currentQuestion,
    currentStep,
    totalSteps: MAX_STEPS,
    progress: Math.round((currentStep / MAX_STEPS) * 100),
    selectedOption,
    language,
    toggleLanguage,
    isSpeaking,
    isRecording,
    isLoading,
    isComplete,
    voiceError: localError || sttError,
    isMuted,
    toggleMute,
    handleAnswer,
    handleVoiceToggle,
    replayQuestion,
    reset,
  };
}
