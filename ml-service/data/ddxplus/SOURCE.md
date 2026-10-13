# DDXPlus data provenance

Dataset: [DDXPlus Dataset, Figshare article 20043374](https://figshare.com/articles/dataset/DDXPlus_Dataset/20043374), downloaded from the official Figshare version 15 files on 2026-10-13. The accompanying README describes a synthetic patient dataset. The paper is [Tchango et al., DDXPlus](https://arxiv.org/abs/2205.09148).

License: Creative Commons Attribution 4.0 International (CC BY 4.0), as specified by Figshare. License text: <https://creativecommons.org/licenses/by/4.0/legalcode>. SHA-256 of downloaded plain-text legal code (`CC-BY-4.0.txt`): `9ba9550ad48438d0836ddab3da480b3b69ffa0aac7b7878b5a0039e7ab429411`.

## Inputs and SHA-256

| Input | SHA-256 |
|---|---|
| `README.md` | `8ffec260c14a6871fe4d5cb8ba7a88f3a2c7759c61be4a329fb79577ffcc7277` |
| `release_train_patients` | `93933e9a9a7a00d618a931deda7767485af299fe4635bf189a7c63b510e8b172` |
| `release_validate_patients` | `b84733533bff01daa1d47d27a0cd4d684bb54a0fc20d80aaee1250ff8ff989ed` |
| `release_test_patients` | `f7ac3eae934c85780fc9b109a6cac5771540619a02690bee6fc0ab402baec186` |
| `release_train_patients.zip` | `174ae1d56f36a15b7144838ecd214e1e1748a5369fc90c559529b6dc6ecfb218` |
| `release_validate_patients.zip` | `625a96855becf0efe5da339fd3d440aa99597d48f784957a97dacc3fceaa7e40` |
| `release_test_patients.zip` | `ad3bb981f3453fd7abffb35cc595a1c02197e409c581bff97c1265c33eb00d23` |
| `release_conditions.json` | `960112db157169215c5a5c1eac0993317d2363c0cf2dadf173735dc503810d48` |
| `release_evidences.json` | `980f7020ec068b290b49cca7f2ab0a2058faae37f9a94b113e10b6fe0c882f31` |
| CC BY 4.0 legal text | `9ba9550ad48438d0836ddab3da480b3b69ffa0aac7b7878b5a0039e7ab429411` |

The patient CSV columns are `AGE`, `DIFFERENTIAL_DIAGNOSIS`, `SEX`, `PATHOLOGY`, `EVIDENCES`, and `INITIAL_EVIDENCE`. Evidence strings parse as Python-list text; binary tokens look like `E_53`, and valued tokens look like `E_54_@_V_161` (some values are numeric-coded, such as `E_56_@_4`). `INITIAL_EVIDENCE` is excluded because the app does not collect it at prediction time. The evidence JSON defines 223 items (110 symptoms, 113 antecedents), the data types (`B`, `C`, `M`), English wording, allowed values, and antecedent flag. The conditions JSON contains 49 pathologies and integer `severity`; the dataset README confirms lower values denote greater severity (for example, Anaphylaxis is 1).

## Project safety choices (not clinical guidelines)

Red-flag candidates are derived from the actual English evidence text: E_14 (chest pain even at rest), E_66 (significant shortness of breath/difficulty breathing), E_64 (out of breath with minimal effort), E_159 (loss of consciousness), E_43 (loss of consciousness with seizure-like activity), E_75 (choking/suffocating), E_128 (unable to breathe or speak), E_194 (high-pitched sound on breathing in), E_156 (one-sided facial weakness/paralysis), E_63 (difficulty speaking), E_39 (confusion/disorientation), E_45 (coughing blood), and E_210 (vomiting blood). Airway swelling is conditional: E_151 plus E_152 at V_32, V_61, V_115, or V_162. Existing TypeScript rule-engine red flags remain active.

The approved disease safety floors raise these dataset pathologies regardless of model urgency: High for Anaphylaxis (1), Larygospasm (1), Ebola (1), Possible NSTEMI / STEMI (1), Acute pulmonary edema (1), Pulmonary embolism (2), Unstable angina (2), Spontaneous pneumothorax (2), Boerhaave (2), Epiglottitis (2), Guillain-Barré syndrome (2), Croup (2), and Myocarditis (2); Medium for PSVT (2), Scombroid food poisoning (2), Acute dystonic reactions (2), and Stable angina (2). These are project safety choices based on dataset severity and the project’s time-critical condition selection, not clinical guidelines. Severity-derived model urgency remains a research proxy, not clinician-validated triage.

Raw source archives and extracted patient files are local-only and ignored by Git. The derived feature vocabulary, report, figures and eligible model artifacts are reproducible using `python ml-service/train_pipeline.py --train-rows 150000`.
