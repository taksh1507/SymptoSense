'use client';

import { useState } from 'react';
import { User as UserIcon, Users as UsersIcon, Check } from 'lucide-react';
import { Button, Field } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useUiText } from '@/components/ui/use-ui-text';
import { useApp, PersonType, Relation, Gender } from '../context/AppContext';

const RELATIONS: Relation[] = ['Parent', 'Child', 'Spouse', 'Sibling', 'Friend', 'Other'];

const OPTIONS: {
  type: PersonType;
  icon: React.ReactNode;
  label: { en: string; hi: string; mr: string };
  desc: { en: string; hi: string; mr: string };
}[] = [
    {
      type: 'self',
      icon: <UserIcon />,
      label: { en: 'Myself', hi: 'मेरे लिए', mr: 'स्वतःसाठी' },
      desc: { en: 'Assess your own symptoms', hi: 'अपने लक्षणों का आकलन करें', mr: 'स्वतःच्या लक्षणांचे मूल्यांकन करा' },
    },
    {
      type: 'family',
      icon: <UsersIcon />,
      label: { en: 'Someone Else', hi: 'किसी और के लिए', mr: 'दुसऱ्यासाठी' },
      desc: { en: "Assess someone else's symptoms", hi: 'किसी और के लक्षणों का आकलन करें', mr: 'इतरांच्या लक्षणांचे मूल्यांकन करा' },
    },
  ];

export default function PersonModal() {
  const t = useUiText();
  const { language, personType, setPersonType, setPatientInfo, setTriageScreen, cancelTest } = useApp();
  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';

  const [name, setName] = useState('');
  const [relation, setRelation] = useState<Relation | ''>('');
  const [customRelation, setCustomRelation] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');

  const GENDERS: { value: Gender; label: { en: string; hi: string; mr: string }; emoji: string }[] = [
    { value: 'Male', label: { en: 'Male', hi: 'पुरुष', mr: 'पुरुष' }, emoji: '' },
    { value: 'Female', label: { en: 'Female', hi: 'महिला', mr: 'महिला' }, emoji: '' },
    { value: 'Other', label: { en: 'Other', hi: 'अन्य', mr: 'इतर' }, emoji: '' },
    { value: 'Prefer not to say', label: { en: 'Prefer not to say', hi: 'बताना नहीं', mr: 'सांगणे नको' }, emoji: '' },
  ];

  const canProceed =
    personType !== null &&
    name.trim().length >= 2 &&
    (personType === 'self' || (personType === 'family' && relation !== ''));

  const handleContinue = () => {
    if (!personType || !canProceed) return;
    const finalRelation: Relation | null =
      personType === 'self'
        ? null
        : relation === 'Other'
          ? ((customRelation.trim() || 'Other') as Relation)
          : (relation as Relation);
    setPatientInfo(name.trim(), finalRelation, gender ? gender as Gender : null);
    setTriageScreen('questions');
  };

  const relationLabels: Record<Relation,string> = {
    Parent: t('Parent','माता-पिता','आई-वडील'), Child: t('Child','बच्चा','मूल'), Spouse: t('Spouse','जीवनसाथी','जोडीदार'), Sibling: t('Sibling','भाई-बहन','भावंड'), Friend: t('Friend','मित्र','मित्र'), Other: t('Other','अन्य','इतर'),
  };
  return <Modal title={t('Who is this assessment for?','यह मूल्यांकन किसके लिए है?','हे मूल्यांकन कोणासाठी आहे?')} onClose={cancelTest}>
    <div className="stack">{OPTIONS.map(opt => { const sel = personType === opt.type; return <button key={opt.type} id={'person-'+opt.type} className="option" aria-pressed={sel} aria-label={opt.label[langKey]} onClick={() => { setPersonType(opt.type); setName(''); setRelation(''); }}>
      {opt.icon}<span className="option-label"><strong>{opt.label[langKey]}</strong><span className="report-category">{opt.desc[langKey]}</span></span>{sel && <Check aria-hidden="true" />}
    </button>; })}</div>
    {personType && <div className="stack">
      <Field id="person-name" label={personType === 'self' ? t('Your name','आपका नाम','तुमचे नाव') : t("Patient’s name",'मरीज़ का नाम','रुग्णाचे नाव')} type="text" value={name} onChange={e => setName(e.target.value)} placeholder={personType === 'self' ? t('e.g. Rishabh','जैसे रिषभ','उदा. रिषभ') : t('e.g. Amit','जैसे अमित','उदा. अमित')} autoComplete="name" autoFocus />
      {personType === 'family' && <div className="stack"><label className="field" htmlFor="person-relation"><span>{t('Relationship','संबंध','नाते')}</span><select id="person-relation" className="input" value={relation} onChange={e => setRelation(e.target.value as Relation)}><option value="">{t('Select relationship…','संबंध चुनें…','नाते निवडा…')}</option>{RELATIONS.map(r => <option key={r} value={r}>{relationLabels[r]}</option>)}</select></label>{relation === 'Other' && <Field id="person-relation-other" label={t('Specify relationship','संबंध बताएँ','नाते सांगा')} value={customRelation} onChange={e => setCustomRelation(e.target.value)} />}</div>}
      <fieldset className="checkin-options"><legend id="person-gender-label">{t('Sex (optional)','लिंग (वैकल्पिक)','लिंग (ऐच्छिक)')}</legend><p className="muted">{t('You can skip this question.','आप यह प्रश्न छोड़ सकते हैं।','तुम्ही हा प्रश्न वगळू शकता.')}</p><div className="person-sex-options">{GENDERS.map(g => <button key={g.value} type="button" className="option" aria-pressed={gender === g.value} onClick={() => setGender(g.value)}><span className="option-label">{g.label[langKey]}</span>{gender === g.value && <Check aria-hidden="true" />}</button>)}</div></fieldset>
    </div>}
    <div className="row between"><Button variant="secondary" onClick={cancelTest}>{t('Back','पीछे','मागे')}</Button><Button onClick={handleContinue} disabled={!canProceed}>{t('Start assessment','मूल्यांकन शुरू करें','मूल्यांकन सुरू करा')}</Button></div>
  </Modal>;
}
