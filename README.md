# SymptoSense – ML-Based Symptom Triage and Disease Prediction System

SymptoSense is a symptom-triage prototype built with Next.js, React, Prisma/SQLite, and a FastAPI model service. It supports English, Hindi, Marathi, voice input, assessments for yourself or a family member, saved reports, and optional outcome reminders.

The rule score describes triage urgency on a **0–100** scale. The new classical disease model uses public disease labels and displays calibrated top-three probabilities and SHAP explanations. The retained legacy confidence service uses synthetic heuristics and is separately labeled; it is not the disease classifier. **Not a medical diagnosis.** This repository does not establish clinical diagnostic accuracy.

## Architecture

The questionnaire provides canonical symptom selections and human-readable adaptive answers. Shared code extracts affirmed findings, checks all emergency indicators, and aggregates all selected symptoms and medical conditions. Emergency findings override the score to 100. Other scores are capped at 100; Medium starts at 28 and High at 55. Age is recorded and used by the legacy confidence model. Age, intensity and duration are not features of the disease dataset; the disease model does not claim to learn effects absent from its data. The current rule engine does not apply age-specific weights.

The browser shows the deterministic result immediately. Groq then extracts explicitly affirmed symptoms into the fixed dataset vocabulary. The rule engine checks the extracted findings before the augmented assessment is saved. Extraction failure continues with the completed questionnaire; Groq never diagnoses. Disease inference supplies calibrated probabilities and SHAP, and Groq may explain this structured output without changing urgency. The authenticated assessment API recalculates it, obtains optional model output with a deadline, and atomically saves the complete questionnaire, result, version metadata, linked prediction log, and unique outcome check-in. Saving status and retry are visible. Optional Groq prose is loaded separately and cannot replace urgency or the fixed care action. Model outages return unavailable, never a fabricated percentage.

Standalone and serverless inference share ml-service/inference.py and ml-service/confidence_model.joblib. API rule_score is always raw 0–100 and is normalized once in Python. Historical results store their rule/model version and full assessment payload.

## Local setup

Use Node.js 24+ (the regression loader and database adoption script use its built-in APIs), Python 3.14, and npm. The checked-in model was serialized with scikit-learn 1.8.0; use the pinned Python environment.

1. Copy .env.example to .env. Set a random NEXTAUTH_SECRET, for example using node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))". Do not commit the resulting .env. Leave optional vendor credentials blank to exercise fallbacks.
2. Run npm ci.
3. For a fresh database, run npm run db:deploy. For an existing SQLite database created by db push, run npm run db:adopt. Adoption makes an ignored local backup, refuses destructive schema reconciliation and duplicate check-ins, and records the repaired baseline without deleting records.
4. Create a virtual environment: python -m venv .venv. On Windows install with .venv\Scripts\python.exe -m pip install -r ml-service/requirements.lock.txt. On other systems use the virtual environment's Python executable.
5. Generate/refresh the disease artifacts: run `cd ml-service` followed by `python train_pipeline.py` using the virtual environment, then return to the repository root. The public CSV files are included under `ml-service/data/`. Training also regenerates the matching Next.js symptom vocabulary.
6. Start the model service with .venv\Scripts\python.exe ml-service/server.py. It binds to 127.0.0.1:8000 by default and resolves model/database paths relative to the project, independent of the working directory.
7. Run npm run dev and open http://localhost:3000. Register with email/password. Google sign-in requires configured GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.

DATABASE_URL=file:./dev.db resolves to prisma/dev.db. The Python service uses the same path unless SYMPTOSENSE_DB explicitly overrides it. The legacy nested prisma/prisma/dev.db file is not the configured database; retain it locally until any records that need recovery have been reviewed. Operational database files and local backups are ignored by Git.

The migration history has been replaced with a consistent SQLite baseline because the old SQL and lockfile targeted PostgreSQL. Existing databases with an already-recorded migration history require a reviewed migration plan; do not reset a database containing needed records. The adoption script is intended for the checked-in local databases, which had no migration ledger.

## Verification

- npm run typecheck
- npm run lint
- npm test
- npm run test:python
- python -m pytest ml-service/tests -q
- python ml-service/execute_notebook.py
- npm run build
- npm run test:integration (starts disposable local services and a separate fixture database)

Tests exercise canonical/multilingual/negated danger signs, all-answer scoring, feature validation, legacy/full-payload report reconstruction, voice matching, request limits, admin permissions, actual model inference, deployment parity, unavailable models, migrations, reminder dates and opt-in handling, and reviewed-outcome retraining gates. Integration fixtures never use operational patient records or real notification credentials.

## Production configuration

Configure NEXTAUTH_SECRET, NEXTAUTH_URL, a durable database volume appropriate for SQLite, and a trusted reverse proxy. SQLite is the implemented provider; migrating to PostgreSQL requires changing the schema, migration history, and Python storage layer deliberately.

Production API limits require RATE_LIMIT_REST_URL and RATE_LIMIT_REST_TOKEN for a Redis-compatible REST pipeline service. Requests fail closed if those are missing or the service fails. Development uses bounded per-process limits. Set TRUST_PROXY=true only when a trusted proxy overwrites incoming forwarding headers. Production instances must share the rate-limit store.

Use ML_SERVICE_URL as the model service base URL. The legacy ML_SERVER_URL can specify a full prediction endpoint and is normalized for administrative calls. The root requirements.txt and .python-version describe serverless inference dependencies. vercel.json excludes local data and development files from the Python bundle. Serverless code parity is tested locally; a live Vercel deployment is not verified. SQLite assessment storage requires a durable writable volume, so the full application is not ready for deployment on ephemeral serverless storage. On Vercel, prediction can use the serverless entry point, but administrative retraining/reminders require a separately hosted persistent Python service configured via ML_SERVICE_URL.

Set ADMIN_EMAILS to a comma-separated allowlist and a nonempty RETRAIN_TOKEN shared by the web app and Python service. Missing values deny administrative access. The retrain/report endpoints require the token. A single active job is allowed. Model updates replace weights and version metadata; serving verifies their hash matches and returns unavailable during an incomplete promotion. Updates are reloaded without restarting prediction serving.

Reminders are disabled by default (SCHEDULER_DISABLED=1). Enable the scheduler explicitly and configure SMTP or WhatsApp credentials. Each account must opt in to the corresponding channel in Settings. Users can disable reminders or clear their phone number. Times are stored and compared as Prisma-compatible epoch milliseconds, and a short reservation prevents concurrent deliveries. Preview with python ml-service/followup_reminders.py --dry-run before enabling delivery.

## Disease ML pipeline and evaluation

Source: [Kaggle Disease Symptom Prediction](https://www.kaggle.com/datasets/itachi9604/disease-symptom-description-dataset). The downloaded `dataset.csv` contains `Disease` and `Symptom_1` through `Symptom_17`. Disease labels are retained from the public CSV; they are never generated from a feature formula. Empty slots mean no additional symptom. `data/SOURCE.md` records provenance, and `reports/ml_report.json` records the source hash.

`ml-service/train_pipeline.py` is the single entry point. It deduplicates identical symptom patterns **before** a seeded stratified train/test split, then compares Logistic Regression, Bernoulli Naive Bayes, Random Forest and XGBoost with five-fold stratified CV. Imputation and scaling are inside scikit-learn Pipelines. GridSearchCV tunes the two leading models using training folds only. The held-out test is excluded from fitting, tuning and calibration. Rare classes have too few distinct training patterns for every validation fold to contain every disease; the report discloses this and uses a supported fold count for calibration.

The single report contains EDA, fold scores with mean/std, search results, held-out classification metrics, top-three accuracy, confusion matrix, per-class metrics, one-vs-rest ROC and macro AUC, learning curve, multiclass Brier before/after calibration, confidence reliability, symptom-dropping robustness, global SHAP and rule agreement. All dashboard metric values come from this report, with no hardcoded performance claims. Calibration can worsen the measured Brier score; both values are shown.

Artifacts are in `ml-service/artifacts/`: best and calibrated models, label encoder, urgency model, symptom list, red flags and a training-only SHAP background. Key figures are in `ml-service/reports/figures/`. The executable notebook `ml-service/notebooks/SymptoSense_ML.ipynb` walks through the completed report and actual model, and can optionally rerun the full training entry point.

The disease dataset has **no clinical urgency labels**. A separate research classifier uses disease averages of the supplied symptom-severity weights, calculated from training rows only, with relative tercile targets. This is a derived-label proxy, not clinician-supervised urgency. Rule agreement uses the actual existing TypeScript engine with mild severity, short duration and no history; it is not a clinical validity measure. Red flags always override to High, regardless of the predicted condition or confidence.

The public data supplies a small set of repeated symptom-disease associations, not independently verified patient records. Deduplication leaves limited per-class test support. Results on that holdout do not establish external generalization, causal symptom importance, safety, or medical diagnostic accuracy. Missing age, duration and intensity cannot be learned. SHAP explains calibrated model probability, including contributions from absent symptoms; it does not establish medical causation.

Authenticated routes: `POST /api/ml/extract`, `POST /api/ml/disease`; admin-only report proxy: `GET /api/ml/report`. FastAPI exposes `POST /predict-disease` and `GET /ml-report`. Unknown symptoms are ignored only when other known symptoms remain; otherwise the request is rejected with the ignored list. Explicit aliases and unambiguous close spellings are mapped. Service failures return unavailable, never invented predictions. The default uncertain threshold is configurable through `DISEASE_CONFIDENCE_THRESHOLD`.

The questionnaire result page shows top-three possibilities, calibrated probability, a SHAP panel and the consult-a-doctor uncertainty state. `/dashboard/ml-insights` provides Dataset, Training, Evaluation, Explainability and Live Model tabs. Access follows the Model Health admin allowlist; set `ADMIN_EMAILS` to your own registered account to view the report. Disease results are displayed for the current assessment; existing saved reports continue to retain the original rule and legacy confidence fields.

## Retained legacy confidence and reviewed-outcome evaluation

The synthetic generator uses a fixed seed and the current shared rule weights/thresholds for the supported model symptom subset. It generates heuristic targets, not clinical correctness labels. Regenerating the dataset and model is an explicit development operation:

- python ml-service/generate_dataset.py
- python ml-service/train_model.py

Severity and duration each retain four distinct levels. The legacy generated dataset has no augmented copies before splitting. These commands replace development training artifacts; preserve/version artifacts that need comparison first. The model metadata identifies synthetic_heuristic as the target kind.

Outcome improvement or recovery alone is never treated as evidence that triage was correct. An authorized reviewer must explicitly verify appropriateness before an outcome can be used for retraining, through POST /api/model-health with action=review, followUpId, and reviewedCorrect. Assign that privilege only to suitable reviewers. Editing the patient's check-in clears its prior review.

Retraining requires at least 50 reviewed samples, enough distinct patients, both correctness classes, patient-separated calibration folds, and a fixed patient-level holdout. Synthetic labels are not mixed into that target. Promotion requires valid probabilities, improvement over the reviewed champion when present, and a Brier score better than both the constant 0.5 baseline and a baseline using the training prevalence. These engineering gates do not constitute clinical validation or deployment approval.

The manifest supplies a valid SVG icon. Offline operation and a service worker are not implemented. Family assessments store patient/relation metadata; persistent independent family health profiles are not implemented.
