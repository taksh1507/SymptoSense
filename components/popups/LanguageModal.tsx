"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2 } from "lucide-react";
import { useTestSession } from "@/hooks/useTestSession";

export function LanguageModal() {
  const { setLanguage, language, setShowLanguageModal, setShowPersonModal } = useTestSession();
  const [selected, setSelected] = useState<"en" | "hi" | "mr">(language);

  const handleContinue = () => {
    setLanguage(selected);
    setShowLanguageModal(false);
    setShowPersonModal(true);
  };

  const langs = [
    { id: "en" as const, flag: "🇬🇧", name: "English", native: "English" },
    { id: "hi" as const, flag: "🇮🇳", name: "Hindi", native: "हिन्दी" },
    { id: "mr" as const, flag: "🇮🇳", name: "Marathi", native: "मराठी" },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(7,13,26,0.9)",
          backdropFilter: "blur(12px)",
          zIndex: 200,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
        className="lang-backdrop"
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="lang-sheet"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="drag-handle" />

          <button onClick={() => setShowLanguageModal(false)} className="modal-close-btn">
            <X size={16} />
          </button>

          <div className="modal-inner">
            <div style={{ fontSize: 32, marginBottom: 12 }}>🌐</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", marginBottom: 6 }}>
              Choose your language
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 24, lineHeight: 1.5 }}>
              Select the language for your symptom check.
            </p>

            {/* Language cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "24px" }}>
              {langs.map((lang) => {
                const isSel = selected === lang.id;
                return (
                  <motion.button
                    key={lang.id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelected(lang.id)}
                    id={`lang-option-${lang.id}`}
                    style={{
                      background: isSel ? "rgba(0,201,167,0.12)" : "rgba(255,255,255,0.04)",
                      border: `2px solid ${isSel ? "#00C9A7" : "rgba(255,255,255,0.1)"}`,
                      borderRadius: "14px",
                      padding: "20px 12px",
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", gap: "8px",
                      position: "relative",
                      minHeight: "100px",
                    }}
                  >
                    {isSel && (
                      <div style={{ position: "absolute", top: 8, right: 8 }}>
                        <CheckCircle2 size={16} color="#00C9A7" fill="rgba(0,201,167,0.2)" />
                      </div>
                    )}
                    <span style={{ fontSize: 32 }}>{lang.flag}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: isSel ? "#00C9A7" : "#fff" }}>
                        {lang.native}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{lang.name}</div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleContinue}
              id="lang-continue-btn"
              style={{
                width: "100%", padding: "15px",
                background: "linear-gradient(135deg, #00C9A7, #00A88A)",
                border: "none", borderRadius: "14px",
                color: "#fff", fontWeight: 700, fontSize: 15,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Continue →
            </motion.button>
          </div>
        </motion.div>
      </motion.div>

      <style>{`
        .lang-sheet {
          background: #0F1829;
          border-radius: 24px 24px 0 0;
          border: 1px solid rgba(255,255,255,0.1);
          width: 100%;
          position: relative;
          box-shadow: 0 -20px 60px rgba(0,0,0,0.6);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        .drag-handle {
          width: 40px; height: 4px;
          background: rgba(255,255,255,0.15);
          border-radius: 2px;
          margin: 12px auto 4px;
        }
        .modal-close-btn {
          position: absolute; top: 14px; right: 16px;
          background: rgba(255,255,255,0.06); border: none;
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: rgba(255,255,255,0.5);
          border-radius: 8px;
        }
        .modal-inner { padding: 8px 20px 24px; }

        @media (min-width: 540px) {
          .lang-backdrop { align-items: center !important; padding: 24px; }
          .lang-sheet {
            border-radius: 24px !important;
            max-width: 480px !important;
            padding-bottom: 0 !important;
          }
          .drag-handle { display: none; }
          .modal-inner { padding: 8px 36px 36px; }
        }
      `}</style>
    </AnimatePresence>
  );
}
