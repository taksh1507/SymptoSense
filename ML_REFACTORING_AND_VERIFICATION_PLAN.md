# SymptoSense ML Engineering & Verification Plan

**Role**: Senior ML + Full-Stack Engineer  
**Repository**: SymptoSense (Next.js 15 / Prisma-SQLite, FastAPI ML microservice)  
**Status**: Ready for execution upon user confirmation (`start`).

---

## Executive Summary & Problem Diagnosis

The current DDXPlus disease classification model (`ml-service/ml_pipeline/ddx_training.py`) was trained and evaluated on complete, synthetic electronic health records containing all positive and negative evidence tokens. When evaluated on complete synthetic records, it reports near-perfect scores:
- Clean-test accuracy: **0.9972**
- Macro-F1: **0.9963**
- Top-3 accuracy: **1.0**

However, real patients enter only **3 to 8 partial symptoms**. When given only partial symptoms, an unperturbed model trained on complete data suffers from severe distributional shift: it can produce inaccurate disease predictions with misleadingly high confidence. Furthermore, the 0.5 uncertainty threshold was chosen arbitrarily and was never calibrated or validated on realistic partial inputs.

This plan details the end-to-end engineering roadmap to introduce input evidence perturbation, group-safe stratified cross-validation, realistic-input calibration, selective prediction operating points, Colab training pipeline, UI truth-in-reporting, and clean architectural alignment.

---

## Phase 0: Repository Baseline Verification & Findings

Before making modifications, all referenced files were read and verified against active code:

| Component | Code Reference | Verified Baseline Fact |
| :--- | :--- | :--- |
| **DDXPlus Training Pipeline** | `ml-service/ml_pipeline/ddx_training.py` | Uses `StratifiedKFold(5)` on sampled training rows without group safety; evaluates 4 models (SGD, MultinomialNB, RandomForest, XGBoost); uses `RandomizedSearchCV` on top 2; saves artifacts and report to `ml_report.json`. |
| **Evidence Schema & Featurization** | `ml-service/ml_pipeline/ddxplus_data.py` | Generates 980 features (8 demographic/clinical + symptom + antecedent one-hot tokens); 49 pathology classes; parses evidence string into tokens. |
| **Sparse Matrix Safety** | `ml-service/ml_pipeline/model_input.py` | Prediction and explanation strictly convert matrices to CSR format (`to_sparse`), ensuring XGBoost treats absent features as missing rather than dense zeros. |
| **Safety Floors vs Severity Mapping** | `ml-service/disease_inference.py` vs `ddx_training.py` | `release_conditions.json` assigns severity `2` to PSVT, Scombroid food poisoning, Acute dystonic reactions, and Stable angina. `ddx_training.py` maps severity $\le 2$ to `High`, whereas `disease_inference.py` enforces a `Medium` safety floor. We will reconcile this consistently across code, README, and tests. |
| **TypeScript Rule Agreement Coupling** | `ml-service/ml_pipeline/ddx_training.py:46` | Uses `subprocess.run(['node', ...], check=True)`. If Node.js is missing or fails (e.g. in Colab or lightweight containers), training crashes. Must be made non-fatal/optional. |
| **CI Environment vs README Drift** | `.github/workflows/verify.yml` vs `README.md` | CI runs Python 3.14 on Node 24 (`verify.yml`), while `README.md` documents Python 3.12. Will align to Python 3.14 across documentation and CI. |
| **Kaggle 41-Disease Dataset Duplication** | `ml-service/data/dataset.csv` | Contains 4,920 raw rows, but **exactly 304 unique rows**. Previous cross-validation on 4,920 duplicate rows caused data leakage and artificial 100% scores. Deduplication before holdout splitting is required. |
| **Existing Test Suite Baseline** | `npm test` & `pytest` | 41/41 TypeScript unit tests pass; 15/15 Python ML tests pass. |

---

## Phase-by-Phase Roadmap & To-Do Checklist

```
[x] Phase 1: Realistic-Input Data Perturbation & Group-Safe Training
    [x] 1a: Create ml_pipeline/perturb.py (pure, seeded numpy Generator)
    [x] 1b: Implement leakage-safe fingerprint deduplication and realistic evaluation splits
    [x] 1c: Augment training data with seeded perturbed copies and group tracking
    [x] 1d: Implement group-safe CV with StratifiedGroupKFold and pairwise calibrator splits
    [x] 1e: Select winning model on realistic validation macro-F1 (with statistical tie detection)
    [x] 1f: Add new report keys (clean_synthetic, realistic_input, differential_metrics, data_hygiene)
    [x] 1g: Make TypeScript rule-agreement subprocess optional with graceful fallback
    [x] 1h: Add CUDA GPU support for XGBoost via DDX_XGB_DEVICE=cuda

[x] Phase 2: Confidence Quality, Selective Prediction & Inference Integration
    [x] 2a: Fit and evaluate calibration (sigmoid/isotonic) on realistic validation data
    [x] 2b: Create ml_pipeline/confidence_metrics.py (ECE, reliability curve, wrong-and-confident rates)
    [x] 2c: Implement grid search for optimal (threshold t, margin m) operating point on validation data
    [x] 2d: Update disease_inference.py with limited_information and confident flags, and reconcile safety floors
    [x] 2e: Update lib/ml/disease.ts and ResultsPage.tsx UI with low-confidence and limited-information alerts
    [x] 2f: Add unit tests for perturbation, confidence metrics, and response contracts

[x] Phase 3: Google Colab Training Notebook (SymptoSense_Colab_Training.ipynb)
    [x] 3a: Create valid nbformat v4 notebook with 10 sequential cells
    [x] 3b: Implement Figshare API automated streaming download and SHA-256 verification
    [x] 3c: Assert exact pinned dependencies from requirements.txt
    [x] 3d: Add Drive persistence, CLI execution, and artifact packaging (.zip)
    [x] 3e: Validate notebook with nbformat.validate and ast.parse
    [x] 3f: Add "Training on Google Colab" section to README.md

[ ] Phase 4: Truth-in-Reporting & UI Clarification
    [ ] 4a: Remove all hardcoded metric badges from app/dashboard/ml-insights/page.tsx
    [ ] 4b: Display Clean Synthetic vs Realistic Input metrics side-by-side with clear synthetic benchmarks notice
    [ ] 4c: Explicitly label SymCat Bayesian engine as "unvalidated knowledge-base lookup"
    [ ] 4d: Document dual-engine routing and class counts (41 core Kaggle vs 49 DDXPlus vs 801 SymCat)

[ ] Phase 5: 41-Disease Kaggle Model Deduplication & Proper Holdout
    [ ] 5a: Deduplicate dataset.csv from 4,920 rows to 304 unique rows in train_clinical.py
    [ ] 5b: Implement stratified train/test holdout split on deduplicated data
    [ ] 5c: Train Random Forest strictly on training split; report test accuracy strictly on holdout
    [ ] 5d: Save evaluation results to ml-service/reports/clinical_report.json and expose in UI

[ ] Phase 6: Codebase & Git Cleanup
    [ ] 6a: Move PROJECT_ANALYSIS.md, FIXES.md, DATASET_EXPANSION_GUIDE.md into docs/ and fix links
    [ ] 6b: Convert Sympto-senese.png to WebP and update app/redesign.css reference
    [ ] 6c: Remove unused scripts (test_api.py, build_symcat_801.py) with grep verification
    [ ] 6d: Remove duplicate *.db line in .gitignore
    [ ] 6e: Manage large binaries and legacy confidence stack cleanly
    [ ] 6f: Ensure symptom-list.json single source of truth and verify parity
    [ ] 6g: Fix README documentation drift (Python 3.14 alignment and architecture docs)

[ ] Phase 7: Comprehensive Verification & Acceptance
    [ ] 7a: Run npm ci
    [ ] 7b: Run npm run lint
    [ ] 7c: Run npm run typecheck
    [ ] 7d: Run npm test
    [ ] 7e: Run npm run test:python
    [ ] 7f: Run npm run test:ml
    [ ] 7g: Run python ml-service/execute_notebook.py
    [ ] 7h: Run npm run build
    [ ] 7i: Run npm run test:integration
```

---

## Detailed Specifications per Phase

### Phase 1: Realistic-Input Data & Group-Safe Training
- **`ml_pipeline/perturb.py`**:
  - Distinguish symptom evidences from antecedent evidences using `evidence_feature_prefix(code)`.
  - Group multichoice tokens (e.g. `E_54_@_V_161`) into their parent evidence code unit.
  - `perturb_evidences(evidence_str, rng, k_min=3, k_max=8, forget_rate=0.20, wrong_rate=0.10, antecedent_drop_rate=0.20)`:
    - Retain $k \in [k_{\min}, k_{\max}]$ symptom units randomly.
    - Drop kept symptom with probability `forget_rate`.
    - Mutate symptom with probability `wrong_rate` to a random different symptom code from vocabulary.
    - Drop antecedents with probability `antecedent_drop_rate`.
    - Ensure $\ge 1$ symptom unit remains if source patient had one.
  - `perturb_frame(frame, seed, **params)`: Appends `ORIG_INDEX` to track patient source groups.
- **Leakage-Free Fingerprinting**:
  - `Fingerprint = (AGE, SEX, sorted(evidences), PATHOLOGY)` on clean training sample.
  - Eliminate all training fingerprints from validation and test frames.
- **Group-Safe Splitting**:
  - Use `sklearn.model_selection.StratifiedGroupKFold(5, shuffle=True, random_state=SEED)` with `groups=ORIG_INDEX`.
  - Pass explicit train/test index tuples to `CalibratedClassifierCV`.
  - Unit test: $\text{groups}(\text{train}) \cap \text{groups}(\text{val}) = \emptyset$.
- **Winner Selection**:
  - Selected by macro-F1 on realistic validation set.
  - If $\Delta \text{F1} < \sigma_{\text{CV}}$, mark as `statistical tie`.

### Phase 2: Confidence Quality & Inference Integration
- **`ml_pipeline/confidence_metrics.py`**:
  - Expected Calibration Error (ECE) with 10–15 uniform bins.
  - Reliability curve points with observed accuracy vs mean confidence.
  - Wrong-and-confident rates at threshold $\ge 0.80$:
    1. Proportion over all predictions.
    2. Error rate restricted to high-confidence subset.
- **Threshold & Margin Grid Search**:
  - Grid search over $t \in [0.30, 0.95]$ (step 0.05) and $m \in [0.00, 0.50]$ (step 0.05).
  - Maximize coverage subject to $\text{Precision}(t, m) \ge 0.90$.
- **Response Extensions**:
  - `limited_information: bool` (true if recognized symptom units $< 3$).
  - `confident: bool` (true if $\text{top1} \ge t$ and $(\text{top1} - \text{top2}) \ge m$ and not limited).
- **Safety Floor Reconciliation**:
  - Document and harmonize PSVT, Scombroid, Dystonic reactions, and Stable Angina as `Medium` floors.

### Phase 3: Google Colab Training Notebook
- Valid `nbformat` v4 notebook at `ml-service/notebooks/SymptoSense_Colab_Training.ipynb`.
- Figshare Article 20043374 automated download with SHA-256 integrity verification.
- Pinned dependency assertion matching `requirements.txt`.
- Drive persistence, GPU device detection, and clean table output reading generated report.

### Phase 4: Truth-in-Reporting in UI
- Dynamic reading of metrics from JSON artifacts; eliminate hardcoded numbers.
- Dual presentation: Clean Synthetic vs Realistic Input with explicit benchmark disclaimer.
- Clarify SymCat Bayesian engine as unvalidated knowledge-base lookup.

### Phase 5: 41-Disease Kaggle Model
- Deduplicate `ml-service/data/dataset.csv` from 4,920 rows down to 304 unique rows.
- Split deduplicated rows using Stratified Shuffle Split (e.g. 80/20 train/test).
- Fit model strictly on training rows; report test metrics strictly on held-out rows.
- Output results to `ml-service/reports/clinical_report.json`.

### Phase 6: Codebase & Git Cleanup
- Move documentation into `docs/`.
- Convert `Sympto-senese.png` to WebP.
- Clean `.gitignore` duplicate entries.
- Unlink unused scratch files after grep confirmation.

### Phase 7: Verification Suite
- Sequential execution of all test and build scripts:
  `npm ci` -> `npm run lint` -> `npm run typecheck` -> `npm test` -> `npm run test:python` -> `npm run test:ml` -> `python ml-service/execute_notebook.py` -> `npm run build` -> `npm run test:integration`.

---

## Execution Protocol

1. **One Phase at a Time**: Work is performed sequentially from Phase 1 to Phase 7.
2. **Post-Phase Summary**: Upon completing each phase, a detailed summary of modified files, test outputs, and metrics will be presented.
3. **User Gate**: We will pause and wait for your explicit confirmation (`start`) before proceeding to the next phase.
