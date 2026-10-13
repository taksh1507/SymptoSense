import { readFileSync } from 'node:fs';
import { calculateRisk, RULE_VERSION } from '../lib/ai-engine/scoring/engine';
import { RED_FLAGS } from '../lib/redFlags';
const rows = JSON.parse(readFileSync(0, 'utf8')) as string[][];
console.log(JSON.stringify({ rule_version: RULE_VERSION, red_flags: [...RED_FLAGS, 'breathlessness', 'confusion'], predictions: rows.map(symptoms => calculateRisk({ symptom: symptoms[0] ?? '', symptoms, severity: 'mild', duration: '< 1 day', additionalSymptoms: [], medicalHistory: [] }).urgency) }));
