import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { requireUser } from '@/lib/apiGuard';
import { readJson } from '@/lib/http';
import { DISEASE_SYMPTOMS, DISEASE_SYMPTOM_VOCABULARY } from '@/lib/ml/disease';
export async function POST(req: Request) {
  const auth = await requireUser(req, 'ml-extract', 20); if (auth.response) return auth.response;
  let body;
  try {
    body = await readJson(req, 12000) as { text?: unknown; language?: unknown };
    if (!body || typeof body.text !== 'string' || !body.text.trim() || body.text.length > 3000 || (body.language !== undefined && !['English', 'Hindi', 'Marathi', 'en', 'hi', 'mr'].includes(String(body.language)))) throw new Error('Invalid input');
  } catch { return NextResponse.json({ error: 'Provide symptom text in English, Hindi or Marathi' }, { status: 400 }); }
  const unavailable = () => NextResponse.json({ status: 'unavailable', fallback: 'questionnaire', error: 'Symptom extraction unavailable; continue the existing question flow' }, { status: 503 });
  if (!process.env.GROQ_API_KEY) return unavailable();
  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 6000, maxRetries: 0 });
    const completion = await client.chat.completions.create({ model: 'llama-3.3-70b-versatile', temperature: 0, max_tokens: 400, response_format: { type: 'json_object' }, messages: [
      { role: 'system', content: 'Extract only explicitly affirmed current symptoms from English, Hindi or Marathi text. Exclude negated, hypothetical, family-history and uncertain symptoms. Do not extract antecedents unless the patient explicitly states them. Never diagnose or infer symptoms from a disease name. Return only JSON {"symptoms": [evidence_code]}. Use this fixed evidence-code and English-question vocabulary: ' + JSON.stringify(DISEASE_SYMPTOM_VOCABULARY.map(v => ({ code: v.code, name: v.name }))) },
      { role: 'user', content: body.text },
    ] });
    const result = JSON.parse(completion.choices[0]?.message.content ?? '{}');
    if (Object.keys(result).some(k => k !== 'symptoms') || !Array.isArray(result.symptoms) || result.symptoms.length > 132 || result.symptoms.some((s: unknown) => typeof s !== 'string' || !DISEASE_SYMPTOMS.includes(s))) throw new Error('Invalid extraction');
    return NextResponse.json({ symptoms: [...new Set(result.symptoms)], source: 'groq', fallback: result.symptoms.length ? null : 'questionnaire' });
  } catch { return unavailable(); }
}
