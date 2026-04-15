"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Info, HelpCircle } from "lucide-react";

interface ConfidenceMeterProps {
  score: number; // 0-100
  level: string; // Low | Medium | High
  explanation: string;
}

const levelColors: Record<string, string> = {
  Low: "#B91C1C",
  Medium: "#B45309",
  High: "#15803D",
};

export function ConfidenceMeter({ score, level, explanation }: ConfidenceMeterProps) {
  const [displayed, setDisplayed] = useState(0);
  const color = levelColors[level] || "#22c55e";
  const size = 220;
  const strokeWidth = 12;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const ANGLE = 270;
  const circumference = 2 * Math.PI * r;
  const arcLength = (ANGLE / 360) * circumference;

  useEffect(() => {
    let start = 0;
    const target = score;
    const step = target / 60;
    const interval = setInterval(() => {
      start += step;
      if (start >= target) {
        setDisplayed(target);
        clearInterval(interval);
      } else {
        setDisplayed(Math.round(start));
      }
    }, 1000 / 60);
    return () => clearInterval(interval);
  }, [score]);

  const offset = arcLength - (displayed / 100) * arcLength;
  const startAngle = -225 * (Math.PI / 180);
  const endAngle = startAngle + (ANGLE * Math.PI) / 180;

  function polarToCart(angle: number) {
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }

  const start = polarToCart(startAngle);
  const end = polarToCart(endAngle);
  const largeArc = ANGLE > 180 ? 1 : 0;
  const bgPath = `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px",
        background: "var(--surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
        position: "relative",
      }}
    >
      {/* Tooltip Icon */}
      <div style={{ position: "absolute", top: 16, right: 16, color: "var(--text-4)", cursor: "help" }} title="Confidence reflects how stable this result is based on your inputs.">
        <HelpCircle size={18} />
      </div>

      <svg width={size} height={size} style={{ overflow: "visible" }}>
        <defs>
          <filter id="confGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d={bgPath}
          fill="none"
          stroke="var(--border-faint)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        <path
          d={bgPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength}`}
          strokeDashoffset={offset}
          filter="url(#confGlow)"
          style={{ transition: "stroke-dashoffset 0.05s linear" }}
        />

        <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle" fill="var(--text-1)" fontSize="44" fontWeight="900" fontFamily="var(--font)" letterSpacing="-2">
          {displayed}%
        </text>
        <text x={cx} y={cy + 26} textAnchor="middle" fill="var(--text-3)" fontSize="14" fontFamily="var(--font)" fontWeight="700">
          {(level || 'Medium').toUpperCase()}
        </text>
      </svg>

      <div style={{ marginTop: 8, fontSize: 14, fontWeight: 800, color: "var(--text-1)", letterSpacing: "0.5px", textAlign: "center", textTransform: "uppercase" }}>
        Prediction Quality: {level || 'Medium'}
      </div>
      
      {explanation && (
        <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--bg)", borderRadius: "8px", fontSize: "12px", fontWeight: "500", color: "var(--text-2)", lineHeight: 1.5, textAlign: "center", maxWidth: 220, border: '1px solid var(--border)' }}>
          {explanation}
        </div>
      )}
    </motion.div>
  );
}
