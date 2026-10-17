import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hash } from 'bcryptjs';
import { allowRequest, getClientIp } from '@/lib/rateLimit';
import { readJson } from '@/lib/http';
import { InputError, record, text } from '@/lib/assessment/contracts';
export async function POST(req: Request) {
  if (!await allowRequest(req, 'register:' + getClientIp(req), 100, 3600000)) return NextResponse.json({ error: 'Too many registration attempts' }, { status: 429 });
  try {
    const body = record(await readJson(req, 4000));
    const email = text(body.email, 'email', 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InputError('Enter a valid email');
    if (typeof body.password !== 'string' || body.password.length < 8 || Buffer.byteLength(body.password, 'utf8') > 72) throw new InputError('Password must contain at least 8 characters and at most 72 UTF-8 bytes');
    const name = body.name ? text(body.name, 'name', 100) : email.split('@')[0];
    const password = await hash(body.password, 12);
    const user = await prisma.user.create({ data: { name, email, password }, select: { id: true, name: true, email: true } });
    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    if (e instanceof InputError) return NextResponse.json({ error: e.message }, { status: 400 });
    if ((e as { code?: string }).code === 'P2002') return NextResponse.json({ error: 'Account cannot be registered with these details' }, { status: 409 });
    console.error('[register] Failed to create account');
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
