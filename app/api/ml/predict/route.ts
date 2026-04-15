import { NextResponse } from "next/server";

const ML_SERVER_URL = process.env.ML_SERVER_URL ?? "http://localhost:8000/predict-confidence";

const FALLBACK = { confidence: 0.5, confidenceLevel: "Medium" };

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // rule_score may arrive as 0–1 (normalized) or 0–100 (raw).
    // The Python FastAPI server validates ge=0, le=100, so always send 0–100.
    const normalizedBody = { ...body };
    if (typeof normalizedBody.rule_score === 'number' && normalizedBody.rule_score <= 1.0) {
      normalizedBody.rule_score = Math.round(normalizedBody.rule_score * 100);
    }

    const response = await fetch(ML_SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizedBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[ML Proxy] Server returned ${response.status}:`, errorText);
      // Return neutral fallback — don't propagate the error to the client
      return NextResponse.json(FALLBACK);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("ML Proxy Error:", error);
    return NextResponse.json(FALLBACK);
  }
}
