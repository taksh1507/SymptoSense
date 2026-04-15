import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
    const { features, clinicalContext, language } = body;

    const ctx = clinicalContext || {};
    const symptomStr   = (ctx.primarySymptom || 'symptoms').replace(/_/g, ' ');
    const additionalStr = (ctx.additionalSymptoms || [])
      .filter((s: string) => s && s !== 'none')
      .map((s: string) => s.replace(/_/g, ' '))
      .slice(0, 2).join(', ') || 'none';
    const historyStr = (ctx.medicalHistory || [])
      .filter((h: string) => h && h !== 'none')
      .map((h: string) => h.replace(/_/g, ' '))
      .join(', ') || 'none';
    const riskLevel  = ctx.riskLevel  || 'Medium';
    const riskScore  = ctx.riskScore  ?? features?.rule_score ?? 50;
    const severity   = ctx.severity   || 'moderate';
    const duration   = ctx.duration   || 'unknown';

    const systemPrompt = `You are a medical triage reasoning engine. Output ONLY valid JSON with no extra text.`;

    const userPrompt = `Generate complete clinical reasoning for this patient assessment.

PATIENT DATA:
- Primary symptom: ${symptomStr}
- Severity: ${severity}
- Duration: ${duration}
- Additional symptoms: ${additionalStr}
- Medical history: ${historyStr}
- Risk level: ${riskLevel} (score: ${riskScore}/100)
- Confidence: ${features?.confidence_score ?? 'N/A'}%
- Symptom consistency: ${features?.symptom_consistency_score ?? 'N/A'} (0–1)
- Ambiguity: ${features?.ambiguity_score ?? 'N/A'} (0–1)
- Progression: ${features?.symptom_progression ?? 'N/A'} (0=improving, 1=stable, 2=worsening)

OUTPUT RULES:
- riskReasoning: max 12 words, mention actual symptom + key driver (e.g. "Chest pain with severe intensity and worsening progression")
- confidenceReasoning: max 12 words, explain reliability (e.g. "Consistent inputs with clear symptom pattern")
- riskSummary: 1–2 sentences explaining why this risk level was assigned, referencing the actual symptom, severity, and duration
- riskFactors: exactly 4 short bullet strings, each explaining one specific contributing factor (symptom, severity, duration, history/additional)
- primaryAction: one clear action sentence (e.g. "Consult a doctor within 24 hours." or "Go to the nearest emergency department now.")
- recommendationSteps: 4–5 specific, actionable steps tailored to this patient's symptoms and history
- keyInsights: exactly 3 short bullets, each specific to this patient's data
- Language: ${language || 'English'}
- NO diagnosis, NO medication prescriptions, NO medical claims

Respond with ONLY:
{
  "riskReasoning": "...",
  "confidenceReasoning": "...",
  "riskSummary": "...",
  "riskFactors": ["...", "...", "...", "..."],
  "primaryAction": "...",
  "recommendationSteps": ["...", "...", "...", "...", "..."],
  "keyInsights": ["...", "...", "..."]
}`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const data = JSON.parse(content);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Groq Error:', error);
    // Dynamic fallback — derived from whatever context was sent
    const ctx = body?.clinicalContext || {};
    const symptom   = (ctx.primarySymptom || 'symptom').replace(/_/g, ' ');
    const severity  = ctx.severity  || 'moderate';
    const duration  = ctx.duration  || 'unknown duration';
    const riskLevel = ctx.riskLevel || 'Medium';
    const history   = (ctx.medicalHistory || []).filter((h: string) => h && h !== 'none');

    const primaryAction = riskLevel === 'High'
      ? 'Go to the nearest emergency department now.'
      : riskLevel === 'Medium'
      ? 'Consult a doctor within 24 hours.'
      : 'Rest at home and monitor your symptoms.';

    return NextResponse.json({
      riskReasoning: `${riskLevel} risk driven by ${severity} ${symptom}.`,
      confidenceReasoning: "Result based on available symptom inputs.",
      riskSummary: `You are experiencing ${symptom} with ${severity} severity for ${duration}. Based on these inputs, your risk level has been assessed as ${riskLevel}.`,
      riskFactors: [
        `${symptom.charAt(0).toUpperCase() + symptom.slice(1)} is the main contributing symptom.`,
        `${severity.charAt(0).toUpperCase() + severity.slice(1)} severity ${severity === 'severe' || severity === 'critical' ? 'significantly increases' : severity === 'moderate' ? 'contributes to' : 'reduces'} risk.`,
        `Symptoms lasting ${duration} ${duration === '> 1 week' || duration === '4-7 days' ? 'raise clinical concern.' : 'are noted in the assessment.'}`,
        history.length > 0 ? `Existing condition (${history[0].replace(/_/g, ' ')}) increases vulnerability.` : 'No significant medical history reported.',
      ],
      primaryAction,
      recommendationSteps: [
        riskLevel === 'High' ? 'Seek immediate medical attention — do not delay.' : riskLevel === 'Medium' ? 'Consult a doctor within 24–48 hours.' : 'Rest and stay well hydrated.',
        'Track any changes in your symptoms every few hours.',
        severity === 'severe' || severity === 'critical' ? 'Avoid physical exertion until evaluated.' : 'Avoid strenuous activity if symptoms worsen.',
        'Seek emergency care immediately if symptoms worsen suddenly.',
      ],
      keyInsights: [
        `${symptom.charAt(0).toUpperCase() + symptom.slice(1)} identified as primary concern`,
        `${severity.charAt(0).toUpperCase() + severity.slice(1)} severity noted`,
        "Monitor for any changes in symptoms",
      ],
    });
  }
}
