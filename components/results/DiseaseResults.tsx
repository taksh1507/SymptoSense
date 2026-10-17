'use client';
import { Badge, Notice, Section } from '@/components/ui/primitives';
import { useUiText } from '@/components/ui/use-ui-text';
import type { DiseasePrediction } from '@/lib/ml/disease';

export function DiseaseResults({ result, status, error }: { result: DiseasePrediction | null; status: string; error: string }) {
  const t = useUiText();
  const title = t('Possible conditions (research estimate)', 'संभावित स्थितियाँ (शोध अनुमान)', 'संभाव्य स्थिती (संशोधन अंदाज)');

  if (!result) {
    return (
      <Section title={title} aria-live="polite">
        <p>{status === 'loading'
          ? t('Reviewing your symptoms and estimating possible conditions…', 'लक्षणों की समीक्षा और संभावित स्थितियों का अनुमान जारी है…', 'लक्षणांचा आढावा आणि संभाव्य स्थितींचा अंदाज सुरू आहे…')
          : error || t('Condition estimates are not available for this assessment.', 'इस मूल्यांकन के लिए स्थितियों के अनुमान उपलब्ध नहीं हैं।', 'या मूल्यांकनासाठी स्थितींचे अंदाज उपलब्ध नाहीत.')}</p>
        <Notice>{t('This is not a diagnosis. Your urgency result and guidance above still apply.', 'यह निदान नहीं है। ऊपर दिया गया तात्कालिकता परिणाम और सलाह लागू रहती है।', 'हे निदान नाही. वरील तातडीचा निकाल आणि सल्ला लागू राहतो.')}</Notice>
      </Section>
    );
  }

  // Hide empty/zeroed bars (e.g. "general evidence · Not reported +0.00") and
  // drop duplicate symptom entries the model can return, keeping the strongest.
  const seenSymptoms = new Set<string>();
  const bars = result.shap_top5
    .map(v => ({ ...v, label: v.symptom.replace(/_/g, ' '), points: v.contribution * 100 }))
    .filter(v => v.present || Math.abs(v.points) >= 0.05)
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
    .filter(v => {
      if (seenSymptoms.has(v.symptom)) return false;
      seenSymptoms.add(v.symptom);
      return true;
    });
  const largest = Math.max(1, ...bars.map(v => Math.abs(v.points)));
  const lowConfidence = result.uncertain || result.confident === false || result.limited_information;

  return (
    <Section title={title}>
      <p className="muted">{t(
        'This is a separate research estimate from a public symptom dataset. It is not your urgency level and may disagree — always follow the higher urgency.',
        'यह एक सार्वजनिक लक्षण डेटासेट से अलग शोध अनुमान है। यह आपकी तात्कालिकता नहीं है और भिन्न हो सकता है — हमेशा अधिक तात्कालिकता का पालन करें।',
        'हे सार्वजनिक लक्षण डेटासेटमधील स्वतंत्र संशोधन अंदाज आहे. ही तुमची तातडी नाही आणि वेगळी असू शकते — नेहमी जास्त तातडीचे पालन करा.'
      )}</p>

      {result.red_flag_override && (
        <Notice tone="danger" role="alert"><strong>{t('A red flag was detected. A serious emergency cannot be ruled out.', 'खतरे का संकेत मिला। गंभीर आपातस्थिति को खारिज नहीं किया जा सकता।', 'धोक्याचे लक्षण आढळले. गंभीर आपत्कालीन स्थिती नाकारता येत नाही.')}</strong></Notice>
      )}
      {result.disease_safety_override && (
        <Notice tone="danger" role="alert">
          <p>{t('Precautionary urgency level', 'एहतियात के तौर पर तात्कालिकता', 'खबरदारी म्हणून तातडीची पातळी')}: <Badge urgency={result.disease_safety_floor || result.urgency} />. {result.disease_safety_conditions.join(', ')}.</p>
        </Notice>
      )}
      {lowConfidence && (
        <Notice tone="warning" role="status">
          <strong>{t('Low-confidence estimate — please consult a doctor.', 'कम-विश्वास अनुमान — कृपया डॉक्टर से परामर्श करें।', 'कमी-आत्मविश्वास अंदाज — कृपया डॉक्टरांचा सल्ला घ्या.')}</strong>
          <p>{result.limited_information
            ? t('Based on fewer than 3 recognized symptoms. Add more symptoms for a stronger estimate.', '3 से कम पहचाने गए लक्षणों पर आधारित। बेहतर अनुमान के लिए अधिक लक्षण जोड़ें।', '3 पेक्षा कमी ओळखलेल्या लक्षणांवर आधारित. अधिक अचूक अंदाजासाठी आणखी लक्षणे जोडा.')
            : t('The highest probability is below the threshold', 'सबसे अधिक संभावना निर्धारित सीमा से कम है', 'सर्वाधिक संभाव्यता ठरवलेल्या मर्यादेपेक्षा कमी आहे') + ' (' + (result.uncertainty_threshold * 100).toFixed(0) + '%).'}</p>
        </Notice>
      )}

      <ul className="condition-list" aria-label={title}>
        {result.top3.map((condition, i) => (
          <li key={`${condition.disease}-${i}`} className={i === 0 ? 'condition-top' : undefined}>
            <div className="row between">
              <span className="condition-name"><span className="condition-rank">{i + 1}</span>{condition.disease}</span>
              <strong className="condition-pct">{(condition.probability * 100).toFixed(1)}%</strong>
            </div>
            <progress max={1} value={condition.probability} aria-label={condition.disease + ': ' + (condition.probability * 100).toFixed(1) + '%'} />
          </li>
        ))}
      </ul>

      <p className="muted">{t('These percentages are model estimates, not the chance that a diagnosis is correct.', 'ये प्रतिशत मॉडल के अनुमान हैं, निदान सही होने की संभावना नहीं।', 'ही टक्केवारी मॉडेलचे अंदाज आहेत; निदान बरोबर असल्याची शक्यता नाही.')}</p>
      {result.explanation && <p>{result.explanation}</p>}

      <details className="report-details">
        <summary>{t('How this estimate was made', 'यह अनुमान कैसे बना', 'हा अंदाज कसा तयार झाला')}</summary>
        <div className="stack">
          <dl className="facts">
            <div><dt>{t('Age', 'उम्र', 'वय')}</dt><dd>{result.age_used == null ? t('Not used', 'उपयोग नहीं', 'वापरले नाही') : result.age_used}{result.age_group_used ? ' (' + result.age_group_used + ')' : ''}</dd></div>
            <div><dt>{t('Sex', 'लिंग', 'लिंग')}</dt><dd>{result.sex_used ?? t('Not provided', 'नहीं बताया', 'दिलेली नाही')}</dd></div>
            <div><dt>{t('Symptoms used', 'उपयोग किए गए लक्षण', 'वापरलेली लक्षणे')}</dt><dd>{result.symptoms_used.map(s => s.replace(/_/g, ' ')).join(', ') || t('None', 'कोई नहीं', 'काही नाही')}</dd></div>
          </dl>
          {result.ignored_symptoms.length > 0 && (
            <p className="muted">{t('Symptoms outside this dataset', 'डेटासेट में शामिल नहीं लक्षण', 'डेटासेटमध्ये नसलेली लक्षणे')}: {result.ignored_symptoms.join(', ')}.</p>
          )}
          {bars.length > 0 && (
            <div className="stack">
              <p className="muted">{t('Which reported symptoms raised or lowered the top estimate. These show model associations, not medical causes.', 'किन लक्षणों ने शीर्ष अनुमान को बढ़ाया या घटाया। ये मॉडल संबंध दिखाते हैं, चिकित्सा कारण नहीं।', 'कोणत्या लक्षणांनी शीर्ष अंदाज वाढवला किंवा कमी केला. हे मॉडेल संबंध दर्शवतात, वैद्यकीय कारणे नाहीत.')}</p>
              <ul className="contributions">
                {bars.map((v, i) => (
                  <li key={`${v.symptom}-${i}`} className={v.points < 0 ? 'contribution-down' : undefined}>
                    <div className="row between"><span>{v.label}</span><strong>{v.points >= 0 ? '+' : '−'}{Math.abs(v.points).toFixed(1)} {t('points', 'अंक', 'गुण')}</strong></div>
                    <progress max={largest} value={Math.abs(v.points)} aria-label={v.label} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="muted">{[ 
            t('Method', 'विधि', 'पद्धत') + ': ' + result.probability_mode.replace(/_/g, ' '),
            result.model_version ? t('Model', 'मॉडल', 'मॉडेल') + ': ' + result.model_version : '',
            t('Research urgency', 'शोध तात्कालिकता', 'संशोधन तातडी') + ': ' + result.model_urgency,
            t('Safety-adjusted urgency', 'सुरक्षा अनुसार तात्कालिकता', 'सुरक्षिततेनुसार तातडी') + ': ' + result.urgency,
          ].filter(Boolean).join(' · ')}</p>
          <p className="muted">{result.context_note}</p>
        </div>
      </details>
    </Section>
  );
}
