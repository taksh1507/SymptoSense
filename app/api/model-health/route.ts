import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getModelHealthStats, fetchMlReport, triggerMlRetrain } from "@/lib/db/modelHealth";

function getUserId(session: Session | null): string | undefined {
  return (session?.user as { id?: string } | undefined)?.id;
}

function isAdmin(session: Session | null): boolean {
  const email = session?.user?.email?.toLowerCase();
  const allowlist = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length === 0) return true;
  return !!email && allowlist.includes(email);
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
    const body = await req.json().catch(() => ({}));
    if (body.action === "retrain") {
      const result = await triggerMlRetrain();
      return NextResponse.json(result, { status: result.ok ? 200 : 502 });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[POST /api/model-health] Error:", e);
    return NextResponse.json({ error: "Failed to trigger action" }, { status: 500 });
  }
}