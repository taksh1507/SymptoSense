/**
 * Single source of truth for urgency thresholds across the app.
 * The engine, AppContext recommendations, and report pages all read from here
 * so they can never drift apart.
 */

export const URGENCY_THRESHOLDS = {
  medium: 28,
  high: 55,
} as const;

export type UrgencyClass = "High" | "Medium" | "Low";

export function classifyUrgency(score: number): UrgencyClass {
  if (score >= URGENCY_THRESHOLDS.high) return "High";
  if (score >= URGENCY_THRESHOLDS.medium) return "Medium";
  return "Low";
}

/**
 * Thresholds used purely for display color coding on cards/gauges.
 * Kept in sync with the urgency thresholds.
 */
export const COLOR_THRESHOLDS = {
  high: URGENCY_THRESHOLDS.high,
  medium: URGENCY_THRESHOLDS.medium,
} as const;
