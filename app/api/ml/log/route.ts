import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createPredictionLog } from "@/lib/db/predictionLog";

function getUserId(session: Session | null): string | undefined {
  return (session?.user as { id?: string } | undefined)?.id;
}

// Stores one real ML inference for the continuous-retraining loop.
// The payload is an anonymous numeric feature vector (no free text), so
// guest triages are recorded without PII. Recommends future rate-limiting.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    const body = await req.json();
    const features = body?.features;

    if (!features || typeof features !== "object" || Array.isArray(features)) {
      return NextResponse.json({ error: "features object required" }, { status: 400 });
    }

    const featuresJson = JSON.stringify(features);
    if (featuresJson.length > 20000) {
      return NextResponse.json({ error: "features payload too large" }, { status: 400 });
    }

    await createPredictionLog({
      testSessionId: typeof body.testSessionId === "string" ? body.testSessionId : null,
      userId,
      features,
      ruleScore: typeof body.ruleScore === "number" ? body.ruleScore : null,
      predictedConfidence:
        typeof body.predictedConfidence === "number" ? body.predictedConfidence : null,
      confidenceLevel: typeof body.confidenceLevel === "string" ? body.confidenceLevel : null,
      mlAvailable: typeof body.mlAvailable === "boolean" ? body.mlAvailable : true,
      modelVersion: typeof body.modelVersion === "string" ? body.modelVersion : null,
      latencyMs: typeof body.latencyMs === "number" ? body.latencyMs : null,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[POST /api/ml/log] Error:", e);
    return NextResponse.json({ error: "Failed to log prediction" }, { status: 500 });
  }
}