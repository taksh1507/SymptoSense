import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/apiGuard';
import { prisma } from '@/lib/db/prisma';
import { record, InputError } from '@/lib/assessment/contracts';
import { readJson } from '@/lib/http';
export async function GET(req: NextRequest) {
  const auth = await requireUser(req, 'profile-read', 60); if (auth.response) return auth.response;
  const user = await prisma.user.findUnique({ where: { id: auth.id }, select: { name: true, email: true, image: true, phone: true, emailReminders: true, whatsappReminders: true } });
  return NextResponse.json(user ?? {});
}
export async function POST(req: NextRequest) {
  const auth = await requireUser(req, 'profile-write', 10); if (auth.response) return auth.response;
  try {
    const b = record(await readJson(req, 2000));
    const data: { phone?: string | null; emailReminders?: boolean; whatsappReminders?: boolean } = {};
    if ('phone' in b) {
      if (b.phone !== null && typeof b.phone !== 'string') throw new InputError('Invalid phone');
      const phone = typeof b.phone === 'string' ? b.phone.replace(/[\s().-]/g, '') : '';
      if (phone && !/^\+[1-9][0-9]{7,14}$/.test(phone)) throw new InputError('Use an international number beginning with +');
      data.phone = phone || null;
    }
    for (const key of ['emailReminders', 'whatsappReminders'] as const) {
      if (key in b) { if (typeof b[key] !== 'boolean') throw new InputError('Invalid notification preference'); data[key] = b[key] as boolean; }
    }
    if (!Object.keys(data).length) throw new InputError('No preferences provided');
    const existing = await prisma.user.findUniqueOrThrow({ where: { id: auth.id }, select: { phone: true, whatsappReminders: true } });
    if (data.whatsappReminders && !(data.phone ?? existing.phone)) throw new InputError('A phone number is required for WhatsApp reminders');
    if (data.phone === null) data.whatsappReminders = false;
    const result = await prisma.user.update({ where: { id: auth.id }, data, select: { phone: true, emailReminders: true, whatsappReminders: true } });
    return NextResponse.json(result);
  } catch (e) { return NextResponse.json({ error: e instanceof InputError ? e.message : 'Could not update preferences' }, { status: e instanceof InputError ? 400 : 500 }); }
}
