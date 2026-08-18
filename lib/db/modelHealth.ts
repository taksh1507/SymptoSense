import { prisma } from "./prisma";

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

export function getMlServerUrl(): string {
  if (process.env.ML_SERVER_URL) return process.env.ML_SERVER_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:8000";
}

export async function fetchMlReport(timeoutMs = 5000): Promise<unknown | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${getMlServerUrl()}/api/retrain/report`, {
        signal: controller.signal,
      });
      if (!res.ok) return null;
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  } catch {
    return null;
  }
}

export async function triggerMlRetrain(): Promise<{ ok: boolean; detail?: string }> {
  const token = process.env.RETRAIN_TOKEN;
  try {
    const res = await fetch(`${getMlServerUrl()}/api/retrain`, {
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