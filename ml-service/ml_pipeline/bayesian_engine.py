"""SymCat CDC Bayesian Diagnostic Probability Engine."""
import json
import math
from pathlib import Path
from typing import Dict, List, Any, Optional

ROOT = Path(__file__).resolve().parents[1]
KB_PATH = ROOT / 'artifacts' / 'clinical' / 'symcat_knowledge_base.json'

class BayesianDiagnosticEngine:
    def __init__(self, kb_path: Optional[Path] = None):
        self.path = kb_path or KB_PATH
        self.kb = self._load_kb()

    def _load_kb(self) -> Dict[str, Any]:
        if not self.path.exists():
            return {"conditions": {}, "symptoms": []}
        try:
            return json.loads(self.path.read_text(encoding='utf-8'))
        except Exception:
            return {"conditions": {}, "symptoms": []}

    def infer(self, patient_symptoms: List[str], top_k: int = 3) -> List[Dict[str, Any]]:
        """Compute posterior probabilities P(Condition | Symptoms) using Bayes' Theorem."""
        if not self.kb.get("conditions"):
            return []

        cleaned_symptoms = {s.lower().strip().replace(' ', '_') for s in patient_symptoms}
        scores = []

        for cond_id, cond in self.kb["conditions"].items():
            prevalence = cond.get("prevalence", 0.01)
            # Use log-likelihood to avoid floating-point underflow
            log_prob = math.log(max(1e-5, prevalence))
            matches = 0

            for symptom, p_s_given_c in cond.get("symptoms", {}).items():
                if symptom in cleaned_symptoms:
                    matches += 1
                    log_prob += math.log(max(1e-4, p_s_given_c))
                else:
                    # Penalty for absent expected cardinal symptom
                    if p_s_given_c > 0.8:
                        log_prob += math.log(max(0.1, 1.0 - p_s_given_c * 0.5))

            if matches > 0:
                scores.append({
                    "id": cond_id,
                    "name": cond["name"],
                    "category": cond.get("category", "General"),
                    "icd10": cond.get("icd10", ""),
                    "urgency": cond.get("urgency", "Medium"),
                    "matches": matches,
                    "log_prob": log_prob,
                    "description": cond.get("description", ""),
                    "precautions": cond.get("precautions", []),
                })

        if not scores:
            return []

        # Sort by log likelihood
        scores.sort(key=lambda x: x["log_prob"], reverse=True)
        top_candidates = scores[:top_k]

        # Softmax normalization over the top candidates to get valid probabilities summing to ~1
        max_log = max(c["log_prob"] for c in top_candidates)
        exp_scores = [math.exp(c["log_prob"] - max_log) for c in top_candidates]
        sum_exp = sum(exp_scores)

        results = []
        for i, c in enumerate(top_candidates):
            prob = round(exp_scores[i] / sum_exp, 4) if sum_exp > 0 else 0.33
            results.append({
                "disease": c["name"],
                "probability": float(prob),
                "category": c["category"],
                "icd10": c["icd10"],
                "urgency": c["urgency"],
                "matches": c["matches"],
                "description": c["description"],
                "precautions": c["precautions"],
            })

        return results
