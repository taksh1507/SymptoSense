import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const getMlUrl = () => {
  if (process.env.ML_SERVER_URL) {
    return process.env.ML_SERVER_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/predict-confidence`;
  }
  return "http://localhost:8000/predict-confidence";
};

const ML_SERVER_URL = getMlUrl();
const ML_TIMEOUT_MS = 10000; // 10 seconds max to handle Vercel cold starts

const UNAVAILABLE = { confidence: null, confidenceLevel: "unavailable" };

export async function POST(req: Request) {
  if (!rateLimit(`ml-predict:${getClientIp(req)}`, 30, 60000)) {
    return NextResponse.json(UNAVAILABLE, { status: 429 });
  }

  try {
    const body = await req.json();

    // rule_score may arrive as 0–1 (normalized) or 0–100 (raw).
    // The Python FastAPI server validates ge=0, le=100, so always send 0–100.
    const normalizedBody = { ...body };
    if (typeof normalizedBody.rule_score === 'number' && normalizedBody.rule_score <= 1.0) {
      normalizedBody.rule_score = Math.round(normalizedBody.rule_score * 100);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(ML_SERVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[ML Proxy] Server returned ${response.status}:`, errorText);
      // Report the outage explicitly instead of silently returning a fake score.
      return NextResponse.json(UNAVAILABLE, { status: 503 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("[ML Proxy] Request timed out after", ML_TIMEOUT_MS, "ms — reporting unavailable");
    } else {
      console.error("[ML Proxy] Error:", error);
    }
    return NextResponse.json(UNAVAILABLE, { status: 503 });
  }
}