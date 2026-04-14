// Main landing page — demonstrates AIQuestionEngine with "fever" symptom
// and shows the structured output once complete.

"use client";

import { useState } from "react";
import { AIQuestionEngine } from "@/components/ai-question-engine/AIQuestionEngine";
import type { FinalAssessmentPayload } from "@/components/ai-question-engine/types";

export default function HomePage() {
  const [result, setResult] = useState<FinalAssessmentPayload | null>(null);
  const [activeSymptom, setActiveSymptom] = useState("fever");
  const [key, setKey] = useState(0); // remount engine on reset

  const symptoms = ["fever", "headache", "cough", "fatigue", "chest pain", "breathing difficulty"];

  function handleComplete(data: FinalAssessmentPayload) {
    setResult(data);
  }

  function handleReset() {
    setResult(null);
    setKey((k) => k + 1);
  }

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Hero header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-sm px-4 py-1.5 rounded-full mb-4">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          Powered by Sarvam AI
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
          SymptoSense
        </h1>
        <p className="text-white/60 text-lg max-w-md">
          AI-powered multilingual health assessment — English &amp; हिंदी
        </p>
      </div>

      {/* Symptom selector */}
      <div className="flex gap-2 flex-wrap justify-center mb-8">
        {symptoms.map((s) => (
          <button
            key={s}
            id={`symptom-${s}`}
            onClick={() => {
              setActiveSymptom(s);
              setResult(null);
              setKey((k) => k + 1);
            }}
            className={[
              "px-4 py-2 rounded-full text-sm font-medium capitalize transition-all duration-200",
              activeSymptom === s
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                : "bg-white/10 text-white/70 hover:bg-white/20 border border-white/10",
            ].join(" ")}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Engine */}
      <AIQuestionEngine
        key={key}
        initialSymptom={activeSymptom}
        defaultLanguage="en"
        onComplete={handleComplete}
      />

      {/* Result panel */}
      {result && (
        <div className="mt-8 w-full max-w-2xl bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-lg">📋 Structured Output</h2>
            <button
              id="reset-btn"
              onClick={handleReset}
              className="text-indigo-400 hover:text-indigo-300 text-sm border border-indigo-400/30 px-3 py-1 rounded-full hover:bg-indigo-400/10 transition-all"
            >
              Start Over
            </button>
          </div>
          <pre className="bg-gray-900 rounded-xl p-4 text-emerald-300 text-sm font-mono overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
          <p className="text-white/40 text-xs">
            This output is ready to send to your risk scoring engine via{" "}
            <code className="text-indigo-400">onComplete(data)</code>
          </p>
        </div>
      )}
    </main>
  );
}
