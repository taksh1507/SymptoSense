// API Route: /api/sarvam/tts
// Proxies text-to-speech requests to Sarvam AI.
// The API key is injected server-side — never exposed to the browser.

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
    const { text, language } = body as { text: string; language: string };

    if (!text || !language) {
      return NextResponse.json(
        { error: "Missing required fields: text, language" },
        { status: 400 }
      );
    }

    const sarvamResponse = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": SARVAM_API_KEY,
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: language, // e.g. "hi-IN" | "en-IN"
        speaker: "anushka",
        model: "bulbul:v1",
      }),
    });

    if (!sarvamResponse.ok) {
      const errText = await sarvamResponse.text();
      console.error("[TTS] Sarvam error:", errText);
      return NextResponse.json(
        { error: `Sarvam TTS failed: ${sarvamResponse.status}` },
        { status: sarvamResponse.status }
      );
    }

    const data = await sarvamResponse.json();
    // Sarvam returns { audios: [base64string] }
    const audio: string = data.audios?.[0] ?? "";

    return NextResponse.json({ audio });
  } catch (err) {
    console.error("[TTS] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
