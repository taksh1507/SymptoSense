import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/apiGuard';
import { readJson } from '@/lib/http';
import { parseDiseaseRequest, requestDisease } from '@/lib/ml/disease';
import { explainDisease } from '@/lib/ml/diseaseExplanation';
import { emergencyFindings } from '@/lib/assessment/findings';
export async function POST(req: Request) {
  const auth = await requireUser(req, 'ml-disease', 30); if (auth.response) return auth.response;
  let input;
  try { input = parseDiseaseRequest(await readJson(req, 16000)); }
  catch { return NextResponse.json({ error: 'Invalid disease request' }, { status: 400 }); }
  const redFlag = emergencyFindings(input.symptoms).length > 0;
  try {
    const result = await requestDisease(input);
    if (redFlag) { result.urgency = 'High'; result.red_flag_override = true; }
    result.explanation = await explainDisease(result, req.headers.get('X-Assessment-Language') === 'hi' ? 'Hindi' : req.headers.get('X-Assessment-Language') === 'mr' ? 'Marathi' : 'English');
    return NextResponse.json(result);
  } catch (error) {
    const failure = error as { status?: number; detail?: unknown };
    if (failure.status === 422) return NextResponse.json({ error: 'No usable known symptoms', detail: failure.detail, red_flag_override: redFlag, urgency: redFlag ? 'High' : null }, { status: 422 });
    return NextResponse.json({ status: 'unavailable', error: 'Disease model unavailable. Continue with the questionnaire and rule triage.', confidence: null, red_flag_override: redFlag, urgency: redFlag ? 'High' : null }, { status: 503 });
  }
}
