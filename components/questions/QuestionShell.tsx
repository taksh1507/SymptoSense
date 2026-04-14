"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, X, AlertTriangle } from "lucide-react";
import { useTestSession } from "@/hooks/useTestSession";
import { useAdaptiveQuestions } from "@/hooks/useAdaptiveQuestions";
import { useScoringEngine } from "@/hooks/useScoringEngine";
import { ProgressBar } from "./ProgressBar";
import { QuestionCard } from "./QuestionCard";
import { MCQWidget } from "./MCQWidget";
import { YesNoWidget } from "./YesNoWidget";
import { ScaleWidget } from "./ScaleWidget";
import { TextInputWidget } from "./TextInputWidget";
import { VoiceFab } from "@/components/shared/VoiceFab";
import { LoadingOverlay } from "@/components/loading/LoadingOverlay";

interface QuestionShellProps {
  sessionId: string;
}

export function QuestionShell({ sessionId }: QuestionShellProps) {
  const router = useRouter();
  const { isLoadingResults, isComplete, answers, addPastSession, personName } = useTestSession();
  const { currentQuestion, advance, goBack, questionNumber, totalEstimate, progressPercent } = useAdaptiveQuestions();
  const { computeAndStore } = useScoringEngine();

  const [selected, setSelected] = useState<string[]>([]);
  const [scaleValue, setScaleValue] = useState<number | null>(null);
  const [textValue, setTextValue] = useState("");
  const [showRedFlag, setShowRedFlag] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [hasStartedComputing, setHasStartedComputing] = useState(false);

  // Clear selection on question change
  useEffect(() => {
    setSelected([]);
    setScaleValue(null);
    setTextValue("");
  }, [currentQuestion?.id]);

  // When complete, compute and navigate
  useEffect(() => {
    if (isComplete && !hasStartedComputing) {
      setHasStartedComputing(true);
      computeAndStore().then((result) => {
        addPastSession({
          sessionId,
          personName,
          isSelf: true,
          date: new Date().toISOString(),
          score: result.score,
          urgency: result.urgency,
          primarySymptom: result.primaryCategory,
        });
        fetch("/api/sessions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, answers, result }),
        }).catch(() => {});
        router.push(`/test/${sessionId}/results`);
      });
    }
  }, [isComplete, hasStartedComputing]);

  if (!currentQuestion) return null;
  if (isLoadingResults) return <LoadingOverlay />;

  const handleNext = () => {
    let answerIds: string[] = [];
    if (currentQuestion.type === "scale") {
      if (scaleValue === null) return;
      answerIds = [String(scaleValue)];
    } else if (currentQuestion.type === "text") {
      answerIds = textValue.trim() ? [textValue] : ["_skipped"];
    } else {
      if (selected.length === 0) return;
      answerIds = [...selected];
      if (textValue.trim()) {
        answerIds.push(`other_text:${textValue.trim()}`);
      }
    }
    const { nextId, hasRedFlag } = advance(answerIds);
    if (hasRedFlag) setShowRedFlag(true);
  };

  const canProceed = () => {
    if (currentQuestion.type === "scale") return scaleValue !== null;
    if (currentQuestion.type === "text") return true;
    if (currentQuestion.allowOther && selected.some(id => !currentQuestion.options?.find(o => o.id === id)?.nextQuestionId)) {
      return selected.length > 0 && textValue.trim() !== "";
    }
    return selected.length > 0;
  };

  const handleVoice = (transcript: string) => {
    if (currentQuestion.type === "text") setTextValue(transcript);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#070D1A",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* ── Top bar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(7,13,26,0.97)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "12px 16px",
        display: "flex", alignItems: "center", gap: "12px",
      }}>
        <button
          onClick={goBack}
          style={{
            background: "rgba(255,255,255,0.06)", border: "none",
            borderRadius: "10px", width: 42, height: 42,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0, color: "rgba(255,255,255,0.7)",
            minWidth: 42,
          }}
          id="q-back-btn"
        >
          <ArrowLeft size={18} />
        </button>

        <ProgressBar percent={progressPercent} questionNumber={questionNumber} total={totalEstimate} />

        <button
          onClick={() => setShowCancelConfirm(true)}
          style={{
            background: "rgba(255,255,255,0.06)", border: "none",
            borderRadius: "10px", width: 42, height: 42,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0, color: "rgba(255,255,255,0.7)",
            minWidth: 42,
          }}
          id="q-cancel-btn"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Question area ── */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        padding: "24px 16px 16px",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
      }}>
        <div style={{ width: "100%", maxWidth: 680 }}>
          <AnimatePresence mode="wait">
            <QuestionCard
              key={currentQuestion.id}
              text={currentQuestion.text}
              subtext={currentQuestion.subtext}
              category={currentQuestion.category}
            >
              {currentQuestion.type === "mcq" && currentQuestion.options && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <MCQWidget
                    options={currentQuestion.options}
                    selected={selected}
                    onSelect={setSelected}
                    multiSelect={currentQuestion.multiSelect}
                  />
                  {currentQuestion.allowOther && selected.some(id => !currentQuestion.options?.find(o => o.id === id)?.nextQuestionId) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <TextInputWidget
                        value={textValue}
                        onChange={setTextValue}
                        placeholder={currentQuestion.otherPlaceholder || "Tell us more..."}
                      />
                    </motion.div>
                  )}
                </div>
              )}
              {currentQuestion.type === "yesno" && (
                <YesNoWidget selected={selected} onSelect={setSelected} />
              )}
              {currentQuestion.type === "scale" && (
                <ScaleWidget value={scaleValue} onChange={setScaleValue} />
              )}
              {currentQuestion.type === "text" && (
                <TextInputWidget value={textValue} onChange={setTextValue} />
              )}
            </QuestionCard>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Bottom Next button ── */}
      <div style={{
        background: "rgba(7,13,26,0.97)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "12px 16px",
        paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <motion.button
            whileHover={canProceed() ? { scale: 1.02, boxShadow: "0 8px 30px rgba(0,201,167,0.3)" } : {}}
            whileTap={canProceed() ? { scale: 0.98 } : {}}
            onClick={handleNext}
            disabled={!canProceed() && currentQuestion.type !== "text"}
            id="q-next-btn"
            style={{
              width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              padding: "16px",
              background: canProceed()
                ? "linear-gradient(135deg, #00C9A7, #00A88A)"
                : "rgba(255,255,255,0.08)",
              border: "none", borderRadius: "14px",
              color: canProceed() ? "#fff" : "rgba(255,255,255,0.3)",
              fontWeight: 700, fontSize: 16,
              cursor: canProceed() ? "pointer" : "not-allowed",
              fontFamily: "'DM Sans', sans-serif",
              transition: "background 0.2s",
              minHeight: "52px",
            }}
          >
            {currentQuestion.isTerminal ? "View My Results →" : "Next Question →"}
          </motion.button>

          {currentQuestion.type === "text" && !textValue && (
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              Optional — tap Next to skip
            </div>
          )}
        </div>
      </div>

      {/* Voice FAB */}
      <VoiceFab onTranscript={handleVoice} />

      {/* ── Red Flag overlay ── */}
      <AnimatePresence>
        {showRedFlag && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0,
              background: "linear-gradient(160deg,rgba(200,20,30,0.98),rgba(255,71,87,0.97))",
              zIndex: 500,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "32px 24px", textAlign: "center",
            }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div style={{ fontSize: "clamp(60px,15vw,80px)", marginBottom: 20 }}>🚨</div>
              <h2 style={{
                fontSize: "clamp(22px, 6vw, 34px)",
                fontWeight: 900, color: "#fff", marginBottom: 14, letterSpacing: "-0.5px",
              }}>
                Seek emergency care now
              </h2>
              <p style={{
                fontSize: "clamp(14px,4vw,16px)",
                color: "rgba(255,255,255,0.88)", marginBottom: 32,
                lineHeight: 1.7, maxWidth: 460,
              }}>
                Your symptoms include warning signs that require immediate medical attention.
                Call emergency services (112 / 911) or go to the nearest emergency room immediately.
              </p>
              <button
                onClick={() => setShowRedFlag(false)}
                id="red-flag-continue-btn"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  border: "2px solid rgba(255,255,255,0.5)",
                  borderRadius: "16px", padding: "16px 32px",
                  color: "#fff", fontWeight: 700, fontSize: 16,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  width: "100%", maxWidth: 320,
                }}
              >
                I understand — continue test
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cancel confirm ── */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(7,13,26,0.92)",
              backdropFilter: "blur(12px)", zIndex: 400,
              display: "flex", alignItems: "flex-end", justifyContent: "center",
            }}
            onClick={() => setShowCancelConfirm(false)}
          >
            <motion.div
              initial={{ y: 60 }} animate={{ y: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#0F1829",
                borderRadius: "24px 24px 0 0",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "24px 24px 32px",
                width: "100%",
                maxWidth: 480,
                textAlign: "center",
                paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))",
              }}
            >
              <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 2, margin: "0 auto 20px" }} />
              <AlertTriangle size={32} color="#FFA502" style={{ marginBottom: 12 }} />
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
                Cancel test?
              </h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 24, lineHeight: 1.6 }}>
                Your progress will be lost.
              </p>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  style={{
                    flex: 1, padding: "14px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "12px", color: "#fff",
                    fontWeight: 600, fontSize: 14, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif", minHeight: 48,
                  }}
                >
                  Keep Going
                </button>
                <button
                  onClick={() => router.push("/")}
                  id="confirm-cancel-btn"
                  style={{
                    flex: 1, padding: "14px", background: "#FF4757",
                    border: "none", borderRadius: "12px",
                    color: "#fff", fontWeight: 700, fontSize: 14,
                    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    minHeight: 48,
                  }}
                >
                  Yes, Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
