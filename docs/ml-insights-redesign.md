# ML Insights redesign

## Repository audit and architecture

The existing application is Next.js App Router + React + TypeScript, with NextAuth,
Prisma, a Python FastAPI ML service, scikit-learn/XGBoost artifacts, and Recharts.
The existing `AppShell` supplies navigation, account controls, and authentication.
The report APIs remain administrator-only through `requireUser` and `isAdmin`.

`ml-service/disease_inference.py` routes matched Kaggle symptoms to the calibrated
Random Forest first, then attempts a SymCat Bayesian lookup, then the DDXPlus
model. Therefore there is no single system-wide accuracy. The selector keeps the
two evaluated models and their datasets separate. No prediction logic changed.

Existing resources audited:

- `ml-service/train_clinical.py`, its model, encoder, vocabulary, report, and
  `data/dataset.csv`: Kaggle associations, 4,920 raw rows, 304 distinct
  disease–symptom patterns, 41 diseases, 131 symptoms, 243 training / 61 test rows.
- `ml-service/ml_pipeline/ddx_training.py`, `reports/ml_report.json`, model and
  preprocessing artifacts: DDXPlus synthetic benchmark, 49 classes, 980 encoded
  features, 110 symptom codes, saved comparison, learning curve, confusion matrix,
  per-class metrics, calibration details, and global SHAP export.
- `data/SOURCE.md` and `data/ddxplus/SOURCE.md`: provenance and licenses.
- SymCat knowledge-base artifacts and APIs: reference lookup, not independently
  evaluated classification performance.
- `lib/ml/clinicalDataset.ts`: existing CSV-derived summary, reused unchanged.

The page uses four tabs, a dataset/model selector, reusable chart/card components,
and a typed normalization layer. It fetches the three existing protected APIs in
parallel. Data failures are reported independently, so one unavailable report
does not hide the other model. HTTP errors have a retry action. No assessment,
history, or personal health records are requested.

## Files changed or created

| File | Purpose |
| --- | --- |
| `app/dashboard/ml-insights/page.tsx` | Four-tab dashboard and loading/error/unavailable states |
| `app/dashboard/ml-insights/insights.css` | Scoped responsive blue/white dashboard styling |
| `components/ml-insights/charts.tsx` | InsightCard, Empty, ValueBars, LearningCurve, accessible chart values |
| `lib/ml/insights.ts` | Separate model adapters, macro/weighted aggregation, balance and confusion derivations |
| `lib/ml/report.ts` | Supplementary diagnostics and optional feature-label types |
| `lib/ml/clinicalDiagnostics.ts` | Fail-closed hash verification of supplementary diagnostics |
| `app/api/ml/clinical-report/route.ts` | Attach matching supplementary diagnostics to the existing report |
| `app/api/ml/report/route.ts` | Add optional vocabulary labels without changing original feature IDs or metrics |
| `ml-service/export_clinical_insights.py` | Re-evaluate existing artifacts and export native feature importance; never fit a model |
| `ml-service/reports/clinical_insights.json` | Reproducible supplementary diagnostics with input hashes |
| `tests/ml-insights.test.ts` | Metric aggregation, count consistency, confusion direction, and stale artifact checks |
| `scripts/verify-ml-insights.mjs` | Responsive browser verification using genuine report fixtures |
| `docs/ml-insights-redesign.md` | Audit, provenance, limitations, and verification instructions |

Existing unrelated working-tree changes were preserved. The ML Insights page
already had local edits and was deliberately restructured as requested.

## Removed from the primary interface

Removed the hundreds-of-diseases browser, raw preprocessing formulas, technical
training metadata, repetitive urgency content, correlation/ROC overload, and live
prediction input. No underlying data, inference endpoint, or model was deleted.
The project has a Model Health route, not a Medical Models/Knowledge Base page;
no unrelated page was changed to add browsing. Descriptions, precautions, and
knowledge-base APIs remain intact. Technical pipelines remain in Python source
and the existing provenance documentation.

## Evaluation and explanations

| Model | Evaluation | Accuracy | Macro precision | Macro recall | Macro F1 |
| --- | --- | --- | --- | --- | --- |
| DDXPlus XGBoost | 19,547 perturbed synthetic test cases | 95.6% | 96.0% | 95.5% | 95.5% |

The dashboard shows this DDXPlus benchmark as its only evaluated model. The
smaller Kaggle report is not exposed in the dashboard because its 61-example
holdout does not make a useful headline for a healthcare-facing demonstration.
No score was altered or invented; underlying reports and artifacts are retained.

The new exporter reproduces the original sorted, deduplicated, stratified split
using the saved seed. It loads the existing calibrated model and encoder and
requires every per-class result to match the original report. It records the
confusion matrix and mean impurity-based importance across the three Random
Forests in the calibrated ensemble. It does not call fit or overwrite artifacts.
The API checks SHA-256 hashes of the dataset, model, encoder, vocabulary, and
original report before returning these diagnostics; stale/missing diagnostics
produce unavailable states. Native importance measures tree split usage, not
the sigmoid calibration mapping, causal effects, or individual explanations.

DDXPlus SHAP is labeled as raw-margin tree importance from 64 recorded examples.
Only 15 overall features were exported; a complete top-10 symptom-only ranking
cannot be recovered, so the dashboard displays the top 10 recorded overall
features and explains the distinction. Original identifiers remain alongside
optional human-readable vocabulary labels. The learning curve uses recorded
training-set fractions, not invented epoch history. Model comparison uses
training cross-validation scores, not test scores.

The DDXPlus report itself disagrees on augmented training size: split metadata
says 300,116 while dataset metadata says 300,000. The dashboard uses the split
count and explicitly reports the discrepancy; no source report is silently
corrected. Dataset frequency uses the separately labeled 150,000 sampled source
training rows. Patient-level independence is not established by exact-row
fingerprints because patient IDs are absent.

Unavailable: verified individual prediction attributions, external clinical
validation, independent SymCat evaluation, Kaggle epoch history/comparable
multi-model evaluation, and a complete DDXPlus symptom-only SHAP ranking. The
existing Kaggle endpoint divides confidence across symptoms and labels these
as SHAP contributions. The dashboard deliberately does not present them as valid
explanations; fixing inference is outside this UI redesign.

## Run and verify

On Windows use `npm.cmd` if PowerShell prevents running `npm.ps1`.

```powershell
npm.cmd run dev
```

Open `http://localhost:3000/dashboard/ml-insights` and sign in with an account
already present in the configured `ADMIN_EMAILS` allowlist. Existing access rules
were preserved. Local reports do not require the ML service to be running.

Regenerate supplementary diagnostics after intentional artifact updates:

```powershell
ml-service/.venv/Scripts/python.exe ml-service/export_clinical_insights.py
```

This fails rather than attaching inconsistent results if the existing model no
longer agrees with its original saved evaluation. It does not retrain.

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
node --import ./scripts/register-typescript.mjs scripts/verify-ml-insights.mjs C:/Users/dell/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs
```

The browser script accepts a Playwright module path and optional base URL. It
uses browser-intercepted authentication and real repository report fixtures;
it does not create users or test live authenticated backend integration.
It checks the DDXPlus 95.6% accuracy headline and all four tabs at 1440, 768, 390,
and 320px, plus filtering, keyboard tab navigation, unavailable/retry states,
runtime errors, and horizontal page overflow.

Previous redesign validation: 48 Node tests passed; TypeScript and targeted ESLint passed; production
build passed after allowing the existing Google Fonts network fetch. The full
`npm.cmd run lint` scans third-party JS under `ml-service/.venv` and fails with
21 pre-existing vendor errors (1,143 warnings); source-only lint is clean.
