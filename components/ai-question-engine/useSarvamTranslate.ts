// ============================================================
// Module 5: useSarvamTranslate.ts
// Translation hook.
// Primary:  Sarvam AI /translate
// Fallback: Return original text unchanged (graceful degradation)
//
// NOTE: Translation is used ONLY to normalize voice input (Hindi
// voice → English option value). Question display uses bilingual
// text pre-baked into questionFlow.ts — no API needed for that.
// ============================================================

"use client";

import { useCallback, useState } from "react";
import type { Language } from "./types";

const SARVAM_LANG_CODE: Record<Language, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
};

export interface UseSarvamTranslateReturn {
  translate: (text: string, from: Language, to: Language) => Promise<string>;
  isTranslating: boolean;
  error: string | null;
}

export function useSarvamTranslate(): UseSarvamTranslateReturn {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(
    async (text: string, from: Language, to: Language): Promise<string> => {
      if (!text.trim()) return text;
      if (from === to) return text; // no-op

      setIsTranslating(true);
      setError(null);

      try {
        const response = await fetch("/api/sarvam/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            from: SARVAM_LANG_CODE[from],
            to: SARVAM_LANG_CODE[to],
          }),
        });

        if (!response.ok) {
          throw new Error(`Translate API error: ${response.status}`);
        }

        const data = await response.json();
        return data.translated_text ?? text;
      } catch (err) {
        console.warn("[Translate] Sarvam failed, returning original:", err);
        setError("Translation unavailable — using original text");
        return text; // graceful degradation: return original
      } finally {
        setIsTranslating(false);
      }
    },
    []
  );

  return { translate, isTranslating, error };
}
