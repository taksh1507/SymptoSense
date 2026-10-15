import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/apiGuard';
import { isAdmin } from '@/lib/admin';
import { mlBaseUrl } from '@/lib/ml/service';

export async function GET(req: Request) {
  const auth = await requireUser(req, 'ml-report', 30);
  if (auth.response) return auth.response;
  if (!isAdmin(auth.session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const response = await fetch(mlBaseUrl() + '/ml-report', { signal: AbortSignal.timeout(10000), cache: 'no-store' });
    if (!response.ok) throw new Error('Unavailable');
    const report = await response.json();
    if (report.schema_version !== 1 || !report.dataset || !report.evaluation || !report.training || !report.explainability || !report.calibration || !report.urgency) {
      throw new Error('Invalid report');
    }
    return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ status: 'unavailable', error: 'Training report unavailable' }, { status: 503 });
  }
}
