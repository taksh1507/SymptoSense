// ============================================================
// Module: AIQuestionEngine.tsx
// Pure UI component — consumes useQuestionEngine hook.
// Optimized for production-ready, plug-and-play integration.
// ============================================================

"use client";

import React from "react";
import { useQuestionEngine } from "./useQuestionEngine";
import type { EngineProps } from "./types";

// ---- Sub-components ----

function ProgressBar({
  current,
  total,
  progress,
}: {
  current: number;
  total: number;
  progress: number;
}) {
  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-indigo-300 font-medium tracking-wide">
          Step {current + 1} of {total}
        </span>
        <span className="text-indigo-400 font-bold">{progress}% completion</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden shadow-inner">
        <div
          className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.65,0,0.35,1)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function MuteToggle({ isMuted, onToggle }: { isMuted: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center justify-center w-10 h-10 rounded-full border border-white/20 transition-all duration-200 hover:scale-110 active:scale-90 shadow-lg backdrop-blur-md ${
        isMuted ? "bg-red-500/20 text-red-200" : "bg-white/10 text-white"
      }`}
      aria-label={isMuted ? "Unmute audio" : "Mute audio"}
    >
      <span className="text-lg">{isMuted ? "🔇" : "🔊"}</span>
    </button>
  );
}

function LanguageToggle({ language, onToggle }: { language: "en" | "hi"; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all duration-200 hover:scale-105 backdrop-blur-md shadow-lg"
    >
      <span className="text-base">🌐</span>
      <span className={language === "en" ? "text-indigo-300" : "text-white/40"}>EN</span>
      <span className="text-white/20">|</span>
      <span className={language === "hi" ? "text-indigo-300" : "text-white/40"}>HI</span>
    </button>
  );
}

function QuestionCard({ text, isSpeaking, onReplay }: { text: string; isSpeaking: boolean; onReplay: () => void }) {
  return (
    <div className="relative w-full rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4 shadow-2xl backdrop-blur-sm">
      {isSpeaking && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 h-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-1.5 bg-indigo-400 rounded-full animate-pulse"
              style={{
                height: `${40 + Math.sin(i) * 30}%`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      )}
      <p className="text-white text-xl font-bold leading-tight pr-14 select-none">
        {text}
      </p>
      <button
        onClick={onReplay}
        disabled={isSpeaking}
        className="flex items-center gap-2 text-indigo-300 hover:text-indigo-100 text-xs font-bold transition-all disabled:opacity-30 uppercase tracking-widest"
      >
        <span>🔊 Replay Voice</span>
      </button>
    </div>
  );
}

function OptionGrid({
  options,
  selectedValue,
  language,
  onSelect,
  disabled,
}: {
  options: any[];
  selectedValue: string | null;
  language: "en" | "hi";
  onSelect: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
      {options.map((option, index) => {
        const isSelected = selectedValue === option.value;
        const themes: Record<string, string> = {
          mild: isSelected ? "bg-emerald-600 border-emerald-400 shadow-emerald-900/40" : "hover:border-emerald-500/50 bg-emerald-500/5",
          moderate: isSelected ? "bg-amber-600 border-amber-400 shadow-amber-900/40" : "hover:border-amber-500/50 bg-amber-500/5",
          severe: isSelected ? "bg-red-600 border-red-400 shadow-red-900/30" : "hover:border-red-500/50 bg-red-500/5",
        };
        const themeClass = themes[option.value] || (isSelected ? "bg-indigo-600 border-indigo-400" : "bg-white/5 border-white/10 hover:bg-white/10");

        return (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            disabled={disabled}
            className={`group relative flex items-center gap-4 px-5 py-4 rounded-2xl border text-left font-bold transition-all duration-300 ${
              disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.03] active:scale-95"
            } ${themeClass} ${isSelected ? "text-white shadow-xl scale-[1.03]" : "text-white/80"}`}
          >
            <span className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black border ${
              isSelected ? "bg-white/20 border-white/40" : "bg-white/5 border-white/10 text-white/40"
            }`}>
              {index + 1}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{option.emoji}</span>
              <span className="text-base tracking-tight">{option.label[language]}</span>
            </div>
            {isSelected && <span className="ml-auto animate-in zoom-in duration-300">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

function MicButton({ isRecording, isLoading, onToggle }: { isRecording: boolean; isLoading: boolean; onToggle: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <button
        onClick={onToggle}
        disabled={isLoading}
        className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-500 shadow-2xl ${
          isLoading ? "opacity-40" : "hover:scale-110 active:scale-90"
        } ${isRecording ? "bg-red-500 ring-8 ring-red-500/20" : "bg-indigo-600 hover:bg-indigo-500"}`}
      >
        {isRecording ? (
          <div className="flex items-center gap-1 h-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-1.5 bg-white rounded-full animate-bounce" style={{ height: '100%', animationDelay: `${i*0.1}s` }} />
            ))}
          </div>
        ) : (
          <span className="text-3xl">🎤</span>
        )}
      </button>
      <span className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
        {isLoading ? "Processing AI..." : isRecording ? "Stop Talking" : "Hold to Speak"}
      </span>
    </div>
  );
}

// ---- Main Component ----

export const AIQuestionEngine = ({ 
  initialSymptom, 
  defaultLanguage = "en", 
  onComplete 
}: EngineProps) => {
  const engine = useQuestionEngine({ 
    initialSymptom, 
    defaultLanguage, 
    onComplete 
  });

  if (engine.isComplete) {
    return (
      <div className="w-full max-w-2xl mx-auto p-16 text-center space-y-6 bg-gray-900/50 rounded-[2.5rem] border border-emerald-500/20 backdrop-blur-xl shadow-2xl animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full mx-auto flex items-center justify-center text-emerald-400 text-4xl animate-bounce">
          ✓
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-white">Assessment Finalized</h3>
          <p className="text-white/40 text-sm font-medium">Your data is ready for the risk scoring engine.</p>
        </div>
        <button aria-label="Reset" onClick={engine.reset} className="text-indigo-400 text-xs font-black uppercase tracking-widest hover:text-indigo-300 transition-colors">
          Restart Assessment
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto font-sans">
      <div className="relative rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] border border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-gray-900 to-black" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 p-10 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/80">
                SymptoSense Intelligence
              </span>
              <h1 className="text-2xl font-black text-white capitalize tracking-tight">
                {initialSymptom}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <MuteToggle isMuted={engine.isMuted} onToggle={engine.toggleMute} />
              <LanguageToggle language={engine.language} onToggle={engine.toggleLanguage} />
            </div>
          </div>

          <ProgressBar 
            current={engine.currentStep} 
            total={engine.totalSteps} 
            progress={engine.progress} 
          />

          {engine.isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-6">
              <div className="w-16 h-16 rounded-full border-[6px] border-indigo-500/10 border-t-indigo-500 animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-white font-black text-lg">AI is thinking...</p>
                <p className="text-white/30 text-[10px] uppercase tracking-widest">Bridging medical context</p>
              </div>
            </div>
          ) : engine.currentQuestion ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <QuestionCard 
                text={engine.currentQuestion.question[engine.language]} 
                isSpeaking={engine.isSpeaking} 
                onReplay={engine.replayQuestion} 
              />
              <OptionGrid 
                options={engine.currentQuestion.options} 
                selectedValue={engine.selectedOption} 
                language={engine.language} 
                onSelect={engine.handleAnswer} 
                disabled={engine.isLoading || engine.isSpeaking} 
              />
            </div>
          ) : null}

          <div className="relative py-4">
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/5" />
            <span className="relative z-10 mx-auto block w-max bg-[#0a0a10] px-4 text-[10px] font-black uppercase tracking-[0.4em] text-white/20">
              Voice Interface
            </span>
          </div>

          <MicButton 
            isRecording={engine.isRecording} 
            isLoading={engine.isLoading} 
            onToggle={engine.handleVoiceToggle} 
          />

          {engine.voiceError && (
            <div className="px-6 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-amber-400 text-xs text-center font-bold italic animate-pulse">
                {engine.voiceError}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIQuestionEngine;
