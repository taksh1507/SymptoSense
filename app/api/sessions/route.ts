import { NextRequest, NextResponse } from "next/server";
import { createTestSession, updateTestSessionAnswers, completeTestSession, getTestSession, getUserSessions } from "@/lib/db/sessions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { personName = "Myself", isSelf = true, language = "en", userId, relation = null, gender = null } = body;

    const session = await createTestSession({ userId, personName, isSelf, relation, gender, language });
    return NextResponse.json({ sessionId: session.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, answers, result } = body;

    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    if (result) {
      await completeTestSession(sessionId, answers, result);
    } else {
      await updateTestSessionAnswers(sessionId, answers);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[PATCH /api/sessions] Error:', e);
    return NextResponse.json({ error: "Failed to update session", detail: String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const userId = searchParams.get("userId");

    if (sessionId) {
      const session = await getTestSession(sessionId);
      return NextResponse.json(session);
    }

    if (userId) {
      const sessions = await getUserSessions(userId);
      return NextResponse.json(sessions);
    }

    return NextResponse.json({ error: "Provide sessionId or userId" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}
