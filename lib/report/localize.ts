import type { ScoreResult } from '@/lib/ai-engine/scoring/types';
export function localizeResult(result: ScoreResult, language: string): ScoreResult {
  if (language === 'en') return result;
  const hi = language === 'hi';
  const risk = hi ? { High: 'उच्च', Medium: 'मध्यम', Low: 'कम' } : { High: 'उच्च', Medium: 'मध्यम', Low: 'कमी' };
  const primaryAction = hi ? { High: 'तुरंत नजदीकी आपातकालीन विभाग जाएँ।', Medium: '24 घंटे के भीतर डॉक्टर से परामर्श करें।', Low: 'आराम करें और लक्षणों पर नज़र रखें।' } : { High: 'ताबडतोब जवळच्या आपत्कालीन विभागात जा.', Medium: '२४ तासांच्या आत डॉक्टरांचा सल्ला घ्या.', Low: 'विश्रांती घ्या आणि लक्षणांवर लक्ष ठेवा.' };
  const names: Record<string, string> = hi ? { chest_pain: 'सीने में दर्द', breathlessness: 'सांस की तकलीफ', confusion: 'भ्रम', fever: 'बुखार', cough: 'खांसी', headache: 'सिरदर्द', fatigue: 'थकान', dizziness: 'चक्कर', stomach_pain: 'पेट दर्द', diabetes: 'मधुमेह', heart_disease: 'हृदय रोग', blood_thinners: 'खून पतला करने वाली दवा', hypertension: 'उच्च रक्तचाप', asthma: 'अस्थमा' } : { chest_pain: 'छातीत दुखणे', breathlessness: 'श्वास घेण्यास त्रास', confusion: 'गोंधळ', fever: 'ताप', cough: 'खोकला', headache: 'डोकेदुखी', fatigue: 'थकवा', dizziness: 'चक्कर', stomach_pain: 'पोटदुखी', diabetes: 'मधुमेह', heart_disease: 'हृदयरोग', blood_thinners: 'रक्त पातळ करणारी औषधे', hypertension: 'उच्च रक्तदाब', asthma: 'दमा' };
  const factors = result.factors.map(f => {
    const key = f.id.replace(/^(symptom_|additional_|history_)/, '');
    return (names[key] ?? (f.category === 'severity' ? hi ? 'लक्षणों की तीव्रता' : 'लक्षणांची तीव्रता' : f.category === 'duration' ? hi ? 'लक्षणों की अवधि' : 'लक्षणांचा कालावधी' : hi ? 'बताया गया जोखिम कारक' : 'नोंदवलेला जोखीम घटक')) + ' (+' + f.score + ')';
  });
  return { ...result, recommendation: primaryAction[result.urgency], primaryAction: primaryAction[result.urgency],
    riskReasoning: hi ? 'बताए गए लक्षणों के आधार पर ' + risk[result.urgency] + ' जोखिम।' : 'नोंदवलेल्या लक्षणांनुसार ' + risk[result.urgency] + ' जोखीम.',
    riskSummary: hi ? 'आपके बताए गए लक्षणों, अवधि और चिकित्सा इतिहास के आधार पर यह जोखिम स्तर तय किया गया है।' : 'तुमची लक्षणे, त्यांचा कालावधी आणि वैद्यकीय इतिहास यांच्या आधारे ही जोखीम पातळी ठरवली आहे.', riskFactors: factors,
    recommendationSteps: [primaryAction[result.urgency], hi ? 'लक्षण अचानक बिगड़ने पर तुरंत चिकित्सा सहायता लें।' : 'लक्षणे अचानक बिघडल्यास ताबडतोब वैद्यकीय मदत घ्या.'],
    confidenceExplanation: result.confidenceScore == null ? hi ? 'मॉडल स्कोर उपलब्ध नहीं है।' : 'मॉडेल स्कोअर उपलब्ध नाही.' : hi ? 'यह अनुमानित मॉडल स्कोर है; यह चिकित्सा सटीकता की संभावना नहीं है।' : 'हा अंदाजित मॉडेल स्कोअर आहे; तो वैद्यकीय अचूकतेची शक्यता दर्शवत नाही.',
  };
}
