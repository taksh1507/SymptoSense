import { NextRequest, NextResponse } from "next/server";
import { calculateRisk } from "@/lib/scoring/engine";
import { SurveyResult } from "@/lib/scoring/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    if (!body.symptom || !body.severity || !body.duration) {
      return NextResponse.json(
        { error: "Missing required fields: symptom, severity, duration" },
        { status: 400 }
      );
    }

    const input: SurveyResult = {
      symptom: body.symptom,
      severity: body.severity,
      duration: body.duration,
      additional: body.additional ?? "none",
      history: body.history ?? "none",
    };

    // Calculate risk
    const analysis = calculateRisk(input);

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("[Analyze API] Error:", err);
    return NextResponse.json(
      { error: "Internal server error analyzing risk" },
      { status: 500 }
    );
  }
}
