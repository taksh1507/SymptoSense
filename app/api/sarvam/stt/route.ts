// API Route: /api/sarvam/stt
// Proxies speech-to-text requests to Sarvam AI.
// Accepts multipart/form-data with audio file blob.

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/apiGuard";
import { readMultipart } from "@/lib/http";
import { choices, InputError } from "@/lib/assessment/contracts";

const SARVAM_BASE_URL = process.env.SARVAM_BASE_URL ?? "https://api.sarvam.ai";
const SARVAM_API_KEY = process.env.SARVAM_API_KEY ?? "";

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "stt", 30); if (auth.response) return auth.response;
  if (!SARVAM_API_KEY) {
    return NextResponse.json(
      { error: "SARVAM_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const formData = await readMultipart(request, 4 * 1024 * 1024);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0 || !["audio/webm", "audio/wav", "audio/ogg", "audio/mp4", "audio/mpeg"].includes(file.type.split(";")[0])) return NextResponse.json({ error: "Unsupported audio file" }, { status: 400 });
    const language = choices(formData.get("language") ?? "hi-IN", "language", ["en-IN", "hi-IN", "mr-IN"]);

    if (!file) {
      return NextResponse.json(
        { error: "Missing audio file in form data" },
        { status: 400 }
      );
    }

    // Forward to Sarvam as multipart/form-data
    const sarvamForm = new FormData();
    sarvamForm.append("file", file, file.name);
    sarvamForm.append("language_code", language);
    sarvamForm.append("model", "saarika:v2.5");

    const sarvamResponse = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        "api-subscription-key": SARVAM_API_KEY,
        // Do NOT set Content-Type — browser/fetch sets multipart boundary automatically
      },
      body: sarvamForm,
    });

    if (!sarvamResponse.ok) {
      console.error("[STT] Upstream status:", sarvamResponse.status);
      return NextResponse.json(
        { error: `Sarvam STT failed: ${sarvamResponse.status}` },
        { status: sarvamResponse.status }
      );
    }

    const data = await sarvamResponse.json();
    const transcript: string = data.transcript ?? "";

    return NextResponse.json({ transcript });
  } catch (err) {
    if (err instanceof InputError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[STT] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
