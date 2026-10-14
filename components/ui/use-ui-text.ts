'use client';
import { useApp } from '@/app/context/AppContext';
export function useUiText() {
  const { language } = useApp();
  return (en: string, hi: string, mr: string) => language === 'Hindi' ? hi : language === 'Marathi' ? mr : en;
}
