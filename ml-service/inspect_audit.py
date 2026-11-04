import json
from pathlib import Path

ev = json.loads(Path('data/ddxplus/release_evidences.json').read_text(encoding='utf-8'))
conds = json.loads(Path('data/ddxplus/release_conditions.json').read_text(encoding='utf-8'))

print('=== EVIDENCES RELATING TO PAIN, STOMACH, HEAD, NAUSEA, VOMIT, DIARRHEA ===')
for code, data in sorted(ev.items(), key=lambda x: int(x[0].replace('E_', '')) if x[0].replace('E_', '').isdigit() else 999):
    q = (data.get('question_en') or data.get('name') or '').lower()
    if any(w in q for w in ['stomach', 'abdom', 'headache', 'head', 'nausea', 'vomit', 'diarrhea', 'fever', 'cough', 'breath', 'pain']):
        dt = data.get('data_type')
        meaning = data.get('value_meaning') or {}
        print(f'{code} ({dt}): {data.get("question_en")}')
        if meaning:
            for v_code, v_info in list(meaning.items())[:10]:
                print(f'   -> {v_code}: {v_info.get("en")}')
