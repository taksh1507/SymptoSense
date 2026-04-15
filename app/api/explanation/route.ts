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

    const langName = language === 'Hindi' ? 'Hindi (हिन्दी)' : language === 'Marathi' ? 'Marathi (मराठी)' : 'English';
    const systemPrompt = `You are a medical triage reasoning engine. Output ONLY valid JSON with no extra text. ALL text values in the JSON must be written in ${langName}.`;

    const userPrompt = `Generate complete clinical reasoning for this patient assessment. ALL output text must be in ${langName}.

PATIENT DATA:
- Primary symptom: ${symptomStr}
- Severity: ${severity}
- Duration: ${duration}
- Additional symptoms: ${additionalStr}
- Medical history: ${historyStr}
- Risk level: ${riskLevel} (score: ${Math.min(100, riskScore)}/100)
- Confidence: ${features?.confidence_score ?? 'N/A'}%
- Symptom consistency: ${features?.symptom_consistency_score ?? 'N/A'} (0–1)
- Ambiguity: ${features?.ambiguity_score ?? 'N/A'} (0–1)
- Progression: ${features?.symptom_progression ?? 'N/A'} (0=improving, 1=stable, 2=worsening)

OUTPUT RULES (ALL text must be in ${langName}):
- riskReasoning: max 12 words, mention actual symptom + key driver
- confidenceReasoning: max 12 words, explain reliability
- riskSummary: 1–2 sentences explaining why this risk level was assigned, referencing the actual symptom, severity, and duration
- riskFactors: exactly 4 short bullet strings, each explaining one specific contributing factor
- primaryAction: one clear action sentence
- recommendationSteps: 4–5 specific, actionable steps tailored to this patient's symptoms and history
- keyInsights: exactly 3 short bullets, each specific to this patient's data
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
    const ctx = body?.clinicalContext || {};
    const lang = body?.language || 'English';
    const symptom   = (ctx.primarySymptom || 'symptom').replace(/_/g, ' ');
    const severity  = ctx.severity  || 'moderate';
    const duration  = ctx.duration  || 'unknown duration';
    const riskLevel = ctx.riskLevel || 'Medium';
    const history   = (ctx.medicalHistory || []).filter((h: string) => h && h !== 'none');

    // Language-aware fallback strings
    const isHindi   = lang === 'Hindi';
    const isMarathi = lang === 'Marathi';

    const primaryAction = riskLevel === 'High'
      ? (isHindi ? 'तुरंत नजदीकी अस्पताल जाएं।' : isMarathi ? 'ताबडतोब जवळच्या रुग्णालयात जा.' : 'Go to the nearest emergency department now.')
      : riskLevel === 'Medium'
      ? (isHindi ? '२४ घंटे के भीतर डॉक्टर से मिलें।' : isMarathi ? '२४ तासांच्या आत डॉक्टरांना भेटा.' : 'Consult a doctor within 24 hours.')
      : (isHindi ? 'घर पर आराम करें और लक्षणों पर नज़र रखें।' : isMarathi ? 'घरी विश्रांती घ्या आणि लक्षणांवर लक्ष ठेवा.' : 'Rest at home and monitor your symptoms.');

    const symptomCap = symptom.charAt(0).toUpperCase() + symptom.slice(1);

    return NextResponse.json({
      riskReasoning: isHindi
        ? `${severity} ${symptom} के कारण ${riskLevel} जोखिम।`
        : isMarathi
        ? `${severity} ${symptom} मुळे ${riskLevel} जोखीम.`
        : `${riskLevel} risk driven by ${severity} ${symptom}.`,
      confidenceReasoning: isHindi
        ? "उपलब्ध लक्षण जानकारी के आधार पर परिणाम।"
        : isMarathi
        ? "उपलब्ध लक्षण माहितीवर आधारित निकाल."
        : "Result based on available symptom inputs.",
      riskSummary: isHindi
        ? `आप ${duration} से ${severity} तीव्रता के साथ ${symptom} का अनुभव कर रहे हैं। इन जानकारियों के आधार पर जोखिम स्तर ${riskLevel} आंका गया है।`
        : isMarathi
        ? `तुम्हाला ${duration} पासून ${severity} तीव्रतेसह ${symptom} होत आहे. या माहितीच्या आधारे जोखीम पातळी ${riskLevel} म्हणून मूल्यांकन केली आहे.`
        : `You are experiencing ${symptom} with ${severity} severity for ${duration}. Based on these inputs, your risk level has been assessed as ${riskLevel}.`,
      riskFactors: isHindi ? [
        `${symptomCap} मुख्य योगदान देने वाला लक्षण है।`,
        `${severity} तीव्रता जोखिम को ${severity === 'severe' || severity === 'critical' ? 'काफी बढ़ाती' : severity === 'moderate' ? 'प्रभावित करती' : 'कम करती'} है।`,
        `${duration} से लक्षण ${duration === '> 1 week' || duration === '4-7 days' ? 'चिंताजनक हैं।' : 'नोट किए गए हैं।'}`,
        history.length > 0 ? `${history[0].replace(/_/g, ' ')} की मौजूदगी जोखिम बढ़ाती है।` : 'कोई महत्वपूर्ण चिकित्सा इतिहास नहीं।',
      ] : isMarathi ? [
        `${symptomCap} हे मुख्य योगदान देणारे लक्षण आहे.`,
        `${severity} तीव्रता जोखीम ${severity === 'severe' || severity === 'critical' ? 'लक्षणीयरीत्या वाढवते' : severity === 'moderate' ? 'प्रभावित करते' : 'कमी करते'}.`,
        `${duration} पासूनची लक्षणे ${duration === '> 1 week' || duration === '4-7 days' ? 'चिंताजनक आहेत.' : 'नोंदवली आहेत.'}`,
        history.length > 0 ? `${history[0].replace(/_/g, ' ')} ची उपस्थिती जोखीम वाढवते.` : 'कोणताही महत्त्वाचा वैद्यकीय इतिहास नाही.',
      ] : [
        `${symptomCap} is the main contributing symptom.`,
        `${severity.charAt(0).toUpperCase() + severity.slice(1)} severity ${severity === 'severe' || severity === 'critical' ? 'significantly increases' : severity === 'moderate' ? 'contributes to' : 'reduces'} risk.`,
        `Symptoms lasting ${duration} ${duration === '> 1 week' || duration === '4-7 days' ? 'raise clinical concern.' : 'are noted in the assessment.'}`,
        history.length > 0 ? `Existing condition (${history[0].replace(/_/g, ' ')}) increases vulnerability.` : 'No significant medical history reported.',
      ],
      primaryAction,
      recommendationSteps: isHindi ? [
        riskLevel === 'High' ? 'तुरंत चिकित्सा सहायता लें — देरी न करें।' : riskLevel === 'Medium' ? '२४–४८ घंटे में डॉक्टर से मिलें।' : 'आराम करें और पर्याप्त पानी पिएं।',
        'हर कुछ घंटों में लक्षणों में बदलाव पर नज़र रखें।',
        severity === 'severe' || severity === 'critical' ? 'जांच होने तक शारीरिक परिश्रम से बचें।' : 'लक्षण बिगड़ने पर कठिन गतिविधियों से बचें।',
        'लक्षण अचानक बिगड़ने पर तुरंत आपातकालीन सहायता लें।',
      ] : isMarathi ? [
        riskLevel === 'High' ? 'ताबडतोब वैद्यकीय मदत घ्या — उशीर करू नका.' : riskLevel === 'Medium' ? '२४–४८ तासांत डॉक्टरांना भेटा.' : 'विश्रांती घ्या आणि पुरेसे पाणी प्या.',
        'दर काही तासांनी लक्षणांतील बदलांवर लक्ष ठेवा.',
        severity === 'severe' || severity === 'critical' ? 'तपासणी होईपर्यंत शारीरिक श्रम टाळा.' : 'लक्षणे बिघडल्यास कठीण कामे टाळा.',
        'लक्षणे अचानक बिघडल्यास ताबडतोब आपत्कालीन मदत घ्या.',
      ] : [
        riskLevel === 'High' ? 'Seek immediate medical attention — do not delay.' : riskLevel === 'Medium' ? 'Consult a doctor within 24–48 hours.' : 'Rest and stay well hydrated.',
        'Track any changes in your symptoms every few hours.',
        severity === 'severe' || severity === 'critical' ? 'Avoid physical exertion until evaluated.' : 'Avoid strenuous activity if symptoms worsen.',
        'Seek emergency care immediately if symptoms worsen suddenly.',
      ],
      keyInsights: isHindi ? [
        `${symptomCap} मुख्य चिंता के रूप में पहचाना गया`,
        `${severity} तीव्रता दर्ज की गई`,
        "किसी भी लक्षण परिवर्तन पर नज़र रखें",
      ] : isMarathi ? [
        `${symptomCap} मुख्य चिंता म्हणून ओळखले गेले`,
        `${severity} तीव्रता नोंदवली गेली`,
        "कोणत्याही लक्षण बदलांवर लक्ष ठेवा",
      ] : [
        `${symptomCap} identified as primary concern`,
        `${severity.charAt(0).toUpperCase() + severity.slice(1)} severity noted`,
        "Monitor for any changes in symptoms",
      ],
    });
  }
}
