'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, AlertTriangle, ShieldCheck, Clock, FileText } from 'lucide-react';
import PublicNav from './components/PublicNav';
import PublicFooter from './components/PublicFooter';
import { Badge, Button, Notice } from '@/components/ui/primitives';
import { useUiText } from '@/components/ui/use-ui-text';

export default function LandingPage() {
  const router = useRouter();
  const t = useUiText();

  return (
    <>
      <PublicNav activeLink="home" />
      <main id="main-content">
        <section className="editorial hero">
          <div className="stack-lg">
            <p className="eyebrow">
              {t('A little clarity when you feel unwell', 'तबीयत ठीक न हो, तो अगला कदम समझें', 'बरे वाटत नसल्यास पुढचे पाऊल समजून घ्या')}
            </p>
            <h1>
              {t('Your symptoms. A clearer, safer next step.', 'आपके लक्षण। अगला कदम स्पष्ट, सुरक्षित।', 'तुमची लक्षणे. पुढचे पाऊल स्पष्ट, सुरक्षित.')}
            </h1>
            <p>
              {t(
                'Tell us what has changed and how you feel. We’ll help you understand the urgency of your symptoms and what to discuss with a doctor.',
                'बताएँ कि क्या बदला है और आप कैसा महसूस कर रहे हैं। हम लक्षणों की तात्कालिकता और डॉक्टर से क्या बात करनी है, यह समझने में मदद करेंगे।',
                'काय बदलले आहे आणि कसे वाटते ते सांगा. लक्षणांची तातडी आणि डॉक्टरांशी काय बोलावे हे समजून घेण्यास आम्ही मदत करू.'
              )}
            </p>
            <div className="row">
              <Button id="hero-getstarted-btn" onClick={() => router.push('/auth/signup')}>
                {t('Start an assessment', 'मूल्यांकन शुरू करें', 'मूल्यांकन सुरू करा')}
                <ArrowRight aria-hidden="true" />
              </Button>
              <Button id="hero-signin-btn" variant="secondary" onClick={() => router.push('/auth/login')}>
                {t('Sign in', 'साइन इन', 'साइन इन')}
              </Button>
            </div>
            <p className="muted">English · हिन्दी · मराठी</p>
          </div>

          <aside className="hero-aside stack">
            <p className="eyebrow">{t('Before you begin', 'शुरू करने से पहले', 'सुरू करण्यापूर्वी')}</p>
            <h2>{t('Guidance, with limits.', 'मार्गदर्शन, अपनी सीमाओं के साथ।', 'मार्गदर्शन, त्याच्या मर्यादांसह.')}</h2>
            <p>
              {t(
                'An assessment can help you decide when to seek care. It cannot tell you for certain what condition you have.',
                'मूल्यांकन यह तय करने में मदद कर सकता है कि कब सहायता लें। इससे बीमारी की निश्चित पहचान नहीं हो सकती।',
                'मूल्यांकन कधी मदत घ्यावी हे ठरवण्यास उपयोगी ठरू शकते. यातून आजाराचे निश्चित निदान होत नाही.'
              )}
            </p>
            <Notice tone="danger">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <strong>{t('Do not wait in an emergency.', 'आपातस्थिति में इंतज़ार न करें।', 'आपत्कालीन स्थितीत थांबू नका.')}</strong>
                  <p className="mt-1">
                    {t(
                      'For life-threatening symptoms, seek emergency care immediately.',
                      'जीवन के लिए खतरनाक लक्षण होने पर तुरंत आपातकालीन सहायता लें।',
                      'जीवघेणी लक्षणे असल्यास त्वरित आपत्कालीन मदत घ्या.'
                    )}
                  </p>
                </div>
              </div>
            </Notice>
          </aside>
        </section>

        <section className="editorial split-section" id="how-it-works">
          <div className="stack">
            <p className="eyebrow">{t('The assessment', 'मूल्यांकन', 'मूल्यांकन')}</p>
            <h2>{t('Start with what you know.', 'जो जानते हैं, वहीं से शुरू करें।', 'तुम्हाला माहीत आहे तिथून सुरुवात करा.')}</h2>
          </div>
          <ol className="editorial-list">
            {[
              [
                t('Choose a language and person', 'भाषा और व्यक्ति चुनें', 'भाषा आणि व्यक्ती निवडा'),
                t('Answer for yourself or someone you are helping.', 'अपने लिए या जिस व्यक्ति की मदद कर रहे हैं, उसके लिए उत्तर दें।', 'स्वतःसाठी किंवा तुम्ही मदत करत असलेल्या व्यक्तीसाठी उत्तरे द्या.')
              ],
              [
                t('Describe the symptoms', 'लक्षण बताएँ', 'लक्षणे सांगा'),
                t('Share symptoms, duration, severity, and relevant health history. Type or use voice input.', 'लक्षण, अवधि, गंभीरता और स्वास्थ्य इतिहास बताएँ। लिखकर या बोलकर उत्तर दें।', 'लक्षणे, कालावधी, तीव्रता आणि आरोग्याचा इतिहास सांगा. टाइप करा किंवा बोलून उत्तर द्या.')
              ],
              [
                t('Read your next steps', 'अगले कदम पढ़ें', 'पुढील पावले वाचा'),
                t('Review the urgency, possible conditions, and the information behind the estimate.', 'तात्कालिकता, संभावित स्थितियाँ और अनुमान में उपयोग की गई जानकारी देखें।', 'तातडी, संभाव्य स्थिती आणि अंदाजासाठी वापरलेली माहिती पाहा.')
              ],
            ].map(([title, desc], i) => (
              <li key={title}>
                <span className="rank-number">0{i + 1}</span>
                <div className="stack">
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="editorial split-section" id="features">
          <h2>{t('Understand the urgency.', 'तात्कालिकता समझें।', 'तातडी समजून घ्या.')}</h2>
          <div className="stack">
            <p>
              {t(
                'Every result names the urgency level in words. Read the advice together with the symptoms and information you provided.',
                'हर परिणाम में तात्कालिकता का स्तर शब्दों में दिया जाता है। सलाह को अपने बताए लक्षणों और जानकारी के साथ पढ़ें।',
                'प्रत्येक निकालात तातडीची पातळी शब्दांत दिलेली असते. सल्ला तुम्ही दिलेली लक्षणे आणि माहितीसोबत वाचा.'
              )}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200">
                <Badge urgency="Low">{t('Low urgency', 'कम तात्कालिकता', 'कमी तातडी')}</Badge>
                <p className="text-xs text-slate-700 mt-2 font-medium">
                  {t('Routine consultation or supportive self-monitoring at home.', 'सामान्य परामर्श या घर पर लक्षणों की साधारण निगरानी।', 'सर्वसाधारण सल्ला किंवा घरी लक्षणांवर लक्ष ठेवणे.')}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200">
                <Badge urgency="Medium">{t('Medium urgency', 'मध्यम तात्कालिकता', 'मध्यम तातडी')}</Badge>
                <p className="text-xs text-slate-700 mt-2 font-medium">
                  {t('Schedule a clinical visit with a doctor within 24 to 48 hours.', '24 से 48 घंटों के भीतर डॉक्टर से मिलने का समय निर्धारित करें।', '24 ते 48 तासांत डॉक्टरांशी भेट निश्चित करा.')}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-red-50/70 border border-red-200">
                <Badge urgency="High">{t('High urgency', 'उच्च तात्कालिकता', 'उच्च तातडी')}</Badge>
                <p className="text-xs text-slate-700 mt-2 font-medium">
                  {t('Prompt medical attention required; seek immediate clinical or ER evaluation.', 'त्वरित चिकित्सा सहायता आवश्यक; आपातकालीन जांच तुरंत कराएँ।', 'तात्काळ वैद्यकीय मदत आवश्यक; त्वरित आपत्कालीन तपासणी करा.')}
                </p>
              </div>
            </div>
            <div className="pt-2">
              <Button id="cta-getstarted-btn" onClick={() => router.push('/auth/signup')}>
                {t('Begin with your symptoms', 'अपने लक्षणों से शुरू करें', 'तुमच्या लक्षणांपासून सुरुवात करा')}
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
