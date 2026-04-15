"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Urgency } from "@/lib/scoring";
import { getRecommendationContent } from "@/lib/scoring";

interface RecommendationPanelProps {
  urgency: Urgency;
  primaryCategory: string;
}

type Tab = "home" | "doctor" | "emergency";

const tabs: { id: Tab; label: string; emoji: string }[] = [
  { id: "home", label: "Home Care", emoji: "🏠" },
  { id: "doctor", label: "See a Doctor", emoji: "👨‍⚕️" },
  { id: "emergency", label: "Emergency", emoji: "🚑" },
];

const defaultActive: Record<Urgency, Tab> = {
  Low: "home",
  Medium: "doctor",
  High: "emergency",
};

export function RecommendationPanel({ urgency, primaryCategory }: RecommendationPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultActive[urgency]);
  const content = getRecommendationContent(urgency, primaryCategory);

  const tabContent: Record<Tab, string[]> = {
    home: content.homeCare,
    doctor: content.seeDoctor,
    emergency: content.emergency,
  };

  return (
    <div
      style={{
        background: "#0F1829",
        borderRadius: "20px",
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
      }}
    >
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "14px 8px",
                background: isActive ? "rgba(0,201,167,0.08)" : "transparent",
                border: "none",
                borderBottom: `2px solid ${isActive ? "#00C9A7" : "transparent"}`,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "#00C9A7" : "rgba(255,255,255,0.4)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.2s",
              }}
              id={`rec-tab-${tab.id}`}
            >
              <span style={{ fontSize: 20 }}>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{ padding: "24px" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: 20 }}>
              {tabContent[activeTab].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "12px 16px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "12px",
                    borderLeft: "3px solid rgba(0,201,167,0.3)",
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>
                    {activeTab === "emergency" ? "🚨" : activeTab === "doctor" ? "📋" : "✅"}
                  </span>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>
                    {item}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Specialist suggestion */}
            <div
              style={{
                padding: "14px 16px",
                background: "rgba(0,201,167,0.06)",
                borderRadius: "12px",
                border: "1px solid rgba(0,201,167,0.15)",
                marginBottom: 16,
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: 20 }}>💡</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#00C9A7", marginBottom: 4 }}>
                  Suggested Specialist
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                  {content.specialist}
                </div>
              </div>
            </div>


          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
