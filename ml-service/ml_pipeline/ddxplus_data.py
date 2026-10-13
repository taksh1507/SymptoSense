"""Streaming, reproducible DDXPlus sampling and evidence feature encoding.

Feature columns are generated from the published evidence schema, not the labels.
The source CSVs do not contain a patient identifier; split overlap is therefore
checked with exact-row fingerprints and reported as such.
"""
from __future__ import annotations

import ast
import hashlib
import json
import math
import random
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix

SERVICE = Path(__file__).resolve().parents[1]
DATA = SERVICE / 'data' / 'ddxplus'
SEED = 42
SPLITS = {'train': 'release_train_patients', 'validate': 'release_validate_patients', 'test': 'release_test_patients'}
_EVIDENCE_CACHE = None


def normalize(value: str) -> str:
    import re
    return re.sub(r'_+', '_', re.sub(r'[^a-z0-9]+', '_', str(value).lower().strip())).strip('_')


def load_metadata():
    evidences = json.loads((DATA / 'release_evidences.json').read_text(encoding='utf-8'))
    conditions = json.loads((DATA / 'release_conditions.json').read_text(encoding='utf-8'))
    return evidences, conditions


def evidence_feature_prefix(code):
    global _EVIDENCE_CACHE
    if _EVIDENCE_CACHE is None: _EVIDENCE_CACHE=load_metadata()[0]
    item=_EVIDENCE_CACHE.get(code,{})
    return 'antecedent' if item.get('is_antecedent') else 'symptom'


def vocabulary():
    evidences, _ = load_metadata()
    values = []
    for code, item in evidences.items():
        names = item.get('value_meaning') or {}
        allowed = [{'code': value, 'name': (names.get(value) or {}).get('en', value)} for value in item.get('possible-values', [])]
        values.append({'code': code, 'name': item.get('question_en') or item.get('name') or code,
                       'display_name': item.get('question_en') or item.get('name') or code,
                       'code_question': item.get('code_question'),
                       'is_antecedent': bool(item.get('is_antecedent')), 'data_type': item.get('data_type'),
                       'allowed_values': allowed})
    return sorted(values, key=lambda x: x['code'])


def feature_schema():
    evidence, _ = load_metadata()
    columns = ['age', 'age_group_child', 'age_group_teen', 'age_group_adult', 'age_group_elderly',
               'sex_f', 'sex_m', 'sex_unknown']
    for code, item in sorted(evidence.items()):
        prefix='antecedent' if item.get('is_antecedent') else 'symptom'
        if item.get('data_type') == 'B':
            columns.append(f'{prefix}:{code}')
        else:
            columns.extend(f'{prefix}:{code}:@:{value}' for value in item.get('possible-values', []))
    return columns


def parse_evidence(value):
    if not isinstance(value, str) or not value:
        return []
    try:
        parsed = ast.literal_eval(value)
    except (SyntaxError, ValueError):
        raise ValueError(f'Invalid DDXPlus evidence encoding: {value[:100]}')
    if not isinstance(parsed, (list, tuple)):
        raise ValueError('Evidence field must encode a list')
    return [str(x) for x in parsed]


def age_group(age):
    age = float(age)
    # UI boundaries overlap at 50; assign 50 to elderly to make bins disjoint.
    if age <= 12: return 'child'
    if age <= 18: return 'teen'
    if age < 50: return 'adult'
    return 'elderly'


def encode_patient(row, columns=None, sex_masked=False):
    columns = columns or feature_schema()
    positions = {name: i for i, name in enumerate(columns)}
    vals = {}
    age = float(row['AGE'])
    vals['age'] = age
    vals[f'age_group_{age_group(age)}'] = 1.0
    sex = 'unknown' if sex_masked else str(row.get('SEX', '')).strip().lower()
    vals['sex_f' if sex in ('f', 'female') else 'sex_m' if sex in ('m', 'male') else 'sex_unknown'] = 1.0
    for token in parse_evidence(row['EVIDENCES']):
        parts = token.split('_@_', 1)
        prefix=evidence_feature_prefix(parts[0])
        col = f'{prefix}:{parts[0]}' if len(parts) == 1 else f'{prefix}:{parts[0]}:@:{parts[1]}'
        if col in positions:
            vals[col] = 1.0
    return vals


def encode_rows(frame, columns=None, mask_sex=False, seed=SEED):
    columns = columns or feature_schema()
    rng = np.random.default_rng(seed)
    rows, targets, differentials = [], [], []
    for record in frame.to_dict('records'):
        masked = bool(mask_sex and rng.random() < 0.20)
        vals = encode_patient(record, columns, masked)
        rows.append(vals)
        targets.append(str(record['PATHOLOGY']))
        differentials.append(record.get('DIFFERENTIAL_DIAGNOSIS'))
    rr, cc, vv = [], [], []
    positions = {name: i for i, name in enumerate(columns)}
    for r, data in enumerate(rows):
        for name, val in data.items(): rr.append(r); cc.append(positions[name]); vv.append(val)
    return csr_matrix((vv, (rr, cc)), shape=(len(rows), len(columns)), dtype=np.float32), np.asarray(targets), differentials


def _read_chunks(path, chunksize=25000):
    return pd.read_csv(path, chunksize=chunksize)


def _stratified_reservoir(path, limit, seed):
    """Two-pass exact proportional allocation + seeded per-class reservoir sample."""
    counts = Counter()
    for chunk in _read_chunks(path):
        counts.update(chunk['PATHOLOGY'].astype(str).tolist())
    total = sum(counts.values())
    if limit >= total:
        frame = pd.concat(list(_read_chunks(path)), ignore_index=True)
        return frame, total, total
    # Reserve five examples per pathology when the requested budget can support
    # five-fold stratification, then distribute remaining rows proportionally.
    min_per_class=5
    if limit < len(counts)*min_per_class:
        raise ValueError(f'train-row budget must be at least {len(counts)*min_per_class} to support five-fold stratification')
    base={label:min(count,min_per_class) for label,count in counts.items()}
    remaining=limit-sum(base.values()); weight_total=sum(count-base[label] for label,count in counts.items())
    quotas={label:base[label]+int(math.floor(remaining*(count-base[label])/weight_total)) for label,count in counts.items()}
    for label in sorted(counts, key=lambda k: (-(remaining * (counts[k]-base[k]) / weight_total - (quotas[k]-base[k])), k))[:limit - sum(quotas.values())]:
        quotas[label] += 1
    rng = random.Random(seed)
    reservoirs = {label: [] for label in counts}
    seen = Counter()
    for chunk in _read_chunks(path):
        for record in chunk.to_dict('records'):
            label = str(record['PATHOLOGY']); seen[label] += 1; quota = quotas[label]
            if quota == 0: continue
            if len(reservoirs[label]) < quota: reservoirs[label].append(record)
            else:
                idx = rng.randrange(seen[label])
                if idx < quota: reservoirs[label][idx] = record
    records = [r for label in sorted(reservoirs) for r in reservoirs[label]]
    rng.shuffle(records)
    return pd.DataFrame.from_records(records), total, len(records)


def _all_split_exact_row_overlap(paths):
    """Exact raw-record hashes over every row; source contains no patient IDs."""
    fingerprints={name:set() for name in ('train','validate')}
    for name in ('train','validate'):
        with paths[name].open('rb') as stream:
            next(stream,None)
            for line in stream: fingerprints[name].add(hashlib.sha256(line.rstrip(b'\r\n')).digest())
    train_validate=len(fingerprints['train'] & fingerprints['validate'])
    train_test=validate_test=0
    with paths['test'].open('rb') as stream:
        next(stream,None)
        for line in stream:
            fingerprint=hashlib.sha256(line.rstrip(b'\r\n')).digest()
            train_test += fingerprint in fingerprints['train']
            validate_test += fingerprint in fingerprints['validate']
    return {'train_validate':train_validate,'train_test':train_test,'validate_test':validate_test,
            'scope':'all raw records; cross-split duplicate rows counted against any prior split'}


def load_splits(train_limit=150000, seed=SEED):
    frames, sizes, paths = {}, {}, {}
    for name, filename in SPLITS.items():
        path = DATA / filename
        if not path.exists(): raise FileNotFoundError(path)
        paths[name] = path
        # Scale validation and test proportionally to the official split sizes.
        if name == 'train': limit = train_limit
        else:
            train_rows = sizes['train']['rows_before_sampling']
            total = 0
            for chunk in _read_chunks(path): total += len(chunk)
            limit = min(total, max(1, round(train_limit * total / train_rows)))
        frame, before, after = _stratified_reservoir(path, limit, seed + list(SPLITS).index(name))
        frames[name] = frame
        sizes[name] = {'rows_before_sampling': before, 'rows_after_sampling': after,
                       'class_distribution': {str(k): int(v) for k, v in frame['PATHOLOGY'].value_counts().sort_index().items()}}
    # Scan every source row for duplicate raw records; the dataset has no patient ID.
    overlaps=_all_split_exact_row_overlap(paths)
    return frames, sizes, overlaps, paths
