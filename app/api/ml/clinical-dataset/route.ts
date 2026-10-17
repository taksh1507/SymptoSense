import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireUser } from '@/lib/apiGuard';
import { isAdmin } from '@/lib/admin';
import { analyzeClinicalDataset } from '@/lib/ml/clinicalDataset';
import type { ClinicalDataset } from '@/lib/ml/report';

let cached: ClinicalDataset | null = null;

export async function GET(req: Request) {
  const auth = await requireUser(req, 'ml-clinical-dataset', 30);
  if (auth.response) return auth.response;
  if (!isAdmin(auth.session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    if (!cached) {
      const filePath = path.join(process.cwd(), 'ml-service', 'data', 'dataset.csv');
      if (!fs.existsSync(filePath)) throw new Error('dataset.csv not found');
      cached = analyzeClinicalDataset(filePath);
    }
    return NextResponse.json(cached, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ status: 'unavailable', error: 'Clinical dataset summary unavailable' }, { status: 503 });
  }
}
