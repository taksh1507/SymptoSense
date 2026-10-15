'use client';
import { ConfidenceMeter } from './ConfidenceMeter';
import { Badge, Notice, Section, Table } from '@/components/ui/primitives';
import { useUiText } from '@/components/ui/use-ui-text';
import type { DiseasePrediction } from '@/lib/ml/disease';

export function DiseaseResults({ result, status, error }: { result: DiseasePrediction | null; status: string; error: string }) {
  const t = useUiText();
  const title = t('Three possible conditions', 'तीन संभावित स्थितियाँ', 'तीन संभाव्य स्थिती');
  if (!result) return <Section title={title} aria-live="polite"><p>{status === 'loading' ? t('Reviewing symptoms and estimating condition probabilities…', 'लक्षणों की समीक्षा और संभावनाओं का अनुमान जारी है…', 'लक्षणांचा आढावा आणि संभाव्यतेचा अंदाज सुरू आहे…') : error || t('Condition estimates are not available yet.', 'स्थितियों के अनुमान अभी उपलब्ध नहीं हैं।', 'स्थितींचे अंदाज अद्याप उपलब्ध नाहीत.')}</p><Notice>{t('This is not a diagnosis. Your urgency result and emergency guidance remain available.', 'यह निदान नहीं है। तात्कालिकता का परिणाम और आपातकालीन सलाह उपलब्ध हैं।', 'हे निदान नाही. तातडीचा निकाल आणि आपत्कालीन मार्गदर्शन उपलब्ध आहे.')}</Notice></Section>;
  const bars = result.shap_top5.map(v => ({ ...v, label: v.symptom.replace(/_/g, ' '), points: v.contribution * 100 }));
  const largest = Math.max(1, ...bars.map(v => Math.abs(v.points)));
  return <div className="stack">
    <Section title={title}>
      {result.red_flag_override && <Notice tone="danger" role="alert"><strong>{t('High urgency: seek immediate medical attention.', 'उच्च तात्कालिकता: तुरंत चिकित्सा सहायता लें।', 'उच्च तातडी: त्वरित वैद्यकीय मदत घ्या.')}</strong><p>{t('A red flag was detected. Model probabilities cannot rule out an emergency.', 'खतरे का संकेत मिला है। मॉडल की संभावनाएँ आपातस्थिति को खारिज नहीं कर सकतीं।', 'धोक्याचे लक्षण आढळले. मॉडेलच्या संभाव्यता आपत्कालीन स्थिती नाकारू शकत नाहीत.')}</p></Notice>}
      {result.disease_safety_override && <Notice tone="danger" role="alert"><p>{t('Precautionary urgency level', 'एहतियात के तौर पर तात्कालिकता', 'खबरदारी म्हणून तातडीची पातळी')}: <Badge urgency={result.disease_safety_floor || result.urgency} />. {result.disease_safety_conditions.join(', ')}.</p><p>{t('These ranked conditions triggered a safety rule. This is not a diagnosis.', 'इन स्थितियों के कारण सुरक्षा नियम लागू हुआ। यह निदान नहीं है।', 'या स्थितींमुळे सुरक्षिततेचा नियम लागू झाला. हे निदान नाही.')}</p></Notice>}
      {result.confident === false && <Notice tone="warning" role="alert"><strong>{t('Low-confidence prediction — please consult a doctor for evaluation.', 'कम-विश्वास अनुमान — कृपया मूल्यांकन के लिए डॉक्टर से परामर्श करें।', 'कमी-आत्मविश्वास अंदाज — कृपया मूल्यांकनासाठी डॉक्टरांचा सल्ला घ्या.')}</strong></Notice>}
      {result.limited_information && <Notice tone="warning" role="status"><strong>{t('Assessment based on limited symptoms (fewer than 3 recognized) — provide more details for a more accurate assessment.', 'सीमित लक्षणों (3 से कम पहचाने गए) पर आधारित मूल्यांकन — अधिक सटीक मूल्यांकन के लिए अधिक विवरण प्रदान करें।', 'मर्यादित लक्षणांवर (3 पेक्षा कमी ओळखलेली) आधारित मूल्यांकन — अधिक अचूक मूल्यांकनासाठी अधिक तपशील द्या.')}</strong></Notice>}
      {result.uncertain && <Notice tone="warning" role="status"><strong>{t('Uncertain — please consult a doctor.', 'अनिश्चित — कृपया डॉक्टर से परामर्श करें।', 'अनिश्चित — कृपया डॉक्टरांचा सल्ला घ्या.')}</strong><p>{t('The highest probability is below the configured threshold of', 'सबसे अधिक संभावना निर्धारित सीमा से कम है:', 'सर्वाधिक संभाव्यता ठरवलेल्या मर्यादेपेक्षा कमी आहे:')} {(result.uncertainty_threshold * 100).toFixed(0)}%.</p></Notice>}
      <p className="muted">{result.disclaimer}</p>
      {result.symptoms_used.length <= 1 && <Notice>{t('Add more symptoms for a better-supported estimate. A single symptom often cannot distinguish between conditions.', 'बेहतर अनुमान के लिए अधिक लक्षण जोड़ें। केवल एक लक्षण से स्थितियों में अंतर करना मुश्किल हो सकता है।', 'अधिक आधार असलेल्या अंदाजासाठी आणखी लक्षणे जोडा. एकाच लक्षणावरून स्थितींमध्ये फरक करणे कठीण असू शकते.')}</Notice>}
      <Table className="rank-table" aria-label={title}><thead><tr><th scope="col">#</th><th scope="col">{t('Condition', 'स्थिति', 'स्थिती')}</th><th scope="col">{t('Probability', 'संभावना', 'संभाव्यता')}</th></tr></thead><tbody>
        {result.top3.map((condition,i) => <tr key={condition.disease}><td className="rank-number">{i + 1}</td><th scope="row">{condition.disease}</th><td><div className="probability"><span>{(condition.probability * 100).toFixed(1)}%</span><progress max={1} value={condition.probability} aria-label={condition.disease} /></div></td></tr>)}
      </tbody></Table>
      <p>{result.explanation}</p>
    </Section>
    <Section title={t('What we used', 'हमने किन जानकारियों का उपयोग किया', 'आम्ही वापरलेली माहिती')}>
      <dl className="facts">
        <div><dt>{t('Age', 'उम्र', 'वय')}</dt><dd>{result.age_used == null ? t('Unavailable', 'उपलब्ध नहीं', 'उपलब्ध नाही') : result.age_used} {result.age_group_used && '(' + result.age_group_used + ')'} {result.age_source}</dd></div>
        <div><dt>{t('Sex', 'लिंग', 'लिंग')}</dt><dd>{result.sex_used ?? t('Not provided', 'नहीं बताया गया', 'दिलेली नाही')}</dd></div>
        <div><dt>{t('Symptoms', 'लक्षण', 'लक्षणे')}</dt><dd>{result.symptoms_used.map(s => s.replace(/_/g, ' ')).join(', ')}</dd></div>
      </dl>
      {result.ignored_symptoms.length > 0 && <p>{t('Symptoms outside this dataset', 'डेटासेट में शामिल नहीं लक्षण', 'डेटासेटमध्ये नसलेली लक्षणे')}: {result.ignored_symptoms.join(', ')}.</p>}
      <p className="muted">{result.context_note}</p>
    </Section>
    <Section title={t('What influenced the estimate', 'अनुमान को किसने प्रभावित किया', 'अंदाजावर कशाचा प्रभाव पडला')}>
      <p>{t('Each bar shows how a symptom raised or lowered the top condition’s raw probability, in percentage points. These SHAP values describe model associations, not medical causes.', 'हर पट्टी दिखाती है कि किसी लक्षण ने पहली स्थिति की मूल संभावना को कितने प्रतिशत अंक बढ़ाया या घटाया। ये SHAP मान मॉडल के संबंध दिखाते हैं, चिकित्सा कारण नहीं।', 'प्रत्येक पट्टी लक्षणामुळे पहिल्या स्थितीची मूळ संभाव्यता किती टक्के गुणांनी वाढली किंवा कमी झाली हे दर्शवते. ही SHAP मूल्ये मॉडेलमधील संबंध दर्शवतात, वैद्यकीय कारणे नाहीत.')}</p>
      <ul className="contributions" aria-label={t('Symptom contributions', 'लक्षणों का योगदान', 'लक्षणांचे योगदान')}>{bars.map(v => <li key={v.symptom} className={v.points < 0 ? 'contribution-down' : undefined}>
        <div className="row between"><span>{v.label} · {v.present ? t('Reported', 'बताया गया', 'सांगितलेले') : t('Not reported', 'नहीं बताया गया', 'न सांगितलेले')}</span><strong>{v.points >= 0 ? '+' : '−'}{Math.abs(v.points).toFixed(2)} {t('points', 'अंक', 'गुण')}</strong></div>
        <progress max={largest} value={Math.abs(v.points)} aria-label={v.label + ': ' + (v.points >= 0 ? t('raises estimate', 'अनुमान बढ़ाता है', 'अंदाज वाढवते') : t('lowers estimate', 'अनुमान घटाता है', 'अंदाज कमी करते'))} />
      </li>)}</ul>
      <ConfidenceMeter score={result.confidence * 100} level={result.uncertain ? 'Low' : 'High'} kind="disease" explanation={t('Probability method', 'संभावना की विधि', 'संभाव्यतेची पद्धत') + ': ' + result.probability_mode} />
      <p className="muted">{t('Safety-adjusted urgency', 'सुरक्षा के अनुसार तात्कालिकता', 'सुरक्षिततेनुसार तातडी')}: {result.urgency}. {t('Research model urgency', 'शोध मॉडल की तात्कालिकता', 'संशोधन मॉडेलची तातडी')}: {result.model_urgency}. {t('Model version', 'मॉडल संस्करण', 'मॉडेल आवृत्ती')}: {result.model_version}.</p>
    </Section>
  </div>;
}
