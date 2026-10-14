'use client';

import { Activity, Shield, Lock, Info } from 'lucide-react';
import { Notice } from '@/components/ui/primitives';
import { useUiText } from '@/components/ui/use-ui-text';

export default function PublicFooter() {
  const t = useUiText();

  return (
    <footer className="public-footer">
      <div className="editorial stack-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Activity className="w-5 h-5 text-teal-100" />
            </span>
            <span className="font-bold text-lg text-slate-900 tracking-tight">SymptoSense</span>
          </div>
          <p className="text-xs text-slate-500">
            {t(
              'A clinical decision-support and urgency estimation platform.',
              'चिकित्सकीय निर्णय सहायता और तात्कालिकता अनुमान प्रणाली।',
              'वैद्यकीय निर्णय सहाय्य आणि तातडी अंदाज व्यासपीठ.'
            )}
          </p>
        </div>

        <Notice tone="info">
          <strong>
            {t(
              'Decision support only. This is not a diagnosis.',
              'केवल निर्णय में सहायता के लिए। यह निदान नहीं है।',
              'केवळ निर्णय घेण्यास मदत. हे निदान नाही.'
            )}
          </strong>
          <p className="mt-1">
            {t(
              'SymptoSense does not replace professional medical advice, clinical diagnosis, or immediate emergency evaluation. Always consult a qualified healthcare provider.',
              'SymptoSense पेशेवर चिकित्सा सलाह, नैदानिक निदान या आपातकालीन जांच का विकल्प नहीं है। हमेशा योग्य चिकित्सक से संपर्क करें।',
              'SymptoSense व्यावसायिक वैद्यकीय सल्ला, क्लिनिकल निदान किंवा तातडीच्या आपत्कालीन तपासणीची जागा घेत नाही. नेहमी पात्र डॉक्टरांचा सल्ला घ्या.'
            )}
          </p>
        </Notice>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
          <div className="stack">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <Info className="w-4 h-4 text-teal-700" aria-hidden="true" />
              <span>{t('Clinical Limitations', 'चिकित्सकीय सीमाएँ', 'वैद्यकीय मर्यादा')}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t(
                'Estimates are derived from probabilistic decision heuristics and evidence models. Safety rules always take precedence over statistical scores.',
                'अनुमान प्रायोगिक निर्णय विधियों और सांख्यिकीय मॉडल पर आधारित हैं। सुरक्षा नियम हमेशा सांख्यिकीय स्कोर से ऊपर रहते हैं।',
                'अंदाज संभाव्यता निर्णय पद्धतींवर आधारित आहेत. सुरक्षिततेचे नियम नेहमी सांख्यिकीय स्कोअरपेक्षा प्राधान्य घेतात.'
              )}
            </p>
          </div>

          <div className="stack">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <Lock className="w-4 h-4 text-teal-700" aria-hidden="true" />
              <span>{t('Privacy Commitment', 'गोपनीयता प्रतिबद्धता', 'गोपनीयतेची बांधिलकी')}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t(
                'Assessment answers and health records belong entirely to you. Symptom data is encrypted in transit and never sold to third parties or advertisers.',
                'मूल्यांकन के उत्तर और स्वास्थ्य रिकॉर्ड पूरी तरह आपके हैं। लक्षण डेटा एन्क्रिप्टेड है और कभी बेचा नहीं जाता।',
                'मूल्यांकनाची उत्तरे आणि आरोग्याच्या नोंदी पूर्णपणे तुमच्या आहेत. लक्षणांचा डेटा सुरक्षित ठेवला जातो आणि विकला जात नाही.'
              )}
            </p>
          </div>

          <div className="stack">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <Shield className="w-4 h-4 text-teal-700" aria-hidden="true" />
              <span>{t('Model Transparency', 'मॉडल पारदर्शिता', 'मॉडेल पारदर्शकता')}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t(
                'Condition probabilities include transparent SHAP feature contributions, explicit uncertainty flags, and verified audit metrics.',
                'संभाव्यताओं में पारदर्शी SHAP योगदान, अनिश्चितता के स्पष्ट संकेत और सत्यापित ऑडिट मेट्रिक्स शामिल हैं।',
                'संभाव्यतेमध्ये पारदर्शक SHAP योगदान, स्पष्ट अनिश्चितता निर्देशक आणि पडताळलेले ऑडिट मेट्रिक्स समाविष्ट आहेत.'
              )}
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} SymptoSense. {t('All rights reserved.', 'सर्वाधिकार सुरक्षित।', 'सर्व हक्क राखीव.')}</p>
          <p>English · हिन्दी · मराठी</p>
        </div>
      </div>
    </footer>
  );
}
