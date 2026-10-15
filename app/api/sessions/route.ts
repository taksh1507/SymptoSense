import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/db/prisma';
import { InputError, record, text, parseAssessment, serializeAnswers, choices } from '@/lib/assessment/contracts';
import { localizeResult } from '@/lib/report/localize';
import { evaluateAssessment } from '@/lib/assessment/evaluate';
import { mapAnswersToMLFeatures } from '@/lib/ml/featureMapper';
import { predict } from '@/lib/ml/service';
import { allowRequest } from '@/lib/rateLimit';
import { readJson } from '@/lib/http';

async function caller() { const session = await getServerSession(authOptions); return (session?.user as { id?: string } | undefined)?.id; }
function errorResponse(error: unknown) { console.error('[sessions]', error instanceof InputError ? error.message : 'Request failed'); return NextResponse.json({ error: error instanceof InputError ? error.message : 'Could not process assessment' }, { status: error instanceof InputError ? 400 : 500 }); }
export async function POST(req: NextRequest) {
  try {
    const userId = await caller(); if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!await allowRequest(req, 'sessions-create:' + userId, 10)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    const body = record(await readJson(req));
    if (body.isSelf !== undefined && typeof body.isSelf !== 'boolean') throw new InputError('Invalid person type');
    const created = await prisma.testSession.create({ data: {
      userId, personName: body.personName ? text(body.personName, 'patient name', 100) : 'Myself', isSelf: body.isSelf !== false,
      relation: body.relation ? choices(body.relation, 'relation', ['Parent', 'Child', 'Spouse', 'Sibling', 'Friend', 'Other']) : null,
      gender: body.gender ? choices(body.gender, 'gender', ['Male', 'Female', 'Other', 'Prefer not to say']) : null,
      language: choices(body.language ?? 'en', 'language', ['en', 'hi', 'mr']), answers: '[]',
    } });
    return NextResponse.json({ sessionId: created.id });
  } catch (e) { return errorResponse(e); }
}
export async function PATCH(req: NextRequest) {
  try {
    const userId = await caller(); if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!await allowRequest(req, 'sessions-complete:' + userId, 10)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    const body = record(await readJson(req)); const sessionId = text(body.sessionId, 'sessionId', 100);
    const existing = await prisma.testSession.findFirst({ where: { id: sessionId, userId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const assessment = parseAssessment(body.assessment);
    const serialized = JSON.stringify(assessment);
    if (existing.completed) {
      if (existing.assessmentPayload !== serialized) return NextResponse.json({ error: 'Completed assessments cannot be changed' }, { status: 409 });
      return NextResponse.json({ success: true, result: storedResult(existing) });
    }
    const result = evaluateAssessment(assessment);
    const features = { ...mapAnswersToMLFeatures(assessment), rule_score: result.score, risk_level: { Low: 0, Medium: 1, High: 2 }[result.urgency] };
    const start = Date.now(); const prediction = await predict(features);
    result.confidenceScore = prediction.confidence; result.confidenceLevel = prediction.confidenceLevel; result.modelVersion = prediction.modelVersion;
    result.confidenceExplanation = prediction.confidence == null ? 'Model score unavailable. The rule-based triage result is still shown.' : 'Heuristic model score based on input patterns; not a probability that this assessment is correct.';
    Object.assign(result, localizeResult(result, assessment.language));
    await prisma.$transaction(async tx => {
      const updated = await tx.testSession.updateMany({ where: { id: sessionId, userId, completed: false }, data: {
        answers: JSON.stringify(serializeAnswers(assessment)), assessmentPayload: serialized, language: assessment.language,
        score: result.score, urgency: result.urgency, factors: JSON.stringify(result.factors), primaryCategory: result.primaryCategory,
        recommendation: result.recommendation, confidenceScore: result.confidenceScore, confidenceLevel: result.confidenceLevel,
        confidenceExplanation: result.confidenceExplanation, riskReasoning: result.riskReasoning, riskSummary: result.riskSummary,
        riskFactors: JSON.stringify(result.riskFactors), primaryAction: result.primaryAction, recommendationSteps: JSON.stringify(result.recommendationSteps),
        keyInsights: JSON.stringify(result.keyInsights), ruleVersion: result.ruleVersion, modelVersion: result.modelVersion, completed: true,
      } });
      if (updated.count === 0) return;
      await tx.predictionLog.create({ data: { testSessionId: sessionId, userId, features: JSON.stringify(features), ruleScore: result.score,
        predictedConfidence: prediction.confidence, confidenceLevel: prediction.confidenceLevel, mlAvailable: prediction.confidence != null,
        modelVersion: prediction.modelVersion, latencyMs: Date.now() - start } });
      await tx.followUp.upsert({ where: { testSessionId: sessionId }, create: { testSessionId: sessionId, scheduledAt: new Date(Date.now() + 3 * 86400000) }, update: {} });
    });
    const saved = await prisma.testSession.findUniqueOrThrow({ where: { id: sessionId } });
    if (saved.assessmentPayload !== serialized) return NextResponse.json({ error: 'Completed assessments cannot be changed' }, { status: 409 });
    return NextResponse.json({ success: true, result: storedResult(saved) });
  } catch (e) { return errorResponse(e); }
}
function storedResult(s: { score: number | null; urgency: string | null; factors: string | null; recommendation: string | null; primaryCategory: string | null; confidenceScore: number | null; confidenceLevel: string | null; confidenceExplanation: string | null; riskReasoning: string | null; riskSummary: string | null; riskFactors: string | null; primaryAction: string | null; recommendationSteps: string | null; keyInsights: string | null; ruleVersion: string | null; modelVersion: string | null }) {
  const array = (value: string | null) => { try { const parsed = JSON.parse(value ?? '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };
  return { ...s, factors: array(s.factors), riskFactors: array(s.riskFactors), recommendationSteps: array(s.recommendationSteps), keyInsights: array(s.keyInsights) };
}
export async function GET(req: NextRequest) {
  try {
    const userId = await caller(); if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const id = req.nextUrl.searchParams.get('sessionId');
    if (id) { const found = await prisma.testSession.findFirst({ where: { id, userId } }); return found ? NextResponse.json(found) : NextResponse.json({ error: 'Not found' }, { status: 404 }); }
    const page = Math.floor(Math.max(1, Math.min(100000, Number(req.nextUrl.searchParams.get('page') ?? 1) || 1)));
    const take = 20;
    const search = (req.nextUrl.searchParams.get('search') ?? '').trim().slice(0,100);
    const subject = req.nextUrl.searchParams.get('subject');
    const where = { userId, completed: true, ...(subject === 'self' ? { isSelf: true } : subject === 'family' ? { isSelf: false } : {}), ...(search ? { OR: [{ personName: { contains: search } }, { primaryCategory: { contains: search } }] } : {}) };
    if (req.nextUrl.searchParams.get('view') === 'family') {
      const members = await prisma.testSession.groupBy({ by: ['personName','relation','gender'], where: { userId, completed: true, isSelf: false }, _count: { id: true }, _max: { createdAt: true }, orderBy: { _max: { createdAt: 'desc' } } });
      return NextResponse.json({ members: members.map(m => ({ name: m.personName, relation: m.relation, gender: m.gender, assessmentCount: m._count.id, lastAssessment: m._max.createdAt })) });
    }
    const [sessions, total] = await prisma.$transaction([prisma.testSession.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * take, take }), prisma.testSession.count({ where })]);
    return NextResponse.json({ sessions, total, page, pageSize: take });
  } catch (e) { return errorResponse(e); }
}
