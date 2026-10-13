"""Read public labels and remove repeated symptom patterns before any split."""
import hashlib
import json
import re
from pathlib import Path
import numpy as np
import pandas as pd

SERVICE = Path(__file__).resolve().parents[1]
SEED = 42
SOURCE = 'https://www.kaggle.com/datasets/itachi9604/disease-symptom-description-dataset'

def normalize(value):
    return re.sub(r'_+', '_', re.sub(r'[^a-z0-9]+', '_', str(value).lower().strip())).strip('_')

def load_dataset(path=None):
    path = Path(path or SERVICE / 'data' / 'dataset.csv')
    raw = pd.read_csv(path)
    label = next((c for c in raw if c.lower() in ('disease', 'prognosis')), None)
    if label is None or raw[label].isna().any():
        raise ValueError('A complete public Disease/prognosis label column is required')
    columns = [c for c in raw if c != label and not c.lower().startswith('unnamed')]
    if all(c.lower().startswith('symptom_') for c in columns):
        rows = [sorted({normalize(v) for v in row if pd.notna(v) and normalize(v)}) for row in raw[columns].to_numpy()]
        symptoms = sorted({v for row in rows for v in row})
        values = np.array([[int(s in row) for s in symptoms] for row in rows], dtype=np.float64)
        representation = 'Symptom_1..Symptom_17 slots -> fixed multi-hot symptom columns'
    else:
        symptoms = [normalize(c) for c in columns]
        values = raw[columns].apply(pd.to_numeric, errors='raise').to_numpy(dtype=float)
        if not np.isin(values[~np.isnan(values)], [0, 1]).all():
            raise ValueError('Binary symptom columns must contain only 0/1 or missing values')
        rows = [[s for s, v in zip(symptoms, row) if v == 1] for row in values]
        representation = 'Existing binary symptom columns; missing values imputed inside Pipeline'
    features = pd.DataFrame(values, columns=symptoms)
    labels = raw[label].str.strip()
    signatures = features.fillna(-1).apply(lambda row: tuple(row), axis=1)
    conflicts = pd.DataFrame({'pattern': signatures, 'label': labels}).groupby('pattern').label.nunique()
    if (conflicts > 1).any():
        raise ValueError('Conflicting disease labels for identical features require a grouped split')
    keep = ~signatures.duplicated()
    cleaned = features.loc[keep].reset_index(drop=True)
    target = labels.loc[keep].reset_index(drop=True)
    top = features.sum().sort_values(ascending=False).head(20)
    corr_names = top.head(15).index.tolist()
    corr = features[corr_names].corr().fillna(0)
    eda = {
        'source': SOURCE, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'raw_rows': len(raw), 'unique_rows': len(cleaned), 'feature_count': len(symptoms),
        'label_column': label, 'source_columns': list(raw.columns), 'representation': representation,
        'class_count': labels.nunique(), 'raw_duplicate_rows': int(raw.duplicated().sum()),
        'duplicate_patterns_removed': int((~keep).sum()), 'conflicting_patterns': int((conflicts > 1).sum()),
        'missing_values': [{'column': c, 'count': int(raw[c].isna().sum())} for c in raw],
        'missing_interpretation': 'Empty symptom slots mean no additional symptom, not missing clinical measurements.',
        'class_distribution': [{'disease': name, 'count': int(count), 'unique_count': int((target == name).sum())} for name, count in labels.value_counts().sort_index().items()],
        'top_symptoms': [{'symptom': name, 'count': int(count)} for name, count in top.items()],
        'correlation': {'labels': corr_names, 'matrix': corr.to_numpy().tolist()},
        'sample': [{'disease': str(labels[i]), 'symptoms': rows[i]} for i in range(min(10, len(raw)))],
    }
    return cleaned, target, symptoms, eda
