import { NextResponse } from 'next/server';
import { calculateRisk } from '@/lib/ai-engine/scoring/engine';
import { requireUser } from '@/lib/apiGuard';
import { readJson } from '@/lib/http';
import { record, text, choices } from '@/lib/assessment/contracts';
export async function POST(req: Request) {
  const auth = await requireUser(req, 'analyze'); if (auth.response) return auth.response;
  try {
    const b = record(await readJson(req));
    const result = calculateRisk({ symptom: text(b.symptom, 'symptom'), severity: choices(b.severity, 'severity', ['mild', 'moderate', 'severe', 'critical']),
      duration: choices(b.duration, 'duration', ['< 1 day', '1-3 days', '4-7 days', '> 1 week']),
      additional: b.additional ? text(b.additional, 'additional symptom') : 'none', history: b.history ? text(b.history, 'medical history') : 'none' });
    return NextResponse.json(result);
  } catch { return NextResponse.json({ error: 'Invalid assessment input' }, { status: 400 }); }
}
