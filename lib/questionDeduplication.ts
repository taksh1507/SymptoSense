/**
 * Clinical question intent and semantic deduplication.
 * Prevents redundant follow-up questions during adaptive assessment.
 */

export interface QuestionSummary {
  question: string;
  category?: string;
}

export type ClinicalIntent =
  | 'triggers'
  | 'progression'
  | 'location'
  | 'prior_episodes'
  | 'exposures'
  | 'associated_symptoms'
  | 'system_review'
  | 'general';

const INTENT_PATTERNS: Array<{ intent: ClinicalIntent; regex: RegExp }> = [
  {
    intent: 'triggers',
    regex: /\b(better or worse|aggravat|reliev|trigger|makes? it (better|worse)|what makes|eating|posture|movement|physical exertion)\b/i,
  },
  {
    intent: 'progression',
    regex: /\b(progress|onset|sudden|gradual|getting worse|getting better|staying the same|trend|how did it start|over the last)\b/i,
  },
  {
    intent: 'location',
    regex: /\b(where|radiat|spread|which (side|part|area)|exact location|focal|diffuse)\b/i,
  },
  {
    intent: 'prior_episodes',
    regex: /\b(before|happened before|past episode|previous episode|similar episode|ever had this|diagnosed in the past)\b/i,
  },
  {
    intent: 'exposures',
    regex: /\b(sick contact|anyone around|travel|exposure|diet change|water|insect|tick|smoke)\b/i,
  },
  {
    intent: 'system_review',
    regex: /\b(urination|bowel|breathing|swallowing|digestion|vision|hearing|stool|urine)\b/i,
  },
  {
    intent: 'associated_symptoms',
    regex: /\b(also|other symptoms?|along with|accompanying|in addition|notice any other)\b/i,
  },
];

export function extractClinicalIntent(text: string): ClinicalIntent {
  for (const { intent, regex } of INTENT_PATTERNS) {
    if (regex.test(text)) {
      return intent;
    }
  }
  return 'general';
}

function cleanTokens(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'your', 'you',
  'have', 'are', 'any', 'what', 'does', 'how', 'when', 'which', 'been',
]);

export function calculateTokenOverlap(a: string, b: string): number {
  const setA = cleanTokens(a);
  const setB = cleanTokens(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let matches = 0;
  for (const word of setA) {
    if (setB.has(word)) matches++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? matches / union : 0;
}

/**
 * Returns true if newQuestion duplicates the clinical intent or heavily overlaps
 * with any previously asked question.
 */
export function isDuplicateQuestion(
  newQuestion: string,
  newCategory: string | undefined,
  previousQuestions: QuestionSummary[]
): boolean {
  if (!previousQuestions || previousQuestions.length === 0) return false;

  const newIntent = extractClinicalIntent(newQuestion);

  for (const prev of previousQuestions) {
    // 1. Same identified clinical intent (e.g. both asking about triggers / better / worse)
    if (newIntent !== 'general' && newIntent === extractClinicalIntent(prev.question)) {
      return true;
    }

    // 2. Exact or heavy category match for narrow clinical categories
    if (
      newCategory &&
      prev.category &&
      newCategory === prev.category &&
      (newCategory === 'symptom_triggers' || newCategory === 'episode_history')
    ) {
      return true;
    }

    // 3. High lexical/semantic word overlap (> 45%)
    if (calculateTokenOverlap(newQuestion, prev.question) > 0.45) {
      return true;
    }
  }

  return false;
}
