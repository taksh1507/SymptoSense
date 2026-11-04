'use client';

import { Badge, Notice, Section } from '@/components/ui/primitives';
import { useUiText } from '@/components/ui/use-ui-text';
import { useApp } from '@/app/context/AppContext';
import { formatSymptomName, type SupportedLanguage } from '@/lib/assessment/symptomPresentation';
import type { DiseasePrediction } from '@/lib/ml/disease';

const CONDITION_DESCRIPTIONS: Record<string, { en: string; hi: string; mr: string }> = {
  'URTI': {
    en: 'Upper respiratory tract infection affecting the nose, throat, and sinuses, often presenting with cough, fever, runny nose, or sore throat.',
    hi: 'ऊपरी श्वसन पथ का संक्रमण जो नाक, गले और साइनस को प्रभावित करता है, अक्सर खांसी, बुखार और बहती नाक के साथ।',
    mr: 'नाक, घसा आणि सायनसवर परिणाम करणारा संसर्ग, खोकला, ताप आणि वाहणारे नाक अशी लक्षणे.'
  },
  'Bronchitis': {
    en: 'Inflammation of the lining of the bronchial tubes, which carry air to and from your lungs, leading to cough and chest discomfort.',
    hi: 'श्वसन नलिकाओं (ब्रोंकियल ट्यूब) की सूजन, जिससे बलगम वाली खांसी और सीने में परेशानी होती है।',
    mr: 'फुप्फुसांकडे जाणाऱ्या नलिकांची जळजळ, ज्यामुळे खोकला आणि छातीत अस्वस्थता जाणवते.'
  },
  'Acute rhinosinusitis': {
    en: 'Short-term inflammation of the nasal passages and sinuses, leading to nasal congestion, facial pressure, and headache.',
    hi: 'नाक के मार्ग और साइनस की तीव्र सूजन, जिससे नाक बंद होना, चेहरे पर दबाव और सिरदर्द होता है।',
    mr: 'नाक आणि सायनसची अचानक जळजळ, ज्यामुळे नाक बंद होणे आणि डोकेदुखी होते.'
  },
  'Allergic sinusitis': {
    en: 'Sinus inflammation triggered by environmental allergens such as pollen, dust, or pet dander, causing sneezing and congestion.',
    hi: 'एलर्जी (जैसे परागकण या धूल) के कारण साइनस की सूजन, जिससे छींकें और नाक बंद होना देखा जाता है।',
    mr: 'धुळीमुळे किंवा ऍलर्जीमुळे सायनसची सूज, ज्यामुळे शिंका आणि अस्वस्थता येते.'
  },
  'Influenza': {
    en: 'A viral infection that attacks your respiratory system—nose, throat, and lungs—causing high fever, body aches, and fatigue.',
    hi: 'एक संक्रामक वायरल संक्रमण जो श्वसन प्रणाली पर हमला करता है, जिससे तेज बुखार, बदन दर्द और थकान होती है।',
    mr: 'एक संसर्गजन्य विषाणू संसर्ग ज्यामुळे तीव्र ताप, अंगदुखी आणि थकवा येतो.'
  },
  'Pneumonia': {
    en: 'An infection that inflames air sacs in one or both lungs, which may fill with fluid or pus, causing fever, chills, and breathing difficulty.',
    hi: 'फेफड़ों का एक गंभीर संक्रमण जो वायु थैलियों में सूजन पैदा करता है, जिससे खांसी, बुखार और सांस लेने में कठिनाई होती है।',
    mr: 'फुफ्फुसांचा गंभीर संसर्ग, ज्यामुळे खोकला, ताप आणि श्वास घेण्यास त्रास होतो.'
  },
  'Acute otitis media': {
    en: 'An infection of the middle ear causing ear pain, reduced hearing, and sometimes fever, commonly following a cold or viral illness.',
    hi: 'मध्य कान का तीव्र संक्रमण जिससे कान में दर्द, सुनने में कठिनाई और बुखार हो सकता है।',
    mr: 'मधल्या कानाचा तीव्र संसर्ग, ज्यामुळे कान दुखणे आणि ताप येऊ शकतो.'
  },
  'Tuberculosis': {
    en: 'A bacterial infection primarily affecting the lungs, presenting with persistent cough, night sweats, weight loss, and fever.',
    hi: 'एक जीवाणु संक्रमण जो मुख्य रूप से फेफड़ों को प्रभावित करता है, जिससे लगातार खांसी, रात में पसीना और बुखार होता है।',
    mr: 'जिवाणू संसर्ग जो प्रामुख्याने फुफ्फुसांवर परिणाम करतो, दीर्घकाळ खोकला आणि ताप हे मुख्य लक्षण.'
  },
  'Boerhaave': {
    en: 'A serious esophageal tear typically following severe vomiting or retching, requiring prompt emergency surgical assessment.',
    hi: 'गंभीर उल्टी के बाद भोजन नली में चोट या फटना, जिसके लिए तत्काल आपातकालीन देखभाल आवश्यक है।',
    mr: 'तीव्र उलट्यानंतर अन्ननलिकेला इजा होणारी गंभीर स्थिती, तातडीने वैद्यकीय उपचार आवश्यक.'
  },
  'Chagas': {
    en: 'An infection caused by the Trypanosoma cruzi parasite, which can cause acute fever, swelling, and gastrointestinal symptoms.',
    hi: 'ट्रिपैनोसोमा क्रूजी परजीवी के कारण होने वाला संक्रमण, जिससे बुखार, सूजन और पाचन संबंधी समस्याएं हो सकती हैं।',
    mr: 'परजीवीमुळे होणारा संसर्ग, ज्यामुळे ताप, सूज आणि पोटाच्या तक्रारी उद्भवतात.'
  },
  'Panic attack': {
    en: 'A sudden episode of intense fear that triggers severe physical reactions including rapid heartbeat, shortness of breath, or dizziness.',
    hi: 'अत्यधिक घबराहट या भय का अचानक दौरा, जिससे दिल की धड़कन तेज होना और सांस फूलना हो सकता है।',
    mr: 'अचानक तीव्र भीती किंवा अस्वस्थतेचा झटका, ज्यामुळे धाप लागणे आणि धडधड वाढणे होते.'
  },
  'Anaphylaxis': {
    en: 'A severe, potentially life-threatening allergic reaction requiring immediate emergency medical intervention and epinephrine.',
    hi: 'एक अत्यंत गंभीर, जानलेवा एलर्जी प्रतिक्रिया जिसके लिए तत्काल आपातकालीन उपचार की आवश्यकता होती है।',
    mr: 'अतिसंवेदनशील आणि जीवघेणी ऍलर्जी प्रतिक्रिया, तातडीने आपत्कालीन वैद्यकीय मदत आवश्यक.'
  },
  'Inguinal hernia': {
    en: 'A condition where soft tissue bulges through a weak point in the abdominal muscles, causing localized swelling and discomfort.',
    hi: 'पेट की मांसपेशियों की कमजोरी से ऊतक का बाहर निकलना, जिससे पेट के निचले हिस्से में उभार या दर्द होता है।',
    mr: 'पोटाच्या स्नायूंच्या कमकुवत भागातून गाठ येणे, ज्यामुळे अस्वस्थता जाणवते.'
  },
  'GERD': {
    en: 'Gastroesophageal reflux disease occurs when stomach acid repeatedly flows back into the esophagus, causing heartburn or upper abdominal discomfort.',
    hi: 'गैस्ट्रोएसोफेगल रिफ्लक्स रोग तब होता है जब पेट का एसिड बार-बार भोजन नली में वापस आता है।',
    mr: 'जेव्हा पोटातील आम्ल वारंवार अन्ननलिकेत परत येते, तेव्हा गर्ड (GERD) चा त्रास होतो.'
  },
  'Drug Reaction': {
    en: 'An adverse reaction to medications or foreign compounds that can cause rash, itching, fever, or digestive symptoms.',
    hi: 'दवाइयों या बाहरी तत्वों के प्रति प्रतिकूल प्रतिक्रिया, जिससे चकत्ते, खुजली या पेट की समस्याएं हो सकती हैं।',
    mr: 'औषधांची अनिष्ट प्रतिक्रिया, ज्यामुळे पुरळ, खाज किंवा पोटाचा त्रास होऊ शकतो.'
  },
  'Bronchial Asthma': {
    en: 'A respiratory condition in which the airways narrow and swell, causing coughing, wheezing, and shortness of breath.',
    hi: 'श्वसन संबंधी स्थिति जिसमें वायुमार्ग संकीर्ण हो जाते हैं, जिससे खांसी और सांस लेने में कठिनाई होती है।',
    mr: 'श्वसनमार्गात जळजळ आणि सूज येऊन खोकला व धाप लागण्याची स्थिती.'
  },
  'Peptic Ulcer Disease': {
    en: 'Sores that develop on the inside lining of the stomach and upper small intestine, causing abdominal pain.',
    hi: 'पेट की अंदरूनी परत में घाव या छाले, जिससे पेट में दर्द होता है।',
    mr: 'पोटाच्या आतील भागात अल्सर किंवा जखम, ज्यामुळे पोटदुखी होते.'
  },
  'Gastroenteritis': {
    en: 'An inflammation of the lining of the intestines caused by a virus, bacteria, or parasites, causing stomach pain, fever, and nausea.',
    hi: 'आंतों में सूजन या संक्रमण, जिससे पेट दर्द, बुखार और उल्टी/मतली हो सकती है।',
    mr: 'आतड्यांमधील संसर्ग किंवा सूज, ज्यामुळे पोटदुखी, ताप आणि मळमळ होते.'
  },
  'Common Cold': {
    en: 'A viral infection of the upper respiratory tract causing cough, sore throat, runny nose, and low fever.',
    hi: 'ऊपरी श्वसन पथ का वायरल संक्रमण, जिससे खांसी, गले में खराश और हल्का बुखार होता है।',
    mr: 'श्वसनमार्गाचा सौम्य विषाणू संसर्ग, ज्यामुळे खोकला आणि ताप येतो.'
  },
};

export function DiseaseResults({
  result,
  status,
  error,
  language: explicitLang,
}: {
  result: DiseasePrediction | null;
  status: string;
  error: string;
  language?: SupportedLanguage;
}) {
  const t = useUiText();
  const { language: appLang } = useApp();
  const currentLang: SupportedLanguage = explicitLang || (appLang === 'Hindi' ? 'hi' : appLang === 'Marathi' ? 'mr' : 'en');
  const title = t('Possible Conditions', 'संभावित स्थितियाँ', 'संभाव्य स्थिती');

  if (!result) {
    return (
      <Section title={title} aria-live="polite">
        <p>{status === 'loading'
          ? t('Reviewing your symptoms and estimating possible conditions…', 'लक्षणों की समीक्षा और संभावित स्थितियों का अनुमान जारी है…', 'लक्षणांचा आढावा आणि संभाव्य स्थितींचा अंदाज सुरू आहे…')
          : error || t('Condition estimates are not available for this assessment.', 'इस मूल्यांकन के लिए स्थितियों के अनुमान उपलब्ध नहीं हैं।', 'या मूल्यांकनासाठी स्थितींचे अंदाज उपलब्ध नाहीत.')}</p>
        <Notice>{t('This is not a diagnosis. Your urgency level and triage recommendations take priority.', 'यह निदान नहीं है। आपकी तात्कालिकता और सिफारिशें प्राथमिकता रखती हैं।', 'हे निदान नाही. तुमची तातडीची पातळी आणि शिफारशींना प्राधान्य आहे.')}</Notice>
      </Section>
    );
  }

  // Filter out invalid/zero/general_evidence bars and duplicate symptoms
  const seenSymptoms = new Set<string>();
  const bars = (result.shap_top5 || [])
    .filter(v => v && typeof v.symptom === 'string' && v.symptom.trim().length > 0 && v.symptom !== 'general_evidence')
    .map(v => {
      const translated = formatSymptomName(v.symptom, currentLang);
      const isAbsent = v.present === false;
      const statusSuffix = isAbsent ? ` (${t('not reported', 'नहीं बताया', 'नोंदवलेले नाही')})` : '';
      const displayLabel = (translated || v.symptom.replace(/_/g, ' ')).trim() + statusSuffix;
      return {
        ...v,
        label: displayLabel,
        points: (v.contribution || 0) * 100,
      };
    })
    .filter(v => v.label.trim().length > 0 && (v.present || Math.abs(v.points) >= 0.05))
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
    .filter(v => {
      if (seenSymptoms.has(v.symptom)) return false;
      seenSymptoms.add(v.symptom);
      return true;
    });

  const largest = Math.max(1, ...bars.map(v => Math.abs(v.points)));
  const top1 = result.top3[0];
  const top2 = result.top3[1];
  const topMargin = top1 && top2 ? (top1.probability - top2.probability) : 1.0;
  const isRF = result.model_version === 'clinical-41-rf' || result.model_id === 'clinical-41-rf';
  const isOverlapping = isRF
    ? (result.confidence < 0.20 || topMargin < 0.08 || Boolean(result.limited_information))
    : (result.confidence < 0.50 || topMargin < 0.10 || Boolean(result.limited_information));
  const isUnreliable = isOverlapping || result.uncertain || Boolean(result.limited_information) || (result.confident === false);

  const modelName = result.model_name || (isRF ? 'Random Forest' : 'XGBoost');
  const datasetSource = result.dataset_source || (isRF ? 'Kaggle 41-Disease Symptom Dataset' : 'DDXPlus Synthetic Benchmark');
  const conditionsCount = result.conditions_count || (isRF ? 41 : 49);
  const scoreType = result.score_type || t('Calibrated probability', 'कैलिब्रेटेड संभावना', 'कॅलिब्रेटेड संभाव्यता');
  const calibrationStatus = result.calibration_status || (isRF ? 'Calibrated (sigmoid)' : 'Calibrated (isotonic)');

  return (
    <Section title={title}>
      <p className="text-sm text-slate-600 mb-3">
        {t(
          'These are model-generated estimates, not confirmed diagnoses.',
          'ये मॉडल द्वारा तैयार किए गए अनुमान हैं, पक्के निदान नहीं।',
          'हे मॉडेलने तयार केलेले अंदाज आहेत, पक्के निदान नाही.'
        )}
      </p>

      {/* Verified Model Provenance Row */}
      <div className="model-provenance-bar mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex flex-wrap gap-x-5 gap-y-1.5 items-center">
        <div><span className="text-slate-500">{t('Prediction Model:', 'पूर्वानुमान मॉडल:', 'अंदाज मॉडेल:')}</span> <strong>{modelName}</strong></div>
        <div><span className="text-slate-500">{t('Dataset:', 'डेटासेट:', 'डेटासेट:')}</span> <strong>{datasetSource}</strong></div>
        <div><span className="text-slate-500">{t('Conditions Supported:', 'समर्थित स्थितियाँ:', 'समर्थित स्थिती:')}</span> <strong>{conditionsCount}</strong></div>
        <div><span className="text-slate-500">{t('Confidence Type:', 'विश्वास प्रकार:', 'विश्वास प्रकार:')}</span> <strong>{scoreType} ({calibrationStatus})</strong></div>
        {result.is_fallback && result.fallback_reason && (
          <div className="w-full text-amber-700 mt-1 border-t border-slate-200 pt-1">
            <span className="font-semibold">{t('Fallback routing:', 'फ़ॉलबैक रूटिंग:', 'फॉलबॅक मार्ग:')}</span> {result.fallback_reason}
          </div>
        )}
      </div>

      {result.red_flag_override && (
        <Notice tone="danger" role="alert">
          <strong>{t('Emergency indicators detected. A serious emergency cannot be ruled out.', 'आपातकालीन संकेत मिले। गंभीर आपातस्थिति को खारिज नहीं किया जा सकता।', 'आपत्कालीन लक्षण आढळले. गंभीर आपत्कालीन स्थिती नाकारता येत नाही.')}</strong>
        </Notice>
      )}

      {result.disease_safety_override && (
        <Notice tone="warning" role="alert">
          <p>{t('Precautionary urgency level', 'एहतियात के तौर पर तात्कालिकता', 'खबरदारी म्हणून तातडीची पातळी')}: <Badge urgency={result.disease_safety_floor || result.urgency} />. {result.disease_safety_conditions.join(', ')}.</p>
        </Notice>
      )}

      {/* Evidence Quality Gate Banner: Outside Model Scope */}
      {result.within_model_scope === false && (
        <Notice tone="warning" role="status">
          <strong>{t('Evidence Quality Gate: Outside Acute Model Scope', 'प्रमाण गुणवत्ता गेट: मॉडल के दायरे से बाहर', 'पुरावा गुणवत्ता गेट: मॉडेलच्या कक्षेबाहेर')}</strong>
          <p className="mt-1 text-sm font-semibold text-amber-950">
            {result.scope_note || t(
              'The clinical presentation falls outside the 49 acute hospital conditions represented in this benchmark model. Predictions cannot be presented as a reliable differential diagnosis.',
              'यह लक्षण प्रस्तुति इस बेंचमार्क मॉडल में शामिल 49 तीव्र स्थितियों के दायरे से बाहर है। मॉडल अनुमानों को विश्वसनीय निदान के रूप में प्रस्तुत नहीं किया जा सकता।',
              'ही लक्षणे या मॉडेलमधील 49 तीव्र स्थितींच्या कक्षेबाहेर आहेत. मॉडेलचे अंदाज खात्रीशीर निदान म्हणून दाखवले जाऊ शकत नाहीत.'
            )}
          </p>
          {result.gate_reasons && result.gate_reasons.length > 0 && (
            <ul className="mt-2 text-xs text-amber-900 list-disc list-inside space-y-1">
              {result.gate_reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          )}
          {result.suggested_followups && result.suggested_followups.length > 0 && (
            <div className="mt-3 pt-2 border-t border-amber-300/60">
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider block mb-1">
                {t('Clinical Guidance & Follow-up Considerations:', 'चिकित्सीय मार्गदर्शन और अनुवर्ती विचार:', 'वैद्यकीय मार्गदर्शन आणि पाठपुरावा विचार:')}
              </span>
              <ul className="text-xs text-amber-900 space-y-1">
                {result.suggested_followups.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-teal-700 font-bold shrink-0">→</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Notice>
      )}

      {/* Prediction Uncertainty Notice for within-scope cases */}
      {result.within_model_scope !== false && isUnreliable && (
        <Notice tone="warning" role="status">
          <strong>{t('Prediction Uncertainty: Inconclusive Symptoms', 'पूर्वानुमान अनिश्चितता: अनिर्णायक लक्षण', 'अंदाज अनिश्चितता: अनिर्णायक लक्षणे')}</strong>
          <p className="mt-1 text-sm font-semibold text-amber-950">
            {t(
              'Several conditions may share these symptoms. The model cannot reliably distinguish between them using the information provided.',
              'कई स्थितियाँ इन लक्षणों को साझा कर सकती हैं। प्रदान की गई जानकारी का उपयोग करके मॉडल उनके बीच विश्वसनीय रूप से अंतर नहीं कर सकता है।',
              'अनेक आजारांमध्ये ही लक्षणे सामायिक असू शकतात. दिलेल्या माहितीच्या आधारे मॉडेल त्यांच्यामध्ये खात्रीशीरपणे फरक करू शकत नाही.'
            )}
          </p>
          {result.gate_reasons && result.gate_reasons.length > 0 && (
            <ul className="mt-2 text-xs text-amber-900 list-disc list-inside space-y-0.5">
              {result.gate_reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-amber-900 leading-relaxed">
            {isRF ? (
              t(
                `The top candidate (${top1 ? top1.disease : 'Condition'}) has ${(top1 ? top1.probability * 100 : 0).toFixed(1)}% calibrated probability across the 41 supported conditions. Non-specific symptoms overlap across multiple disease classes and require clinical evaluation to differentiate.`,
                `शीर्ष उम्मीदवार (${top1 ? top1.disease : 'स्थिति'}) 41 स्थितियों में ${(top1 ? top1.probability * 100 : 0).toFixed(1)}% कैलिब्रेटेड संभावना रखता है। गैर-विशिष्ट लक्षण कई स्थितियों में मेल खाते हैं और अंतर करने के लिए चिकित्सकीय मूल्यांकन की आवश्यकता होती है।`,
                `पहिला आजार (${top1 ? top1.disease : 'स्थिती'}) 41 आजारांपैकी ${(top1 ? top1.probability * 100 : 0).toFixed(1)}% कॅलिब्रेटेड संभाव्यता दर्शवतो. अचूक फरकासाठी वैद्यकीय मूल्यमापन आवश्यक आहे.`
              )
            ) : top1 && top2 ? (
              t(
                `The top condition probability is ${Math.round(top1.probability * 100)}% and closely overlaps with alternative conditions (${Math.round(topMargin * 100)}% margin between ${top1.disease} and ${top2.disease}). Broad non-specific symptoms require professional clinical evaluation to differentiate.`,
                `शीर्ष स्थिति की संभावना ${Math.round(top1.probability * 100)}% है और अन्य स्थितियों से मिलती-जुलती है (${top1.disease} और ${top2.disease} के बीच ${Math.round(topMargin * 100)}% का अंतर)। सटीक अंतर के लिए चिकित्सकीय मूल्यांकन आवश्यक है।`,
                `पहिल्या स्थितीची संभाव्यता ${Math.round(top1.probability * 100)}% असून ती इतर स्थितींशी जुळणारी आहे (${top1.disease} आणि ${top2.disease} मध्ये ${Math.round(topMargin * 100)}% फरक). अचूक फरकासाठी वैद्यकीय मूल्यमापन आवश्यक आहे.`
              )
            ) : (
              t(
                'Multiple conditions share overlapping statistical patterns for these symptoms.',
                'इन लक्षणों के लिए कई स्थितियाँ समान सांख्यिकीय पैटर्न साझा करती हैं।',
                'या लक्षणांसाठी अनेक आजार समान नमुने दर्शवतात.'
              )
            )}
          </p>
          {result.suggested_followups && result.suggested_followups.length > 0 && (
            <div className="mt-2 pt-2 border-t border-amber-300/60">
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider block mb-1">
                {t('Suggested Follow-up Questions:', 'सुझाए गए अनुवर्ती प्रश्न:', 'सुचवलेले पाठपुरावा प्रश्न:')}
              </span>
              <ul className="text-xs text-amber-900 space-y-1">
                {result.suggested_followups.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-teal-700 font-bold shrink-0">→</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Notice>
      )}

      {/* Conditions Title/Header when Out-of-Scope */}
      {result.within_model_scope === false && (
        <div className="text-xs font-medium text-slate-500 mb-1">
          {t(
            'Benchmark Closed-World Statistical Associations (Non-Definitive):',
            'बेंचमार्क बंद-दायरा सांख्यिकीय संबंध (गैर-निर्णायक):',
            'बेंचमार्क बंद-कक्षा सांख्यिकी संबंध (अनिर्णायक):'
          )}
        </div>
      )}

      {/* Top 3 Predictions */}
      <ul className="condition-list space-y-3" aria-label={title}>
        {result.top3.map((condition, i) => {
          const desc = CONDITION_DESCRIPTIONS[condition.disease];
          const isOutOfScope = result.within_model_scope === false;
          return (
            <li
              key={`${condition.disease}-${i}`}
              className={`p-4 rounded-xl border bg-white ${
                isOutOfScope
                  ? 'border-slate-200 bg-slate-50/50'
                  : i === 0
                  ? 'border-teal-500 shadow-sm'
                  : 'border-slate-200'
              }`}
            >
              <div className="row between items-center">
                <span className="condition-name font-semibold text-slate-900">
                  <span className="condition-rank mr-2 text-slate-500 font-normal">#{i + 1}</span>
                  {condition.disease}
                  {isOutOfScope && (
                    <span className="ml-2 text-[11px] font-normal text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                      {t('statistical artifact', 'सांख्यिकीय आर्टिफैक्ट', 'सांख्यिकी निष्कर्ष')}
                    </span>
                  )}
                </span>
                <div className="text-right">
                  <strong className={`condition-pct font-bold text-base ${isOutOfScope ? 'text-slate-600' : 'text-teal-800'}`}>
                    {(condition.probability * 100).toFixed(1)}%
                  </strong>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {scoreType}
                  </div>
                </div>
              </div>
              <progress
                max={1}
                value={condition.probability}
                className={`w-full mt-2 ${isOutOfScope ? 'accent-slate-400' : ''}`}
                aria-label={`${condition.disease}: ${(condition.probability * 100).toFixed(1)}%`}
              />
              {desc && (
                <p className="text-xs text-slate-600 mt-2">
                  {t(desc.en, desc.hi, desc.mr)}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-slate-500 mt-3">
        {t(
          'These are model-generated possibilities from statistical symptom patterns, not confirmed diagnoses. Always consult a qualified physician.',
          'ये सांख्यिकीय लक्षण पैटर्न से मॉडल द्वारा तैयार की गई संभावनाएँ हैं, पक्के निदान नहीं। हमेशा डॉक्टर से सलाह लें।',
          'हे सांख्यिकी नमुन्यांवरून मॉडेलने तयार केलेले संभाव्य अंदाज आहेत, पक्के निदान नाही. नेहमी डॉक्टरांचा सल्ला घ्या.'
        )}
      </p>

      {/* Section 4: How this estimate was made */}
      <details className="report-details mt-4">
        <summary className="cursor-pointer text-sm font-semibold text-teal-800 hover:text-teal-900">
          {t('How this estimate was made', 'यह अनुमान कैसे बना', 'हा अंदाज कसा तयार झाला')}
        </summary>
        <div className="stack mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <dl className="facts">
            <div><dt>{t('Age used', 'उपयोग की गई उम्र', 'वापरलेले वय')}</dt><dd>{result.age_used == null ? t('Not used', 'उपयोग नहीं', 'वापरले नाही') : result.age_used}{result.age_group_used ? ' (' + result.age_group_used + ')' : ''}</dd></div>
            <div><dt>{t('Sex used', 'लिंग', 'लिंग')}</dt><dd>{result.sex_used ?? t('Not provided', 'नहीं बताया', 'दिलेली नाही')}</dd></div>
            <div><dt>{t('Symptoms evaluated', 'जाँचे गए लक्षण', 'तपासलेली लक्षणे')}</dt><dd>{result.symptoms_used.map(s => formatSymptomName(s, currentLang)).filter(Boolean).join(', ') || t('None', 'कोई नहीं', 'काही नाही')}</dd></div>
          </dl>
          {result.ignored_symptoms.length > 0 && (
            <p className="text-xs text-slate-500 mt-2">
              {t('Symptoms outside this dataset', 'डेटासेट में शामिल नहीं लक्षण', 'डेटासेटमध्ये नसलेली लक्षणे')}: {result.ignored_symptoms.map(s => formatSymptomName(s, currentLang)).filter(Boolean).join(', ')}.
            </p>
          )}

          {bars.length > 0 ? (
            <div className="stack mt-3">
              <p className="text-xs text-slate-600 font-medium">
                {t(
                  'Symptom contribution to top condition (statistical association, not biological cause):',
                  'शीर्ष स्थिति में लक्षणों का योगदान (सांख्यिकीय संबंध, जैविक कारण नहीं):',
                  'पहिल्या स्थितीतील लक्षणांचे योगदान (सांख्यिकी संबंध, जैविक कारण नाही):'
                )}
              </p>
              <ul className="contributions list-none space-y-2 mt-2">
                {bars.map((v, i) => (
                  <li key={`${v.symptom}-${i}`} className="text-xs">
                    <div className="row between">
                      <span className="font-medium text-slate-700 capitalize">{v.label}</span>
                      <strong>{v.points >= 0 ? '+' : '−'}{Math.abs(v.points).toFixed(1)} {t('pts', 'अंक', 'गुण')}</strong>
                    </div>
                    <progress max={largest} value={Math.abs(v.points)} className="w-full" aria-label={v.label} />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-slate-500 mt-2">
              {t(
                'Detailed prediction explanations are unavailable for this assessment.',
                'इस मूल्यांकन के लिए विस्तृत भविष्यवाणी स्पष्टीकरण उपलब्ध नहीं हैं।',
                'या मूल्यांकनासाठी तपशीलवार अंदाज स्पष्टीकरणे उपलब्ध नाहीत.'
              )}
            </p>
          )}

          <p className="text-xs text-slate-400 mt-3 pt-2 border-t border-slate-200">
            {result.context_note || t('Statistical pattern matching from research dataset.', 'शोध डेटासेट से सांख्यिकीय पैटर्न मिलान।', 'संशोधन डेटासेटमधील सांख्यिकी नमुना जुळणी.')}
          </p>
        </div>
      </details>
    </Section>
  );
}
