'use client';
import { useApp } from '../context/AppContext';
import { Section } from '@/components/ui/primitives';
const STEPS = {
  en: [{ label: 'Collect symptom answers', icon: '' }, { label: 'Calculate urgency', icon: '' }, { label: 'Review input patterns', icon: '' }, { label: 'Estimate possible conditions', icon: '' }, { label: 'Save the assessment', icon: '' }],
  hi: [{ label: 'लक्षणों के उत्तर इकट्ठा करें', icon: '' }, { label: 'तात्कालिकता की गणना करें', icon: '' }, { label: 'इनपुट पैटर्न की समीक्षा करें', icon: '' }, { label: 'संभावित स्थितियों का अनुमान लगाएँ', icon: '' }, { label: 'मूल्यांकन सहेजें', icon: '' }],
  mr: [{ label: 'लक्षणांची उत्तरे गोळा करा', icon: '' }, { label: 'तातडी मोजा', icon: '' }, { label: 'माहितीच्या नमुन्यांचा आढावा घ्या', icon: '' }, { label: 'संभाव्य स्थितींचा अंदाज घ्या', icon: '' }, { label: 'मूल्यांकन जतन करा', icon: '' }],
};
const TITLES = {
  en: { main: 'Preparing your assessment', sub: 'The steps below show the available results and save status.' },
  hi: { main: 'आपका मूल्यांकन तैयार हो रहा है', sub: 'नीचे उपलब्ध परिणाम और सहेजने की स्थिति दी गई है।' },
  mr: { main: 'तुमचे मूल्यांकन तयार होत आहे', sub: 'खाली उपलब्ध निकाल आणि जतन करण्याची स्थिती दाखवली आहे.' },
};
export default function LoadingScreen() {
  const { language, assessmentPayload, mlLevel, diseaseStatus, saveStatus } = useApp();
  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';
  const steps = STEPS[langKey];
  const title = TITLES[langKey];
  const done = [!!assessmentPayload, !!assessmentPayload, mlLevel !== 'unavailable', diseaseStatus === 'ready', saveStatus === 'saved'];
  const doneCount = done.filter(Boolean).length;
  const status = (i: number) => done[i] ? (langKey === 'hi' ? 'पूरा' : langKey === 'mr' ? 'पूर्ण' : 'Complete') : (i === 3 && diseaseStatus === 'unavailable') || (i === 4 && saveStatus === 'failed') ? (langKey === 'hi' ? 'उपलब्ध नहीं' : langKey === 'mr' ? 'उपलब्ध नाही' : 'Unavailable') : (langKey === 'hi' ? 'बाकी है' : langKey === 'mr' ? 'प्रलंबित' : 'Pending');
  return <div className="page"><Section className="question-flow" title={title.main} aria-busy={doneCount < steps.length}><p>{title.sub}</p><progress max={steps.length} value={doneCount} aria-label={title.main} /><ol className="loading-steps">{steps.map((step,i) => <li key={step.label}><span>{step.label}</span><span className="muted">{status(i)}</span></li>)}</ol></Section></div>;
}
