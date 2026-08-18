import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/db/prisma";

function getUserId(session: Session | null): string | undefined {
  return (session?.user as { id?: string } | undefined)?.id;
}

function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/[\s().-]/g, "");
  if (!digits) return null;
  if (!/^\+?[0-9]{8,15}$/.test(digits)) return null;
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, image: true, phone: true },
    });
    return NextResponse.json(user ?? {});
  } catch (e) {
    console.error("[GET /api/profile] Error:", e);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
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
    if (!("phone" in body)) {
      return NextResponse.json({ error: "phone required" }, { status: 400 });
    }

    const phone = normalizePhone(body.phone as unknown);
    if (!phone) {
      return NextResponse.json(
        { error: "Enter a valid phone number (8–15 digits, e.g. +91XXXXXXXXXX)" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { phone },
      select: { phone: true },
    });

    return NextResponse.json({ phone: user.phone });
  } catch (e) {
    console.error("[POST /api/profile] Error:", e);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}