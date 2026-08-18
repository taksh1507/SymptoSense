import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/db/prisma";

function getUserId(session: Session | null): string | undefined {
  return (session?.user as { id?: string } | undefined)?.id;
}

async function assertOwnership(session: Session | null, sessionId: string): Promise<boolean> {
  const userId = getUserId(session);
  if (!userId) return false;
  const existing = await prisma.testSession.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  });
  return !!existing && existing.userId === userId;
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

    const where = sessionId ? { testSessionId: sessionId } : {};
    if (sessionId && !(await assertOwnership(session, sessionId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const followUps = await prisma.followUp.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Only ever return the caller's own data.
    const sessionIds = [...new Set(followUps.map((f) => f.testSessionId))];
    const owned = await prisma.testSession.findMany({
      where: { id: { in: sessionIds }, userId },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((s) => s.id));
    const filtered = followUps.filter((f) => ownedIds.has(f.testSessionId));

    return NextResponse.json(filtered);
  } catch (e) {
    console.error("[GET /api/followups] Error:", e);
    return NextResponse.json({ error: "Failed to fetch follow-ups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, contactedDoctor, diagnosis, resolved, improved, notes } = body;
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }
    if (!(await assertOwnership(session, sessionId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const data = {
      status: "responded",
      respondedAt: now,
      contactedDoctor: typeof contactedDoctor === "boolean" ? contactedDoctor : null,
      diagnosis: typeof diagnosis === "string" && diagnosis.trim() !== "" ? diagnosis.trim().slice(0, 500) : null,
      resolved: ["yes", "no", "partial"].includes(resolved) ? resolved : null,
      improved: ["worse", "same", "better", "recovered"].includes(improved) ? improved : null,
      notes: typeof notes === "string" && notes.trim() !== "" ? notes.trim().slice(0, 2000) : null,
    };

    const existing = await prisma.followUp.findFirst({
      where: { testSessionId: sessionId, status: "pending" },
    });

    const followUp = existing
      ? await prisma.followUp.update({ where: { id: existing.id }, data })
      : await prisma.followUp.create({
          data: { testSessionId: sessionId, scheduledAt: now, ...data },
        });

    return NextResponse.json(followUp);
  } catch (e) {
    console.error("[POST /api/followups] Error:", e);
    return NextResponse.json({ error: "Failed to record outcome" }, { status: 500 });
  }
}