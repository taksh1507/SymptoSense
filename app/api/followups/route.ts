import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/apiGuard';
import { prisma } from '@/lib/db/prisma';
import { InputError, record, text, choices } from '@/lib/assessment/contracts';
import { readJson } from '@/lib/http';
export async function GET(req: NextRequest) {
  const auth = await requireUser(req, 'followups-read', 60); if (auth.response) return auth.response;
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId');
    const rows = await prisma.followUp.findMany({ where: { ...(sessionId ? { testSessionId: sessionId } : {}), testSession: { userId: auth.id } }, orderBy: { createdAt: 'desc' }, take: 50 });
    return NextResponse.json(rows);
  } catch { return NextResponse.json({ error: 'Failed to load check-ins' }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  const auth = await requireUser(req, 'followups-write', 10); if (auth.response) return auth.response;
  try {
    const b = record(await readJson(req, 5000)); const sessionId = text(b.sessionId, 'sessionId', 100);
    const assessment = await prisma.testSession.findFirst({ where: { id: sessionId, userId: auth.id, completed: true }, select: { id: true } });
    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (b.contactedDoctor != null && typeof b.contactedDoctor !== 'boolean') throw new InputError('Invalid contactedDoctor');
    const data = { status: 'responded', respondedAt: new Date(), contactedDoctor: b.contactedDoctor == null ? null : b.contactedDoctor as boolean,
      diagnosis: b.diagnosis ? text(b.diagnosis, 'diagnosis', 500) : null,
      resolved: b.resolved ? choices(b.resolved, 'resolved', ['yes', 'no', 'partial']) : null,
      improved: choices(b.improved, 'improved', ['worse', 'same', 'better', 'recovered']), notes: b.notes ? text(b.notes, 'notes', 2000) : null,
      reviewedCorrect: null, reviewedAt: null, reviewedBy: null,
    };
    const row = await prisma.followUp.upsert({ where: { testSessionId: sessionId }, create: { testSessionId: sessionId, scheduledAt: new Date(), ...data }, update: data });
    return NextResponse.json(row);
  } catch (e) { return NextResponse.json({ error: e instanceof InputError ? e.message : 'Failed to record check-in' }, { status: e instanceof InputError ? 400 : 500 }); }
}
