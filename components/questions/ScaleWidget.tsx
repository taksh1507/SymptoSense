"use client";

import { motion } from "framer-motion";

interface ScaleWidgetProps {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

function getEmoji(v: number) {
  if (v <= 2) return "😊";
  if (v <= 4) return "🙁";
  if (v <= 6) return "😟";
  if (v <= 8) return "😣";
  return "😱";
}

function getColor(v: number) {
  if (v <= 3) return "#2ED573";
  if (v <= 5) return "#FFA502";
  if (v <= 7) return "#FF7043";
  return "#FF4757";
}

export function ScaleWidget({ value, onChange, min = 1, max = 10 }: ScaleWidgetProps) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  return (
    <div style={{ width: "100%" }}>
      {/* Current value display */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: 28,
        }}
      >
        <motion.div
          key={value}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            fontSize: "clamp(54px, 10vw, 80px)",
            fontWeight: 900,
            color: value ? getColor(value) : "rgba(255,255,255,0.2)",
            letterSpacing: "-4px",
            lineHeight: 1,
            marginBottom: 8,
          }}
        >
          {value ?? "?"}
        </motion.div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
          {value ? getEmoji(value) + " " : ""}
          {value
            ? value <= 3
              ? "Mild discomfort"
              : value <= 6
              ? "Moderate pain"
              : "Severe pain"
            : "Select a level below"}
        </div>
      </div>

      {/* Scale buttons */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {steps.map((step) => {
          const isSel = value === step;
          const c = getColor(step);
          return (
            <motion.button
              key={step}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onChange(step)}
              style={{
                width: "clamp(40px, 8vw, 52px)",
                height: "clamp(40px, 8vw, 52px)",
                borderRadius: "12px",
                border: `2px solid ${isSel ? c : "rgba(255,255,255,0.12)"}`,
                background: isSel ? `${c}22` : "rgba(255,255,255,0.04)",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 700,
                color: isSel ? c : "rgba(255,255,255,0.5)",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.15s ease",
                minHeight: "48px",
              }}
              id={`scale-${step}`}
            >
              {step}
            </motion.button>
          );
        })}
      </div>

      {/* Anchor labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 12,
          padding: "0 4px",
        }}
      >
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>😊 Barely noticeable</span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Worst pain ever 😱</span>
      </div>
    </div>
  );
}
