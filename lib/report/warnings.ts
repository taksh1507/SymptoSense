export function getWarningSigns(primarySymptom: string, additionalSymptoms: string[], riskLevel: string): string[] {
  const signs = ['Watch for any sudden worsening of symptoms.'];
  const all = [primarySymptom, ...additionalSymptoms];
  if (all.some(s => s === 'chest_pain' || s === 'breathlessness')) {
    signs.push('Seek help immediately if breathing becomes difficult.');
  }
  if (all.some(s => s === 'fever')) {
    signs.push('Monitor temperature — seek care if it rises above 39°C (102°F).');
  }
  if (all.some(s => s === 'dizziness')) {
    signs.push('Avoid driving or operating machinery until fully recovered.');
  }
  if (riskLevel === 'High') {
    signs.push('Do not delay — high-risk symptoms require prompt evaluation.');
  }
  signs.push('Return for a new assessment if new symptoms develop.');
  return signs.slice(0, 4);
}

export function getDrugWarnings(onBloodThinners: boolean, symptomTokens: string[]): string[] {
  if (!onBloodThinners) return [];
  const warnings: string[] = [];
  const text = symptomTokens.join(' ').toLowerCase();
  if (/(bleed|bleeding|blood.?in.?stool|rectal.?bleed|vomit)/.test(text)) {
    warnings.push('You are on blood thinners and report bleeding-related symptoms — this warrants prompt medical care. Do not stop your medication on your own; consult a doctor first.');
  }
  if (symptomTokens.some((s) => s === 'chest_pain' || s === 'breathlessness')) {
    warnings.push('Blood thinners increase bleeding risk in cardiac events — chest pain or breathing difficulty here needs urgent evaluation by a professional.');
  }
  return warnings;
}
