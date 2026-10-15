"""Complete parser for SymCat 801-Disease CDC Clinical Knowledge Base.

Parses all 801 diseases and 474+ symptoms from the SymCat CDC dataset
(symcat-801-diseases.csv & symcat-474-symptoms.csv) with real clinical
descriptions, CDC outpatient probabilities, and evidence mappings.
"""
import json
import re
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent
SYMCAT_DIR = ROOT / 'data' / 'symcat'
ARTIFACTS_DIR = ROOT / 'artifacts' / 'clinical'
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

DIS_CSV = SYMCAT_DIR / 'symcat-801-diseases.csv'
SYM_CSV = SYMCAT_DIR / 'symcat-474-symptoms.csv'

def normalize_slug(text: str) -> str:
    """Normalize condition/symptom name to snake_case identifier."""
    t = text.lower().strip()
    t = re.sub(r'[\(\)\[\]\{\}\'\"\/\\,\-\.:;?!]', ' ', t)
    t = re.sub(r'\s+', '_', t)
    return t.strip('_')

def parse_full_symcat_dataset():
    if not DIS_CSV.exists():
        raise FileNotFoundError(f"SymCat diseases CSV not found at {DIS_CSV}")
    
    print(f"Loading raw SymCat 801-disease database from {DIS_CSV}...")
    df = pd.read_csv(DIS_CSV, low_memory=False)
    
    disorder_cols = [c for c in df.columns if c.endswith('_disorder_name')]
    print(f"Found {len(disorder_cols)} disorder column groups corresponding to all 801 conditions.")
    
    conditions_dict = {}
    all_symptoms = set()
    
    # 1. Parse all 801 conditions, descriptions, symptom probabilities, and risk factors
    for dcol in disorder_cols:
        prefix = dcol[:-len('_disorder_name')]
        desc_col = f"{prefix}_description"
        sym_name_col = f"{prefix}_symptoms_name"
        sym_prob_col = f"{prefix}_symptoms_probability"
        
        sub_cols = [dcol]
        if desc_col in df.columns: sub_cols.append(desc_col)
        if sym_name_col in df.columns: sub_cols.append(sym_name_col)
        if sym_prob_col in df.columns: sub_cols.append(sym_prob_col)
        
        sub_df = df[sub_cols].dropna(subset=[dcol])
        
        for _, row in sub_df.iterrows():
            raw_name = str(row[dcol]).strip()
            if not raw_name or raw_name.isdigit() or len(raw_name) < 2:
                continue
            
            slug = normalize_slug(raw_name)
            
            if slug not in conditions_dict:
                desc = str(row[desc_col]).strip() if (desc_col in row and pd.notnull(row[desc_col])) else ""
                conditions_dict[slug] = {
                    "id": slug,
                    "name": raw_name,
                    "category": "Primary Care / Specialty",
                    "urgency": "Medium",
                    "prevalence": 0.010,
                    "symptoms": {},
                    "description": desc,
                    "precautions": [
                        "Consult a healthcare professional for clinical confirmation",
                        "Monitor symptom progression closely",
                        "Rest and maintain adequate hydration",
                        "Seek immediate medical attention if symptoms worsen or red flags appear"
                    ]
                }
            
            # Enrich description if earlier row had empty description
            if not conditions_dict[slug]["description"] and desc_col in row and pd.notnull(row[desc_col]):
                conditions_dict[slug]["description"] = str(row[desc_col]).strip()
            
            # Extract symptom and conditional probability
            if sym_name_col in row and pd.notnull(row[sym_name_col]):
                sname = str(row[sym_name_col]).strip()
                s_slug = normalize_slug(sname)
                
                # Probability from SymCat is given as percentage (e.g. 53 for 53%)
                raw_prob = row[sym_prob_col] if (sym_prob_col in row and pd.notnull(row[sym_prob_col])) else 50.0
                try:
                    prob = max(0.05, min(0.99, float(raw_prob) / 100.0))
                except (ValueError, TypeError):
                    prob = 0.50
                
                if s_slug and len(s_slug) > 1:
                    conditions_dict[slug]["symptoms"][s_slug] = round(prob, 3)
                    all_symptoms.add(s_slug)

    print(f"Step 1 Complete: Extracted {len(conditions_dict)} total diseases and {len(all_symptoms)} symptoms from diseases CSV.")

    # 2. Enrich from symcat-474-symptoms.csv if available
    if SYM_CSV.exists():
        print(f"Cross-referencing with symptoms database from {SYM_CSV}...")
        df_sym = pd.read_csv(SYM_CSV, low_memory=False)
        
        sym_name_cols = [c for c in df_sym.columns if c.endswith('_name') and 'risk' not in c and 'disorder' not in c]
        for scol in sym_name_cols:
            prefix = scol[:-len('_name')] if scol.endswith('_name') else scol
            dname_col = f"{prefix}_disorder_name"
            dprob_col = f"{prefix}_disorder_probability"
            
            if dname_col in df_sym.columns:
                sub = df_sym[[scol, dname_col] + ([dprob_col] if dprob_col in df_sym.columns else [])].dropna(subset=[scol, dname_col])
                for _, row in sub.iterrows():
                    sname = str(row[scol]).strip()
                    dname = str(row[dname_col]).strip()
                    if sname.isdigit() or dname.isdigit() or len(sname) < 2 or len(dname) < 2:
                        continue
                    
                    s_slug = normalize_slug(sname)
                    d_slug = normalize_slug(dname)
                    all_symptoms.add(s_slug)
                    
                    if d_slug in conditions_dict and s_slug not in conditions_dict[d_slug]["symptoms"]:
                        raw_prob = row[dprob_col] if (dprob_col in row and pd.notnull(row[dprob_col])) else 50.0
                        try:
                            prob = max(0.05, min(0.99, float(raw_prob) / 100.0))
                        except (ValueError, TypeError):
                            prob = 0.50
                        conditions_dict[d_slug]["symptoms"][s_slug] = round(prob, 3)

    # 3. Urgency and Red-Flag Clinical Classification
    high_urgency_keywords = [
        "infarction", "aneurysm", "embolism", "stroke", "meningitis", "peritonitis", 
        "appendicitis", "pancreatitis", "cholecystitis", "sepsis", "crisis", "shock",
        "pneumothorax", "hemorrhage", "perforation", "cancer", "carcinoma", "malignan",
        "failure", "acute_coronary", "intoxication", "poisoning", "epiglottitis", "volvulus"
    ]
    
    for slug, cond in conditions_dict.items():
        name_lower = cond["name"].lower()
        if any(k in name_lower or k in slug for k in high_urgency_keywords):
            cond["urgency"] = "High"
            cond["precautions"][0] = "Seek immediate emergency hospital medical evaluation"
        elif any(k in name_lower for k in ["chronic", "syndrome", "sprain", "strain", "deficiency", "allergy", "cold", "flu"]):
            cond["urgency"] = "Low"

    # 4. Integrate 41 Core Kaggle Diseases & Descriptions & Precautions if available
    core_desc_csv = ROOT / 'data' / 'symptom_Description.csv'
    core_prec_csv = ROOT / 'data' / 'symptom_precaution.csv'
    
    if core_desc_csv.exists():
        df_desc = pd.read_csv(core_desc_csv)
        for _, row in df_desc.iterrows():
            dname = str(row['Disease']).strip()
            desc = str(row['Description']).strip()
            slug = normalize_slug(dname)
            if slug in conditions_dict:
                conditions_dict[slug]["description"] = desc
    
    if core_prec_csv.exists():
        df_prec = pd.read_csv(core_prec_csv)
        for _, row in df_prec.iterrows():
            dname = str(row['Disease']).strip()
            slug = normalize_slug(dname)
            precs = [str(row[f'Precaution_{i}']).strip().capitalize() for i in range(1, 5) if pd.notnull(row.get(f'Precaution_{i}'))]
            if slug in conditions_dict and precs:
                conditions_dict[slug]["precautions"] = precs

    # 5. Output compilation to symcat_knowledge_base.json
    symptom_list = sorted(all_symptoms)
    
    kb = {
        "version": "symcat-cdc-801-full-v1",
        "source": "CDC Outpatient (NAMCS/NHAMCS) / SymCat 801 Diseases Database",
        "total_conditions": len(conditions_dict),
        "total_symptoms": len(symptom_list),
        "symptoms": symptom_list,
        "conditions": conditions_dict
    }
    
    out_path = ARTIFACTS_DIR / 'symcat_knowledge_base.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(kb, f, indent=2, ensure_ascii=False)
        
    print(f"\nSUCCESS! Compiled Complete SymCat Knowledge Base:")
    print(f"Total Conditions: {len(conditions_dict)}")
    print(f"Total Symptoms: {len(symptom_list)}")
    print(f"Saved to: {out_path} ({out_path.stat().st_size / (1024*1024):.2f} MB)")
    
    return kb

if __name__ == '__main__':
    parse_full_symcat_dataset()
