'use client';
import { useUiText } from '@/components/ui/use-ui-text';
export function ConfidenceMeter({ score, level, explanation, kind = 'heuristic' }: { kind?: 'heuristic' | 'disease'; score: number; level: string; explanation: string }) {
  const t = useUiText();
  const unavailable = level === 'unavailable';
  const title = kind === 'disease' ? t('Top condition probability', 'पहली स्थिति की संभावना', 'पहिल्या स्थितीची संभाव्यता') : t('Input pattern score', 'इनपुट पैटर्न स्कोर', 'दिलेल्या माहितीचा नमुना स्कोअर');
  return <div className="metric">
    <h3>{title}</h3>
    <p className="metric-value">{unavailable ? t('Unavailable', 'उपलब्ध नहीं', 'उपलब्ध नाही') : kind === 'disease' ? score.toFixed(1) + '%' : Math.round(score) + '%'}</p>
    {!unavailable && <progress max={100} value={score} aria-label={title} />}
    <p className="muted">{kind === 'disease' ? t('A model estimate, not the chance that a diagnosis is correct.', 'यह मॉडल का अनुमान है, निदान सही होने की संभावना नहीं।', 'हा मॉडेलचा अंदाज आहे; निदान बरोबर असल्याची शक्यता नाही.') : t('A heuristic score, not a clinically validated measure of accuracy.', 'यह अनुमान आधारित स्कोर है; इसकी सटीकता चिकित्सकीय रूप से प्रमाणित नहीं है।', 'हा अंदाजाधारित स्कोअर आहे; अचूकता वैद्यकीयदृष्ट्या प्रमाणित नाही.')}</p>
    {explanation && <p className="muted">{explanation}</p>}
  </div>;
}
