// ============================================================
// Module 4: useSarvamSTT.ts
// Speech-to-Text hook.
// Primary:  Sarvam AI /speech-to-text → transcription
// Fallback: window.SpeechRecognition (browser built-in)
// ============================================================

"use client";

import { useCallback, useRef, useState } from "react";
import type { Language } from "./types";

// Type definitions for experimental Web Speech API
interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

const SARVAM_LANG_CODE: Record<Language, string> = {
  en: "en-IN",
  hi: "hi-IN",
};

const BROWSER_LANG_CODE: Record<Language, string> = {
  en: "en-US",
  hi: "hi-IN",
};

export interface UseSarvamSTTReturn {
  startRecording: (language: Language) => Promise<void>;
  stopRecording: () => Promise<string>;
  cancelRecording: () => void;
  isRecording: boolean;
  transcript: string;
  error: string | null;
  hasMicPermission: boolean | null; // null = unknown, true/false = determined
}

export function useSarvamSTT(): UseSarvamSTTReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);

  // Prevent infinite retry loops if API is consistently failing
  const lastFailedAtRef = useRef<number | null>(null);

  // MediaRecorder approach (for Sarvam API upload)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const activeLanguageRef = useRef<Language>("en");

  // Browser SpeechRecognition fallback
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // ---- Sarvam flow ----

  const startMediaRecorder = useCallback(
    async (language: Language): Promise<void> => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        setHasMicPermission(true);

        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorderRef.current = recorder;
        activeLanguageRef.current = language;
        recorder.start(100); // collect chunks every 100ms
        setIsRecording(true);
        setError(null);
      } catch (err) {
        setHasMicPermission(false);
        setError("Microphone permission denied");
        throw err;
      }
    },
    []
  );

  const stopMediaRecorder = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve("");
        return;
      }

      recorder.onstop = async () => {
        // Stop all tracks
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setIsRecording(false);

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];

        try {
          const formData = new FormData();
          formData.append("file", audioBlob, "recording.webm");
          formData.append("language", SARVAM_LANG_CODE[activeLanguageRef.current]);

          const response = await fetch("/api/sarvam/stt", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) throw new Error(`STT API ${response.status}`);

          const data = await response.json();
          const text: string = data.transcript ?? "";
          setTranscript(text);
          resolve(text);
        } catch (err) {
          const timeSinceFailure = lastFailedAtRef.current ? Date.now() - lastFailedAtRef.current : 0;
          if (lastFailedAtRef.current === null || timeSinceFailure >= 30000) {
            console.warn("[STT] Sarvam failed:", err);
          }
          lastFailedAtRef.current = Date.now();
          setError("Using browser STT (Sarvam unavailable)");
          resolve(""); // browser fallback is handled separately
        }
      };

      recorder.stop();
    });
  }, []);

  // ---- Browser SpeechRecognition fallback ----

  const startBrowserSTT = useCallback(
    (language: Language): Promise<string> => {
      return new Promise((resolve, reject) => {
        const SpeechRecognition =
          (typeof window !== "undefined" &&
            ((window as any).SpeechRecognition ||
              (window as any).webkitSpeechRecognition)) as SpeechRecognitionStatic ||
          null;

        if (!SpeechRecognition) {
          reject(new Error("SpeechRecognition not supported"));
          return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = BROWSER_LANG_CODE[language];
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;

        recognitionRef.current = recognition;
        setIsRecording(true);
        setError(null);

        recognition.onresult = (event) => {
          const text = event.results[0]?.[0]?.transcript ?? "";
          setTranscript(text);
          setIsRecording(false);
          resolve(text);
        };

        recognition.onerror = (event) => {
          setIsRecording(false);
          reject(new Error(event.error));
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
      });
    },
    []
  );

  // ---- Public API ----

  const startRecording = useCallback(
    async (language: Language): Promise<void> => {
      // Check if Sarvam is in cooldown
      const isCooldown = lastFailedAtRef.current !== null && 
        (Date.now() - lastFailedAtRef.current) < 30000;
      
      if (isCooldown) {
        // Cooldown active — go directly to browser STT (not a mic issue)
        console.log("[STT] Sarvam in cooldown, using browser STT directly.");
        setError("Using browser STT (Sarvam in cooldown)");
        try {
          await startBrowserSTT(language);
        } catch (browserErr) {
          setError("Voice input not available");
          console.warn("[STT] Browser STT also failed:", browserErr);
        }
        return;
      }
      
      try {
        await startMediaRecorder(language);
        
        if (lastFailedAtRef.current !== null) {
          console.log("[STT] Sarvam API recovered successfully.");
          lastFailedAtRef.current = null;
        }
      } catch (micErr) {
        // Genuine mic permission denied — try browser STT (it has its own permission flow)
        console.warn("[STT] Mic access failed, trying browser STT:", micErr);
        try {
          await startBrowserSTT(language);
        } catch (browserErr) {
          setError("Voice input not available");
          console.warn("[STT] All methods failed:", browserErr);
        }
      }
    },
    [startMediaRecorder, startBrowserSTT]
  );

  const stopRecording = useCallback(async (): Promise<string> => {
    // If MediaRecorder is running, stop it (returns transcript from Sarvam)
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      const text = await stopMediaRecorder();
      // Return whatever we got — empty string triggers retry flow in handleVoiceToggle
      // Do NOT auto-start a new browser STT here (user already stopped talking)
      return text;
    }

    // If browser recognition is running, stop it
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    return transcript;
  }, [stopMediaRecorder, transcript]);

  const cancelRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setTranscript("");
  }, []);

  return {
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording,
    transcript,
    error,
    hasMicPermission,
  };
}
