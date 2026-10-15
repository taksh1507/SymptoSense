"""Realistic input evidence perturbation for DDXPlus.

Simulates realistic outpatient presentation where patients recall 3 to 8 symptoms,
forget minor details, occasionally describe erroneous symptoms, and omit antecedents.
"""
from __future__ import annotations

from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from .ddxplus_data import parse_evidence, evidence_feature_prefix, load_metadata

_METADATA_CACHE: Optional[tuple[Dict[str, Any], Dict[str, Any]]] = None
_SYMPTOM_VOCAB: Optional[List[Dict[str, Any]]] = None

def _get_symptom_vocab() -> List[Dict[str, Any]]:
    global _METADATA_CACHE, _SYMPTOM_VOCAB
    if _SYMPTOM_VOCAB is None:
        if _METADATA_CACHE is None:
            _METADATA_CACHE = load_metadata()
        evidences, _ = _METADATA_CACHE
        _SYMPTOM_VOCAB = []
        for code, item in evidences.items():
            if not item.get('is_antecedent'):
                _SYMPTOM_VOCAB.append({
                    'code': code,
                    'data_type': item.get('data_type', 'B'),
                    'possible_values': item.get('possible-values', []),
                })
    return _SYMPTOM_VOCAB

def perturb_evidences(
    evidence_str: str,
    rng: np.random.Generator,
    k_min: int = 3,
    k_max: int = 8,
    forget_rate: float = 0.20,
    wrong_rate: float = 0.10,
    antecedent_drop_rate: float = 0.20,
) -> str:
    """Perturb patient evidence tokens into a realistic partial presentation."""
    tokens = parse_evidence(evidence_str)
    if not tokens:
        return '[]'

    symptom_units: Dict[str, List[str]] = {}
    antecedent_units: Dict[str, List[str]] = {}

    for token in tokens:
        base_code = token.split('_@_', 1)[0]
        prefix = evidence_feature_prefix(base_code)
        if prefix == 'antecedent':
            antecedent_units.setdefault(base_code, []).append(token)
        else:
            symptom_units.setdefault(base_code, []).append(token)

    symptom_codes = list(symptom_units.keys())
    has_original_symptoms = len(symptom_codes) > 0

    kept_symptom_codes: List[str] = []
    if has_original_symptoms:
        # Keep a random k in [k_min, k_max] symptom units (or all if fewer)
        if len(symptom_codes) <= k_min:
            k = len(symptom_codes)
        else:
            k = int(rng.integers(k_min, min(k_max, len(symptom_codes)) + 1))
        
        selected_indices = rng.choice(len(symptom_codes), size=k, replace=False)
        selected_codes = [symptom_codes[i] for i in selected_indices]

        # Drop each kept unit with probability forget_rate
        for code in selected_codes:
            if rng.random() >= forget_rate:
                kept_symptom_codes.append(code)

        # Guarantee at least one symptom unit remains when the source patient had one
        if not kept_symptom_codes:
            # Pick one randomly from the selected set
            fallback_code = selected_codes[int(rng.integers(0, len(selected_codes)))]
            kept_symptom_codes.append(fallback_code)

    vocab = _get_symptom_vocab()
    vocab_map = {item['code']: item for item in vocab}
    all_vocab_codes = [item['code'] for item in vocab]

    # Process kept symptom units: occasionally replace with a wrong symptom
    final_tokens: List[str] = []
    for code in kept_symptom_codes:
        if rng.random() < wrong_rate and len(all_vocab_codes) > 1:
            # Replace unit with a random DIFFERENT symptom code from vocabulary
            other_codes = [c for c in all_vocab_codes if c != code]
            replacement_code = other_codes[int(rng.integers(0, len(other_codes)))]
            rep_meta = vocab_map[replacement_code]
            dt = rep_meta.get('data_type', 'B')
            pvals = rep_meta.get('possible_values', [])
            if dt in ('C', 'M') and pvals:
                chosen_val = pvals[int(rng.integers(0, len(pvals)))]
                final_tokens.append(f"{replacement_code}_@_{chosen_val}")
            else:
                final_tokens.append(replacement_code)
        else:
            # Keep original tokens for this symptom unit
            final_tokens.extend(symptom_units[code])

    # Antecedents: drop each with probability antecedent_drop_rate
    for code, ant_tokens in antecedent_units.items():
        if rng.random() >= antecedent_drop_rate:
            final_tokens.extend(ant_tokens)

    return repr(final_tokens)

def perturb_frame(
    frame: pd.DataFrame,
    seed: int,
    k_min: int = 3,
    k_max: int = 8,
    forget_rate: float = 0.20,
    wrong_rate: float = 0.10,
    antecedent_drop_rate: float = 0.20,
) -> pd.DataFrame:
    """Produce a copy of DataFrame with perturbed EVIDENCES and ORIG_INDEX tracking."""
    rng = np.random.default_rng(seed)
    df_copy = frame.copy()
    
    # Track the original source patient position/index
    if 'ORIG_INDEX' not in df_copy.columns:
        df_copy['ORIG_INDEX'] = np.arange(len(df_copy), dtype=np.int64)

    perturbed_evidences = [
        perturb_evidences(
            ev_str,
            rng,
            k_min=k_min,
            k_max=k_max,
            forget_rate=forget_rate,
            wrong_rate=wrong_rate,
            antecedent_drop_rate=antecedent_drop_rate,
        )
        for ev_str in df_copy['EVIDENCES']
    ]

    df_copy['EVIDENCES'] = perturbed_evidences
    return df_copy
