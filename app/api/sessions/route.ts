import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createTestSession, updateTestSessionAnswers, completeTestSession, getTestSession, getUserSessions } from "@/lib/db/sessions";

function getUserId(session: Session | null): string | undefined {
  return (session?.user as { id?: string } | undefined)?.id;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { personName = "Myself", isSelf = true, language = "en", relation = null, gender = null } = body;

    const created = await createTestSession({ userId, personName, isSelf, relation, gender, language });
    return NextResponse.json({ sessionId: created.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, answers, result } = body;

    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    const existing = await getTestSession(sessionId);
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      const found = await getTestSession(sessionId);
      if (!found) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (found.userId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json(found);
    }

    const sessions = await getUserSessions(userId);
    return NextResponse.json(sessions);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}