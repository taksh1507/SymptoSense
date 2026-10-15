import { prisma } from "./prisma";
import { mlBaseUrl } from "@/lib/ml/service";

export interface ModelHealthStats {
  predictionCount: number;
  predictionCountToday: number;
  mlUnavailableRate: number;
  avgLatencyMs: number;
  avgConfidence: number;
  followUpTotal: number;
  followUpResponded: number;
  followUpDuePending: number;
}

function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getModelHealthStats(): Promise<ModelHealthStats> {
  const [total, today, unavailable, followUps, agg] = await Promise.all([
    prisma.predictionLog.count(),
    prisma.predictionLog.count({ where: { createdAt: { gte: startOfDay() } } }),
    prisma.predictionLog.count({ where: { mlAvailable: false } }),
    prisma.followUp.findMany({ select: { status: true, scheduledAt: true } }),
    prisma.predictionLog.aggregate({
      _avg: { latencyMs: true, predictedConfidence: true },
    }),
  ]);

  const now = new Date();
  const responded = followUps.filter((f) => f.status === "responded").length;
  const duePending = followUps.filter(
    (f) => f.status === "pending" && f.scheduledAt <= now
  ).length;

  return {
    predictionCount: total,
    predictionCountToday: today,
    mlUnavailableRate: total ? Math.round((unavailable / total) * 1000) / 10 : 0,
    avgLatencyMs: Math.round(agg._avg.latencyMs ?? 0),
    avgConfidence: agg._avg.predictedConfidence ?? 0,
    followUpTotal: followUps.length,
    followUpResponded: responded,
    followUpDuePending: duePending,
  };
}

export function getMlServerUrl(): string { return mlBaseUrl(); }

export async function fetchMlReport(timeoutMs = 5000): Promise<unknown | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const token = process.env.RETRAIN_TOKEN;
      if (token) {
        const res = await fetch(`${getMlServerUrl()}/api/retrain/report`, {
          headers: { "X-Retrain-Token": token },
          signal: controller.signal,
        });
        if (res.ok) return await res.json();
      }
    } finally {
      clearTimeout(t);
    }
  } catch {}

  // Fallback to local file if available
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const reportPath = path.join(process.cwd(), "ml-service", "retrain_report.json");
    if (fs.existsSync(reportPath)) {
      return JSON.parse(fs.readFileSync(reportPath, "utf-8"));
    }
  } catch {}

  return null;
}

export async function triggerMlRetrain(): Promise<{ ok: boolean; detail?: string }> {
  const token = process.env.RETRAIN_TOKEN;
  if (!token) return { ok: false, detail: "Retraining is not configured." };
  try {
    const res = await fetch(`${getMlServerUrl()}/api/retrain`, {
      signal: AbortSignal.timeout(5000),
      method: "POST",
      headers: token ? { "X-Retrain-Token": token } : {},
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, detail: text.slice(0, 200) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, detail: String(e) };
  }
}