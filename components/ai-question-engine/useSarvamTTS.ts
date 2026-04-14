// ============================================================
// Module 3: useSarvamTTS.ts
// Text-to-Speech hook.
// Primary:  Sarvam AI /text-to-speech → base64 WAV playback
// Fallback: window.speechSynthesis (browser built-in)
// ============================================================

"use client";

import { useCallback, useRef, useState } from "react";
import type { Language } from "./types";

// Map our internal language code to Sarvam language codes
const SARVAM_LANG_CODE: Record<Language, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
};

const BROWSER_LANG_CODE: Record<Language, string> = {
  en: "en-US",
  hi: "hi-IN",
  mr: "mr-IN",
};

export interface UseSarvamTTSReturn {
  speak: (text: string, language: Language) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  error: string | null;
}

export function useSarvamTTS(): UseSarvamTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to current AudioContext so we can stop mid-playback
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Prevent infinite retry loops if API is consistently failing
  const lastFailedAtRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    // Stop Sarvam audio
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch {
        // already stopped
      }
      audioSourceRef.current = null;
    }
    // Stop browser synthesis
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speakViaBrowser = useCallback(
    (text: string, language: Language): Promise<void> => {
      return new Promise((resolve) => {
        if (typeof window === "undefined" || !window.speechSynthesis) {
          resolve(); // silent fail
          return;
        }

        window.speechSynthesis.cancel(); // cancel any ongoing speech

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = BROWSER_LANG_CODE[language];
        utterance.rate = 0.95;
        utterance.pitch = 1;

        // Try to find a matching voice for Hindi
        if (language === "hi") {
          const voices = window.speechSynthesis.getVoices();
          const hindiVoice = voices.find((v) => v.lang.startsWith("hi"));
          if (hindiVoice) utterance.voice = hindiVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          resolve(); // don't throw — silent fail
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    []
  );

  const speakViaSarvam = useCallback(
    async (text: string, language: Language): Promise<void> => {
      const response = await fetch("/api/sarvam/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: SARVAM_LANG_CODE[language] }),
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      const data = await response.json();
      const base64Audio: string = data.audio; // base64 WAV

      // Decode base64 → ArrayBuffer
      const binaryStr = atob(base64Audio);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      // Play via AudioContext
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      audioSourceRef.current = source;

      return new Promise((resolve) => {
        source.onended = () => {
          setIsSpeaking(false);
          audioSourceRef.current = null;
          resolve();
        };
        source.start();
        setIsSpeaking(true);
      });
    },
    []
  );

  const speak = useCallback(
    async (text: string, language: Language): Promise<void> => {
      if (!text.trim()) return;

      // Stop any ongoing speech first
      stop();
      setError(null);

      try {
        if (lastFailedAtRef.current !== null) {
          const timeSinceFailure = Date.now() - lastFailedAtRef.current;
          if (timeSinceFailure < 30000) {
            throw new Error("Skipping Sarvam API (waiting for 30s cooldown)");
          }
        }
        await speakViaSarvam(text, language);
        
        if (lastFailedAtRef.current !== null) {
          console.log("[TTS] Sarvam API recovered successfully.");
          lastFailedAtRef.current = null;
        }
      } catch (sarvamErr) {
        const timeSinceFailure = lastFailedAtRef.current ? Date.now() - lastFailedAtRef.current : 0;
        if (lastFailedAtRef.current === null || timeSinceFailure >= 30000) {
          console.warn("[TTS] Sarvam failed, falling back to browser:", sarvamErr);
        }
        lastFailedAtRef.current = Date.now();
        
        setError("Using browser TTS (Sarvam unavailable)");
        try {
          await speakViaBrowser(text, language);
        } catch (browserErr) {
          if (lastFailedAtRef.current === null || timeSinceFailure >= 30000) {
             console.warn("[TTS] Browser TTS also failed:", browserErr);
          }
          setIsSpeaking(false);
        }
      }
    },
    [stop, speakViaSarvam, speakViaBrowser]
  );

  return { speak, stop, isSpeaking, error };
}
