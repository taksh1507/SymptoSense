// API Route: /api/sarvam/translate
// Proxies translation requests to Sarvam AI.

import { NextRequest, NextResponse } from "next/server";

const SARVAM_BASE_URL = process.env.SARVAM_BASE_URL ?? "https://api.sarvam.ai";
const SARVAM_API_KEY = process.env.SARVAM_API_KEY ?? "";

export async function POST(request: NextRequest) {
  if (!SARVAM_API_KEY) {
    return NextResponse.json(
      { error: "SARVAM_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { text, from, to } = body as {
      text: string;
      from: string; // e.g. "hi-IN"
      to: string;   // e.g. "en-IN"
    };

    if (!text || !from || !to) {
      return NextResponse.json(
        { error: "Missing fields: text, from, to" },
        { status: 400 }
      );
    }

    const sarvamResponse = await fetch(`${SARVAM_BASE_URL}/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": SARVAM_API_KEY,
      },
      body: JSON.stringify({
        input: text,
        source_language_code: from,
        target_language_code: to,
        speaker_gender: "Female",
        mode: "formal",
        model: "mayura:v1",
        enable_preprocessing: false,
      }),
    });

    if (!sarvamResponse.ok) {
      const errText = await sarvamResponse.text();
      console.error("[Translate] Sarvam error:", errText);
      return NextResponse.json(
        { error: `Sarvam translate failed: ${sarvamResponse.status}` },
        { status: sarvamResponse.status }
      );
    }

    const data = await sarvamResponse.json();
    const translated_text: string = data.translated_text ?? text;

    return NextResponse.json({ translated_text });
  } catch (err) {
    console.error("[Translate] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
