import { NextResponse } from 'next/server';
import { mlBaseUrl } from '@/lib/ml/service';
import fs from 'node:fs';
import path from 'node:path';

export async function GET() {
  try {
    const response = await fetch(mlBaseUrl() + '/clinical-report', { signal: AbortSignal.timeout(5000), cache: 'no-store' });
    if (response.ok) {
      const report = await response.json();
      if (report.schema_version === 1 && report.dataset) {
        return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } });
      }
    }
  } catch {}

  // Fallback to local report file if microservice is busy or offline
  try {
    const localReportPath = path.join(process.cwd(), 'ml-service', 'reports', 'clinical_report.json');
    if (fs.existsSync(localReportPath)) {
      const report = JSON.parse(fs.readFileSync(localReportPath, 'utf-8'));
      return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } });
    }
  } catch {}

  return NextResponse.json({ status: 'unavailable', error: 'Clinical report unavailable' }, { status: 503 });
}
