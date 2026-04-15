"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Urgency } from "@/lib/scoring";

interface RiskGaugeProps {
  score: number;
  urgency: Urgency;
  explanation?: string;
}

const urgencyColors: Record<Urgency, string> = {
  Low: "#15803D",
  Medium: "#B45309",
  High: "#B91C1C",
};

export function RiskGauge({ score, urgency, explanation }: RiskGaugeProps) {
  const [displayed, setDisplayed] = useState(0);
  const color = urgencyColors[urgency];
  const size = 220;
  const strokeWidth = 12;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Arc: 270 degrees, starting from bottom-left
  const ANGLE = 270;
  const circumference = 2 * Math.PI * r;
  const arcLength = (ANGLE / 360) * circumference;

  // Animate score counter
  useEffect(() => {
    let start = 0;
    const target = score;
    const step = target / 60; // ~1s at 60fps
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

  // SVG arc: start at -225deg end at +45deg
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
      transition={{ duration: 0.5, delay: 0.2 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px",
        background: "var(--surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <svg width={size} height={size} style={{ overflow: "visible" }}>
        <defs>
          <filter id="gaugeGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <path
          d={bgPath}
          fill="none"
          stroke="var(--border-faint)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Filled arc */}
        <path
          d={bgPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength}`}
          strokeDashoffset={offset}
          filter="url(#gaugeGlow)"
          style={{
            transition: "stroke-dashoffset 0.05s linear",
          }}
        />

        {/* Center score */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--text-1)"
          fontSize="44"
          fontWeight="900"
          fontFamily="var(--font)"
          letterSpacing="-2"
        >
          {displayed}
        </text>
        <text
          x={cx}
          y={cy + 26}
          textAnchor="middle"
          fill="var(--text-3)"
          fontSize="13"
          fontFamily="var(--font)"
          fontWeight="500"
        >
          out of 100
        </text>
      </svg>

      <div
        style={{
          marginTop: 8,
          fontSize: 14,
          fontWeight: 800,
          color: "var(--text-1)",
          letterSpacing: "0.5px",
          textAlign: "center",
          textTransform: "uppercase"
        }}
      >
        Overall Risk: {urgency}
      </div>

      {explanation && (
        <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--bg)", borderRadius: "8px", fontSize: "12px", fontWeight: "500", color: "var(--text-2)", lineHeight: 1.5, textAlign: "center", maxWidth: 220, border: '1px solid var(--border)' }}>
          {explanation}
        </div>
      )}
    </motion.div>
  );
}
