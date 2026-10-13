import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './authOptions';
import { allowRequest } from './rateLimit';
export async function requireUser(req: Request, scope: string, limit = 30) {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!await allowRequest(req, scope + ':' + id, limit)) return { response: NextResponse.json({ error: 'Too many requests' }, { status: 429 }) };
  return { id, session };
}
