import { prisma } from "./prisma";

export async function createPredictionLog(data: {
  testSessionId?: string | null;
  userId?: string | null;
  features: Record<string, unknown>;
  ruleScore?: number | null;
  predictedConfidence?: number | null;
  confidenceLevel?: string | null;
  mlAvailable?: boolean;
  modelVersion?: string | null;
  latencyMs?: number | null;
}) {
  return prisma.predictionLog.create({
    data: {
      testSessionId: data.testSessionId ?? null,
      userId: data.userId ?? null,
      features: JSON.stringify(data.features),
      ruleScore: data.ruleScore ?? null,
      predictedConfidence: data.predictedConfidence ?? null,
      confidenceLevel: data.confidenceLevel ?? null,
      mlAvailable: data.mlAvailable ?? true,
      modelVersion: data.modelVersion ?? null,
      latencyMs: data.latencyMs ?? null,
    },
  });
}

export async function getPredictionLogs(args?: {
  take?: number;
  since?: Date;
}) {
  return prisma.predictionLog.findMany({
    where: args?.since ? { createdAt: { gte: args.since } } : undefined,
    orderBy: { createdAt: "desc" },
    take: args?.take ?? 500,
  });
}

export async function countPredictionLogs(since?: Date) {
  return prisma.predictionLog.count({
    where: since ? { createdAt: { gte: since } } : undefined,
  });
}