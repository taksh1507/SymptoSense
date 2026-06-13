"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, Plus, Clock } from "lucide-react";
import { useTestSession } from "@/hooks/useTestSession";
import { PastReportCard } from "./PastReportCard";
import { ProfileDropdown } from "./ProfileDropdown";

export function Sidebar() {
  const { pastSessions, setShowLanguageModal } = useTestSession();

  const handleNewTest = () => {
    // Will trigger auth gate or language modal
    setShowLanguageModal(true);
  };

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        width: 260,
        height: "100vh",
        background: "#0F1829",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        zIndex: 40,
        padding: "0",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "24px 20px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "12px",
            background: "linear-gradient(135deg, #00C9A7, #0096FF)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 0 20px rgba(0,201,167,0.3)",
          }}
        >
          <Activity size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#fff", letterSpacing: "-0.3px" }}>
            SymptoSense
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
            Smart Triage System
          </div>
        </div>
      </div>

      {/* New Test Button */}
      <div style={{ padding: "16px 16px 12px" }}>
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: "0 8px 30px rgba(0,201,167,0.35)" }}
          whileTap={{ scale: 0.97 }}
          onClick={handleNewTest}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            background: "linear-gradient(135deg, #00C9A7, #00A88A)",
            border: "none",
            borderRadius: "12px",
            padding: "13px 16px",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            animation: "pulseRing 3s ease infinite",
          }}
          id="sidebar-new-test-btn"
        >
          <Plus size={18} />
          New Symptom Test
        </motion.button>
      </div>

      {/* Past Reports */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
        <div
          style={{
            padding: "8px 12px 10px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Clock size={13} color="rgba(255,255,255,0.35)" />
          <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            Past Reports
          </span>
        </div>

        {pastSessions.length === 0 ? (
          <div
            style={{
              padding: "20px 12px",
              textAlign: "center",
              color: "rgba(255,255,255,0.25)",
              fontSize: 13,
            }}
          >
            No past reports yet.
            <br />
            <span style={{ fontSize: 12 }}>Start your first test above.</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {pastSessions.map((session) => (
              <PastReportCard key={session.sessionId} session={session} />
            ))}
          </div>
        )}
      </div>

      {/* Profile */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px" }}>
        <ProfileDropdown />
      </div>
    </motion.aside>
  );
}
