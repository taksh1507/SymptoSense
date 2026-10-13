import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { validateFeatures } from '@/lib/ml/featureMapper';
import { predict } from '@/lib/ml/service';
import { allowRequest } from '@/lib/rateLimit';
import { readJson } from '@/lib/http';
export async function POST(req: Request) {
  const session = await getServerSession(authOptions); const id = (session?.user as { id?: string })?.id;
  if (!id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!await allowRequest(req, 'predict:' + id, 30)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  try { const data = await predict(validateFeatures(await readJson(req))); return NextResponse.json(data, { status: data.confidence == null ? 503 : 200 }); }
  catch { return NextResponse.json({ error: 'Invalid feature vector' }, { status: 400 }); }
}
