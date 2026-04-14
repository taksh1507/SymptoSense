"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useTestSession } from "@/hooks/useTestSession";
import { UrgencyBanner } from "@/components/results/UrgencyBanner";
import { RiskGauge } from "@/components/results/RiskGauge";
import { RiskFactorList } from "@/components/results/RiskFactorList";
import { RecommendationPanel } from "@/components/results/RecommendationPanel";
import { Download, RotateCcw, ArrowLeft } from "lucide-react";
import { Activity } from "lucide-react";

interface ResultsPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function ResultsPage({ params }: ResultsPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { scoreResult, personName, setShowLanguageModal, resetFlow } = useTestSession();

  useEffect(() => {
    if (!scoreResult) router.replace("/");
  }, [scoreResult]);

  if (!scoreResult) return null;

  const handleNewTest = () => {
    resetFlow();
    setShowLanguageModal(true);
    router.push("/");
  };

  const handleDownload = () => {
    const text = `SymptoSense Health Report\n${"=".repeat(26)}\nDate: ${new Date().toLocaleDateString("en-IN")}\nPerson: ${personName}\n\nRISK SCORE: ${scoreResult.score}/100\nURGENCY: ${scoreResult.urgency.toUpperCase()}\nPRIMARY CATEGORY: ${scoreResult.primaryCategory}\n\nCONTRIBUTING FACTORS:\n${scoreResult.factors.map((f) => `• ${f.label} (+${f.score} pts)${f.isRedFlag ? " [RED FLAG]" : ""}`).join("\n")}\n\nRECOMMENDATION:\n${scoreResult.recommendation}\n\n---\nDISCLAIMER: This report provides health guidance only — not a medical diagnosis.`.trim();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SymptoSense-Report-${resolvedParams.sessionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#070D1A",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* ── Mobile-friendly top bar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(7,13,26,0.97)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "12px 16px",
        display: "flex", alignItems: "center", gap: "12px",
      }}>
        {/* Logo mark */}
        <div style={{
          width: 32, height: 32, borderRadius: "10px",
          background: "linear-gradient(135deg,#00C9A7,#0096FF)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Activity size={16} color="#fff" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
            Your Health Report
          </div>
          {personName && personName !== "Myself" && (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
              for {personName}
            </div>
          )}
        </div>

        <Link
          href="/"
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            fontSize: 13, color: "rgba(255,255,255,0.5)",
            textDecoration: "none", padding: "8px 12px",
            borderRadius: "10px", background: "rgba(255,255,255,0.05)",
            whiteSpace: "nowrap", flexShrink: 0,
          }}
          id="results-home-link"
        >
          <ArrowLeft size={14} /> Home
        </Link>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{
        maxWidth: 900, margin: "0 auto",
        padding: "20px 16px 40px",
        display: "flex", flexDirection: "column", gap: "16px",
      }}>
        {/* Urgency banner */}
        <UrgencyBanner
          urgency={scoreResult.urgency}
          score={scoreResult.score}
          recommendation={scoreResult.recommendation}
        />

        {/* Gauge + summary — stack on mobile, 2-col on desktop */}
        <div className="results-top-grid">
          {/* Gauge */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <RiskGauge score={scoreResult.score} urgency={scoreResult.urgency} />
          </div>

          {/* Summary card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              background: "#0F1829",
              borderRadius: "20px",
              border: "1px solid rgba(255,255,255,0.07)",
              padding: "20px",
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 16 }}>
              Risk Summary
            </h3>

            {[
              { label: "Total risk score",        value: `${scoreResult.score} / 100` },
              { label: "Symptoms analysed",       value: `${scoreResult.symptomCount}` },
              { label: "Primary category",        value: scoreResult.primaryCategory },
              { label: "Highest severity factor", value: scoreResult.highestSeverity },
            ].map((item) => (
              <div key={item.label} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "flex-start", gap: "12px",
                paddingBottom: 12, marginBottom: 12,
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", flex: "0 0 auto", maxWidth: "45%" }}>
                  {item.label}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", textAlign: "right", flex: 1 }}>
                  {item.value}
                </span>
              </div>
            ))}

            {scoreResult.hasRedFlag && (
              <div style={{
                padding: "10px 14px",
                background: "rgba(255,71,87,0.1)",
                border: "1px solid rgba(255,71,87,0.25)",
                borderRadius: "10px",
                fontSize: 13, color: "#FF4757", fontWeight: 600,
              }}>
                🚨 Red-flag symptoms detected
              </div>
            )}
          </motion.div>
        </div>

        {/* Risk factors */}
        <RiskFactorList factors={scoreResult.factors} />

        {/* Recommendations */}
        <RecommendationPanel
          urgency={scoreResult.urgency}
          primaryCategory={scoreResult.primaryCategory}
        />

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 8px 30px rgba(0,201,167,0.3)" }}
            whileTap={{ scale: 0.97 }}
            onClick={handleNewTest}
            id="results-new-test-btn"
            style={{
              flex: 1, minWidth: "140px",
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: "8px", padding: "15px 20px",
              background: "linear-gradient(135deg,#00C9A7,#00A88A)",
              border: "none", borderRadius: "14px",
              color: "#fff", fontWeight: 700, fontSize: 15,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              minHeight: 52,
            }}
          >
            <RotateCcw size={16} /> New Test
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleDownload}
            id="results-download-btn"
            style={{
              flex: 1, minWidth: "140px",
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: "8px", padding: "15px 20px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "14px",
              color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: 15,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              minHeight: 52,
            }}
          >
            <Download size={16} /> Download
          </motion.button>
        </div>

        {/* Return link */}
        <div style={{ textAlign: "center" }}>
          <Link href="/" style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}
            id="results-return-link">
            ← Return to Dashboard
          </Link>
        </div>

        {/* Disclaimer */}
        <p style={{
          fontSize: 11, color: "rgba(255,255,255,0.2)",
          textAlign: "center", lineHeight: 1.6,
          padding: "0 8px",
        }}>
          ⚕️ This app provides health guidance only — not a medical diagnosis. Always consult a qualified healthcare professional.
        </p>
      </div>

      <style>{`
        .results-top-grid {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 600px) {
          .results-top-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
