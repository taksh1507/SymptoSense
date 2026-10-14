'use client';
import type { Urgency } from '@/lib/ai-engine/scoring/types';
import { Badge } from '@/components/ui/primitives';
import { useUiText } from '@/components/ui/use-ui-text';
export function RiskGauge({ score, urgency, explanation }: { score: number; urgency: Urgency; explanation?: string }) {
  const t = useUiText();
  const labels = { Low: t('Low', 'कम', 'कमी'), Medium: t('Medium', 'मध्यम', 'मध्यम'), High: t('High', 'उच्च', 'उच्च') };
  return <div className="metric">
    <h3>{t('Urgency score', 'तात्कालिकता का स्कोर', 'तातडीचा स्कोअर')}</h3>
    <p className="metric-value">{score} / 100</p>
    <ol className="urgency-scale" aria-label={t('Urgency scale', 'तात्कालिकता का स्तर', 'तातडीची पातळी')}>
      {(['Low','Medium','High'] as const).map(level => <li key={level} aria-current={urgency === level}><Badge urgency={level}>{labels[level]}</Badge></li>)}
    </ol>
    {explanation && <p className="muted">{explanation}</p>}
  </div>;
}
