"use client";

import React from "react";
import { useQuestionEngine } from "./useQuestionEngine";
import type { EngineProps } from "./types";

// ── Progress Bar ──────────────────────────────────────────────
function ProgressBar({ step, total, progress }: { step: number; total: number; progress: number }) {
  return (
    <div style={{ width: "100%", marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Question {step + 1} of {total}
        </span>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--red)" }}>{progress}%</span>
      </div>
      <div style={{ width: "100%", height: "6px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #B91C1C, #7F1D1D)", borderRadius: "999px", transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

// ── Option Button ─────────────────────────────────────────────
function OptionButton({
  label, emoji, isSelected, onClick, disabled,
}: {
  label: string; emoji: string; isSelected: boolean; onClick: () => void; disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "16px 18px", borderRadius: "12px", width: "100%", textAlign: "left",
        border: isSelected ? "2px solid var(--red)" : "1.5px solid var(--border)",
        background: isSelected ? "var(--red-light)" : "white",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit", transition: "all 0.15s ease",
        transform: isSelected ? "scale(1.01)" : "scale(1)",
        boxShadow: isSelected ? "0 4px 12px rgba(185,28,28,0.15)" : "none",
        opacity: disabled ? 0.6 : 1,
        position: "relative",
      }}
    >
      <span style={{ fontSize: "24px", flexShrink: 0 }}>{emoji}</span>
      <span style={{ fontSize: "14px", fontWeight: 600, color: isSelected ? "var(--red)" : "var(--text-2)", flex: 1 }}>
        {label}
      </span>
      {isSelected && (
        <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────
export function AIQuestionEngine({ defaultLanguage = "en", onComplete, onCancel, initialSymptom, gender }: EngineProps) {
  const engine = useQuestionEngine({ defaultLanguage, onComplete, onCancel, initialSymptom, gender });

  const {
    currentQuestion, currentStep, totalSteps, progress, stage,
    selectedOptions, customInput, customInputError, showCustomInput,
    language, toggleLanguage, isSpeaking, isRecording, isLoading, isComplete,
    voiceError, isMuted, toggleMute, genderMismatch, dismissMismatch,
    handleOptionToggle, handleCustomInputChange, handleNext, handleVoiceToggle,
    replayQuestion,
  } = engine;

  const stageLabel: Record<string, { en: string; hi: string; mr: string }> = {
    q1_age:         { en: "Demographics", hi: "जनसांख्यिकी", mr: "लोकसंख्याशास्त्र" },
    q2_symptoms:    { en: "Symptoms", hi: "लक्षण", mr: "लक्षणे" },
    ai_questions:   { en: "Follow-up", hi: "अनुवर्ती", mr: "पाठपुरावा" },
    q9_duration:    { en: "Duration", hi: "अवधि", mr: "कालावधी" },
    q10_severity:   { en: "Severity", hi: "गंभीरता", mr: "तीव्रता" },
    q11_medications:{ en: "Medical History", hi: "चिकित्सा इतिहास", mr: "वैद्यकीय इतिहास" },
  };

  const canProceed =
    stage === "q2_symptoms" || stage === "q11_medications"
      ? selectedOptions.length > 0 || customInput.trim().length >= 3
      : selectedOptions.length > 0;

  if (isComplete) {
    return (
      <div style={{ padding: "60px 32px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
        <h3 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-1)" }}>
          {language === "hi" ? "मूल्यांकन पूर्ण" : language === "mr" ? "मूल्यांकन पूर्ण" : "Assessment Complete"}
        </h3>
        <p style={{ color: "var(--text-3)", marginTop: "8px" }}>
          {language === "hi" ? "आपका डेटा विश्लेषण किया जा रहा है..." : language === "mr" ? "तुमचा डेटा विश्लेषण केला जात आहे..." : "Analyzing your data..."}
        </p>
      </div>
    );
  }

  // ── Gender-symptom mismatch warning popup ────────────────────
  if (genderMismatch) {
    const symptomDisplay = genderMismatch.symptom.charAt(0).toUpperCase() + genderMismatch.symptom.slice(1);
    const genderDisplay = genderMismatch.gender;
    return (
      <div style={{ width: "100%", maxWidth: "600px", fontFamily: "var(--font)" }}>
        <div className="card" style={{ padding: "36px 32px", borderRadius: "20px", border: "2px solid #FCA5A5", background: "#FFF5F5", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#B91C1C", marginBottom: "12px", letterSpacing: "-0.3px" }}>
            {language === "hi" ? "लक्षण और लिंग में असंगति" : language === "mr" ? "लक्षण आणि लिंग विसंगती" : "Symptom–Gender Mismatch"}
          </h2>
          <p style={{ fontSize: "14px", color: "#7F1D1D", lineHeight: "1.65", marginBottom: "8px" }}>
            {language === "hi"
              ? `"${symptomDisplay}" ${genderDisplay === "Male" ? "पुरुषों" : "महिलाओं"} के लिए शारीरिक रूप से संभव नहीं है।`
              : language === "mr"
              ? `"${symptomDisplay}" हे ${genderDisplay === "Male" ? "पुरुषांसाठी" : "महिलांसाठी"} शारीरिकदृष्ट्या शक्य नाही.`
              : `"${symptomDisplay}" is not anatomically possible for a ${genderDisplay} patient.`}
          </p>
          <p style={{ fontSize: "13px", color: "#991B1B", lineHeight: "1.6", marginBottom: "28px" }}>
            {language === "hi"
              ? "कृपया अपना लिंग या लक्षण सही करें। गलत जानकारी से जोखिम मूल्यांकन प्रभावित हो सकता है।"
              : language === "mr"
              ? "कृपया तुमचे लिंग किंवा लक्षण दुरुस्त करा. चुकीची माहिती जोखीम मूल्यांकनावर परिणाम करू शकते."
              : "Please correct your gender or symptom selection. Inaccurate data may affect your risk assessment."}
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            {/* Go back and fix symptoms */}
            <button
              onClick={dismissMismatch}
              className="btn btn-primary"
              style={{ padding: "12px 24px", fontSize: "14px" }}
            >
              {language === "hi" ? "← लक्षण ठीक करें" : language === "mr" ? "← लक्षण दुरुस्त करा" : "← Fix Symptoms"}
            </button>
            {/* Cancel triage entirely */}
            {onCancel && (
              <button
                onClick={onCancel}
                className="btn btn-outline"
                style={{ padding: "12px 24px", fontSize: "14px" }}
              >
                {language === "hi" ? "मूल्यांकन रद्द करें" : language === "mr" ? "मूल्यांकन रद्द करा" : "Cancel Assessment"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: "600px", fontFamily: "var(--font)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.08em", background: "var(--red-light)", padding: "3px 10px", borderRadius: "999px", border: "1px solid var(--red-border)" }}>
            {stageLabel[stage]?.[language] ?? stage}
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Mute */}
          <button onClick={toggleMute} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", fontSize: "14px" }}>
            {isMuted ? "🔇" : "🔊"}
          </button>
          {/* Language toggle */}
          <button onClick={toggleLanguage} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: 700, fontFamily: "inherit" }}>
            🌐 {language === "en" ? "EN" : language === "hi" ? "HI" : "MR"}
          </button>
          {/* Cancel */}
          {onCancel && (
            <button onClick={onCancel} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", color: "var(--text-3)", fontFamily: "inherit" }}>
              ✕ {language === "hi" ? "रद्द" : language === "mr" ? "रद्द" : "Cancel"}
            </button>
          )}
        </div>
      </div>

      <ProgressBar step={currentStep} total={totalSteps} progress={progress} />

      {/* Question Card */}
      <div className="card" style={{ padding: "28px", marginBottom: "16px" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ width: "36px", height: "36px", border: "3px solid var(--border)", borderTopColor: "var(--red)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            <p style={{ color: "var(--text-3)", fontSize: "14px" }}>
              {language === "hi" ? "AI प्रश्न तैयार कर रहा है..." : language === "mr" ? "AI प्रश्न तयार करत आहे..." : "AI is generating your question..."}
            </p>
          </div>
        ) : currentQuestion ? (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-1)", lineHeight: 1.4, flex: 1, paddingRight: "12px" }}>
                {currentQuestion.question[language]}
              </h2>
              {isSpeaking && (
                <div style={{ display: "flex", gap: "3px", alignItems: "center", flexShrink: 0 }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} style={{ width: "3px", height: "16px", background: "var(--red)", borderRadius: "2px", animation: "pulse 0.8s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              )}
            </div>

            {currentQuestion.type === "multiselect" && (
              <p style={{ fontSize: "12px", color: "var(--text-4)", marginBottom: "16px", fontStyle: "italic" }}>
                {language === "hi" ? "एक या अधिक चुनें" : language === "mr" ? "एक किंवा अधिक निवडा" : "Select one or more"}
              </p>
            )}

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {currentQuestion.options.map((opt) => (
                <OptionButton
                  key={opt.value}
                  label={opt.label[language]}
                  emoji={opt.emoji}
                  isSelected={selectedOptions.includes(opt.value)}
                  onClick={() => handleOptionToggle(opt.value)}
                  disabled={isLoading}
                />
              ))}

              {/* "Something else" option */}
              {currentQuestion.allowOther && (
                <OptionButton
                  label={language === "hi" ? "कुछ और..." : language === "mr" ? "इतर काही..." : "Something else..."}
                  emoji="✏️"
                  isSelected={showCustomInput}
                  onClick={() => handleOptionToggle("other")}
                  disabled={isLoading}
                />
              )}
            </div>

            {/* Custom input field */}
            {showCustomInput && (
              <div style={{ marginTop: "12px" }}>
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => handleCustomInputChange(e.target.value)}
                  placeholder={
                    language === "hi" ? "अपना लक्षण या स्थिति लिखें..."
                    : language === "mr" ? "तुमचे लक्षण किंवा स्थिती लिहा..."
                    : "Describe your symptom or condition..."
                  }
                  className="input"
                  style={{ width: "100%", borderColor: customInputError ? "#EF4444" : undefined }}
                />
                {customInputError && (
                  <p style={{ fontSize: "12px", color: "#EF4444", marginTop: "6px", fontWeight: 600 }}>
                    ⚠️ {customInputError}
                  </p>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Voice + Next */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        {/* Voice button */}
        <button
          onClick={handleVoiceToggle}
          disabled={isLoading}
          style={{
            width: "52px", height: "52px", borderRadius: "50%", flexShrink: 0,
            background: isRecording ? "#EF4444" : "var(--red)",
            border: "none",
            cursor: isLoading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
            boxShadow: isRecording ? "0 0 0 4px rgba(239,68,68,0.25)" : "0 2px 8px rgba(185,28,28,0.35)",
          }}
          title={isRecording ? "Stop recording" : "Speak your answer"}
        >
          {isRecording ? (
            /* Stop square */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
            </svg>
          ) : (
            /* WhatsApp-style mic */
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="11" rx="3"/>
              <path d="M5 10a7 7 0 0 0 14 0"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="8" y1="22" x2="16" y2="22"/>
            </svg>
          )}
        </button>

        {/* Replay */}
        <button
          onClick={replayQuestion}
          disabled={isLoading || isSpeaking}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", opacity: isLoading || isSpeaking ? 0.4 : 1 }}
          title="Replay question"
        >
          🔁
        </button>

        {/* Next */}
        <button
          onClick={handleNext}
          disabled={!canProceed || isLoading}
          className="btn btn-primary"
          style={{ flex: 1, padding: "14px", fontSize: "15px", fontWeight: 700, opacity: !canProceed || isLoading ? 0.5 : 1, cursor: !canProceed || isLoading ? "not-allowed" : "pointer" }}
        >
          {stage === "q11_medications"
            ? (language === "hi" ? "परिणाम देखें →" : language === "mr" ? "निकाल पहा →" : "See Results →")
            : (language === "hi" ? "अगला →" : language === "mr" ? "पुढे →" : "Next →")}
        </button>
      </div>

      {/* Voice error */}
      {voiceError && (
        <div style={{ marginTop: "12px", padding: "10px 14px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "8px", fontSize: "13px", color: "#C2410C" }}>
          ⚠️ {voiceError}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}

export default AIQuestionEngine;
