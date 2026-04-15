import { NextResponse } from "next/server";

const ML_SERVER_URL = process.env.ML_SERVER_URL ?? "http://localhost:8000/predict-confidence";
const ML_TIMEOUT_MS = 5000; // 5 seconds max — never let the loading screen hang

const FALLBACK = { confidence: 0.7, confidenceLevel: "Medium" };

export async function POST(req: Request) {
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
      // Return neutral fallback — don't propagate the error to the client
      return NextResponse.json(FALLBACK);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("[ML Proxy] Request timed out after", ML_TIMEOUT_MS, "ms — using fallback");
    } else {
      console.error("[ML Proxy] Error:", error);
    }
    return NextResponse.json(FALLBACK);
  }
}
