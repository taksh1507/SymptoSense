import { prisma } from "./prisma";
import type { Answer, ScoreResult } from "../ai-engine/scoring/types";

export async function createTestSession(data: {
  userId?: string;
  personName: string;
  isSelf: boolean;
  relation?: string | null;
  gender?: string | null;
  language: string;
}) {
  // Retry once on connection pool timeout (P2024)
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await prisma.testSession.create({
        data: {
          userId: data.userId,
          personName: data.personName,
          isSelf: data.isSelf,
          relation: data.relation ?? null,
          gender: data.gender ?? null,
          language: data.language,
          answers: "[]",
        },
      });
    } catch (e: any) {
      if (attempt === 2 || e?.code !== 'P2024') throw e;
      console.warn('[sessions] Connection pool timeout, retrying...');
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('createTestSession: unreachable');
}

export async function updateTestSessionAnswers(
  sessionId: string,
  answers: Answer[]
) {
  return prisma.testSession.update({
    where: { id: sessionId },
    data: { answers: JSON.stringify(answers) },
  });
}

export async function completeTestSession(
  sessionId: string,
  answers: Answer[],
  result: ScoreResult
) {
  // Core fields — always supported by the Prisma client
  await prisma.testSession.update({
    where: { id: sessionId },
    data: {
      answers: JSON.stringify(answers),
      score: result.score,
      urgency: result.urgency,
      factors: JSON.stringify(result.factors),
      primaryCategory: result.primaryCategory,
      recommendation: result.recommendation,
      confidenceScore: result.confidenceScore,
      confidenceLevel: result.confidenceLevel,
      confidenceExplanation: result.confidenceExplanation,
      riskReasoning: result.riskReasoning,
      keyInsights: result.keyInsights ? JSON.stringify(result.keyInsights) : null,
      completed: true,
    },
  });

  // Extended Groq fields — written via raw SQL so they work even if the
  // Prisma client hasn't been regenerated after the schema migration.
  try {
    await prisma.$executeRaw`
      UPDATE "TestSession"
      SET
        "riskSummary"         = ${result.riskSummary ?? null},
        "riskFactors"         = ${result.riskFactors ? JSON.stringify(result.riskFactors) : null},
        "primaryAction"       = ${result.primaryAction ?? null},
        "recommendationSteps" = ${result.recommendationSteps ? JSON.stringify(result.recommendationSteps) : null}
      WHERE id = ${sessionId}
    `;
  } catch (e) {
    // Non-fatal — report detail page falls back to local engine if these are missing
    console.warn('[sessions] Extended fields write failed (run `prisma generate` to fix):', e);
  }
}

export async function getTestSession(sessionId: string) {
  return prisma.testSession.findUnique({
    where: { id: sessionId },
  });
}

export async function getUserSessions(userId: string) {
  return prisma.testSession.findMany({
    where: { userId, completed: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
