import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireUser } from '@/lib/apiGuard';
import { isAdmin } from '@/lib/admin';
import { analyzeSymcatDataset } from '@/lib/ml/symcatDataset';
import type { SymcatDataset } from '@/lib/ml/report';

let cached: SymcatDataset | null = null;

export async function GET(req: Request) {
  const auth = await requireUser(req, 'ml-symcat-dataset', 30);
  if (auth.response) return auth.response;
  if (!isAdmin(auth.session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    if (!cached) {
      const filePath = path.join(process.cwd(), 'ml-service', 'artifacts', 'clinical', 'symcat_knowledge_base.json');
      if (!fs.existsSync(filePath)) throw new Error('symcat_knowledge_base.json not found');
      cached = analyzeSymcatDataset(filePath);
    }
    return NextResponse.json(cached, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ status: 'unavailable', error: 'SymCat knowledge base summary unavailable' }, { status: 503 });
  }
}
