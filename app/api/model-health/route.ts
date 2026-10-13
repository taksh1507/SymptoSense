import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { allowRequest } from "@/lib/rateLimit";
import { readJson } from "@/lib/http";
import { prisma } from "@/lib/db/prisma";
import { record, text, InputError } from "@/lib/assessment/contracts";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getModelHealthStats, fetchMlReport, triggerMlRetrain } from "@/lib/db/modelHealth";

function getUserId(session: Session | null): string | undefined {
  return (session?.user as { id?: string } | undefined)?.id;
}



export async function GET() {
  const session = await getServerSession(authOptions);
  if (!getUserId(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const stats = await getModelHealthStats();
    const mlReport = await fetchMlReport();
    return NextResponse.json({ stats, mlReport });
  } catch (e) {
    console.error("[GET /api/model-health] Error:", e);
    return NextResponse.json({ error: "Failed to load model health" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!getUserId(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    if (!await allowRequest(req, "admin-actions:" + getUserId(session), 3, 3600000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const body = record(await readJson(req, 2000));
    if (body.action === "review") {
      if (typeof body.reviewedCorrect !== "boolean") return NextResponse.json({ error: "reviewedCorrect must be boolean" }, { status: 400 });
      const reviewed = await prisma.followUp.update({ where: { id: text(body.followUpId, "followUpId", 100), status: "responded" }, data: { reviewedCorrect: body.reviewedCorrect, reviewedAt: new Date(), reviewedBy: getUserId(session) } });
      return NextResponse.json({ success: true, id: reviewed.id });
    }
    if (body.action === "retrain") {
      const result = await triggerMlRetrain();
      return NextResponse.json(result, { status: result.ok ? 200 : 502 });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    if (e instanceof InputError) return NextResponse.json({ error: e.message }, { status: 400 });
    if ((e as { code?: string }).code === "P2025") return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
    console.error("[POST /api/model-health] Error:", e);
    return NextResponse.json({ error: "Failed to trigger action" }, { status: 500 });
  }
}