// API Route: /api/sarvam/stt
// Proxies speech-to-text requests to Sarvam AI.
// Accepts multipart/form-data with audio file blob.

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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const language = (formData.get("language") as string) ?? "hi-IN";

    if (!file) {
      return NextResponse.json(
        { error: "Missing audio file in form data" },
        { status: 400 }
      );
    }

    // Forward to Sarvam as multipart/form-data
    const sarvamForm = new FormData();
    sarvamForm.append("file", file, "recording.webm");
    sarvamForm.append("language_code", language);
    sarvamForm.append("model", "saarika:v2.5");

    const sarvamResponse = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
      method: "POST",
      headers: {
        "api-subscription-key": SARVAM_API_KEY,
        // Do NOT set Content-Type — browser/fetch sets multipart boundary automatically
      },
      body: sarvamForm,
    });

    if (!sarvamResponse.ok) {
      const errText = await sarvamResponse.text();
      console.error("[STT] Sarvam error:", errText);
      return NextResponse.json(
        { error: `Sarvam STT failed: ${sarvamResponse.status}` },
        { status: sarvamResponse.status }
      );
    }

    const data = await sarvamResponse.json();
    const transcript: string = data.transcript ?? "";

    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("[STT] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
