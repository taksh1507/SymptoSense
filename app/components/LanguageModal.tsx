'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { useApp, type Language } from '../context/AppContext';
import { Button } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
const LANGUAGES: { code: Language; flag: string; native: string; sub: string }[] = [
  { code: 'English', flag: '', native: 'English', sub: 'English' },
  { code: 'Hindi', flag: '', native: 'हिन्दी', sub: 'Hindi' },
  { code: 'Marathi', flag: '', native: 'मराठी', sub: 'Marathi' },
];
export default function LanguageModal() {
  const { setLanguage, setTriageScreen, cancelTest } = useApp();
  const [selected,setSelected] = useState<Language>('English');
  const t = (en: string,hi: string,mr: string) => selected === 'Hindi' ? hi : selected === 'Marathi' ? mr : en;
  return <Modal title={t('Choose your language','अपनी भाषा चुनें','तुमची भाषा निवडा')} onClose={cancelTest}>
    <p>{t('Use the language you are most comfortable with.','जिस भाषा में सहज हों, उसे चुनें।','तुम्हाला सोयीची वाटणारी भाषा निवडा.')}</p>
    <div className="stack">{LANGUAGES.map(lang => <button key={lang.code} id={'lang-'+lang.code.toLowerCase()} className="option" aria-pressed={selected === lang.code} onClick={() => setSelected(lang.code)}><span className="option-label" lang={lang.code === 'Hindi' ? 'hi' : lang.code === 'Marathi' ? 'mr' : 'en'}>{lang.native}</span>{selected === lang.code && <Check aria-hidden="true" />}</button>)}</div>
    <div className="row between"><Button id="lang-cancel-btn" variant="secondary" onClick={cancelTest}>{t('Cancel','रद्द करें','रद्द करा')}</Button><Button id="lang-continue-btn" onClick={() => { setLanguage(selected); setTriageScreen('person'); }}>{t('Continue','आगे बढ़ें','पुढे जा')}</Button></div>
  </Modal>;
}
