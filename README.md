# SymptoSense – ML-Based Symptom Triage and Disease Prediction System

SymptoSense is a symptom-triage prototype built with Next.js, React, Prisma/SQLite, and a FastAPI model service. It supports English, Hindi, Marathi, voice input, assessments for yourself or a family member, saved reports, and optional outcome reminders.

The rule score describes triage urgency on a **0–100** scale. Disease prediction uses classical machine learning on the synthetic DDXPlus patient dataset and shows the selected model's probabilities and evidence contributions. Calibration is compared on the validation split and deployed only when the report shows it improves both Brier score and log loss. The retained legacy confidence service uses synthetic heuristics and is separate from the disease classifier. **Not a medical diagnosis.** This repository does not establish clinical diagnostic accuracy.

## Architecture

The questionnaire provides canonical symptom selections and human-readable adaptive answers. Shared code extracts affirmed findings, checks all emergency indicators, and aggregates all selected symptoms and medical conditions. Emergency findings override the score to 100. Other scores are capped at 100; Medium starts at 28 and High at 55. Age is recorded and used by the legacy confidence model. Age, intensity and duration are not features of the disease dataset; the disease model does not claim to learn effects absent from its data. The current rule engine does not apply age-specific weights.

The browser shows the deterministic result immediately. Groq then extracts explicitly affirmed symptoms into the fixed dataset vocabulary. The rule engine checks the extracted findings before the augmented assessment is saved. Extraction failure continues with the completed questionnaire; Groq never diagnoses. Disease inference supplies raw model probabilities and SHAP, and Groq may explain this structured output without changing urgency. The authenticated assessment API recalculates it, obtains optional model output with a deadline, and atomically saves the complete questionnaire, result, version metadata, linked prediction log, and unique outcome check-in. Saving status and retry are visible. Optional Groq prose is loaded separately and cannot replace urgency or the fixed care action. Model outages return unavailable, never a fabricated percentage.

Standalone and serverless inference share ml-service/inference.py and ml-service/confidence_model.joblib. API rule_score is always raw 0–100 and is normalized once in Python. Historical results store their rule/model version and full assessment payload.

## Local setup

Use Node.js 24+, Python 3.12 (the tested environment; pinned versions are in `ml-service/requirements.txt`), and npm. Model artifacts use scikit-learn 1.8.0; use the pinned Python environment.

1. Copy .env.example to .env. Set a random NEXTAUTH_SECRET, for example using node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))". Do not commit the resulting .env. Leave optional vendor credentials blank to exercise fallbacks.
2. Run npm ci.
3. For a fresh database, run npm run db:deploy. For an existing SQLite database created by db push, run npm run db:adopt. Adoption makes an ignored local backup, refuses destructive schema reconciliation and duplicate check-ins, and records the repaired baseline without deleting records.
4. Create a virtual environment: python -m venv .venv. On Windows install with .venv\Scripts\python.exe -m pip install -r ml-service/requirements.txt. On other systems use the virtual environment's Python executable.
5. Generate/refresh the disease artifacts: run `cd ml-service` followed by `python train_pipeline.py` using the virtual environment, then return to the repository root. The raw DDXPlus files are local-only and ignored by Git; download the official files into `ml-service/data/ddxplus/` before training. Training regenerates the evidence vocabulary in both Python and Next.js.
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

Disease prediction now uses the synthetic [DDXPlus dataset on Figshare](https://figshare.com/articles/dataset/DDXPlus_Dataset/20043374), described in [the DDXPlus paper](https://arxiv.org/abs/2205.09148). Figshare identifies the release as CC BY 4.0. Provenance, license text hash, and input hashes are recorded in `ml-service/data/ddxplus/SOURCE.md` and each generated `ml_report.json`. The patient CSVs, conditions JSON, and evidence JSON are downloaded locally and ignored by Git.

The input schema was verified from the downloaded files: patient columns are AGE, DIFFERENTIAL_DIAGNOSIS, SEX, PATHOLOGY, EVIDENCES, and INITIAL_EVIDENCE. Evidence lists contain binary codes and categorical/multichoice values using `_@_`. Metadata defines 110 symptoms and 113 antecedents. INITIAL_EVIDENCE is excluded because the app does not collect it. Numeric age is mapped to the app groups Child (0?12), Teen (13?18), Adult (19?49), Elderly (50+); age 50 goes to Elderly to remove the questionnaire's overlapping boundary. Missing sex is represented as unknown, with 20% of training sex values masked for robustness.

Run `cd ml-service` then `.venv/Scripts/python.exe train_pipeline.py --train-rows 150000` on Windows (or `python train_pipeline.py --train-rows 150000` in the activated virtual environment). `DDXPLUS_TRAIN_ROWS` changes the default. The entry point uses seeded, pathology-stratified samples from the official train/validate/test splits; validation/test sample sizes scale proportionally. Preprocessing produces sparse features. The sample size, memory, training time, duplicate patterns, and exact-record overlap fingerprints are in `ml_report.json`. The release has no patient identifier, so the report cannot prove patient-level deduplication beyond exact record fingerprints. The sample budget limits representativeness and is a stated evaluation limitation.

Training compares Logistic Regression, Multinomial Naive Bayes, Random Forest, and XGBoost with five-fold stratified CV. It tunes the two CV leaders on training folds, selects by validation macro-F1, and only then evaluates the official test sample. The report contains model/baseline comparisons, top-k scores, per-class metrics, confusion matrix, ROC/AUC, calibration comparison, learning and robustness data, and SHAP outputs. Calibration is kept only if validation Brier score and log loss both improve; the live confidence uses the method recorded in `ml_report.json`. No performance number is asserted here: the dashboard and report are the source of actual trained metrics.

DDXPlus severity is lower-number-is-more-severe. The urgency research target maps severity 1?2 to High, 3 to Medium, and 4+ to Low; these are dataset-defined synthetic labels, not clinician-validated triage. The app combines urgency as the highest of the model result, red-flag override, and disease safety floor. **The disease safety floors are project safety choices, not clinical guidelines**: severity-1 Anaphylaxis, Larygospasm, Ebola, Possible NSTEMI / STEMI and acute pulmonary edema, plus severity-2 pulmonary embolism, unstable angina, spontaneous pneumothorax, Boerhaave, epiglottitis, Guillain-Barr? syndrome, Croup and Myocarditis raise urgency to High. PSVT, Scombroid food poisoning, acute dystonic reactions and stable angina (severity 2) have a Medium floor. Red-flag findings always force High. The rule engine remains responsible for triage. The system is not a medical diagnosis tool.

The notebook `ml-service/notebooks/SymptoSense_ML.ipynb` documents data, EDA, preprocessing, training/tuning, evaluation, baselines, robustness, explainability and limitations. `python ml-service/execute_notebook.py` executes and validates it. The derived models and report are generated artifacts; figures are in `ml-service/reports/figures/`. Authenticated app routes remain `/api/ml/extract` and `/api/ml/disease`; FastAPI exposes `/predict-disease` and `/ml-report`. Unknown evidences are returned in the ignored list; if none are recognized, the endpoint returns 422. Rule-engine red flags remain active even when prediction service is unavailable.

## Training on Google Colab

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/taksh1507/SymptoSense/blob/new-master/ml-service/notebooks/SymptoSense_Colab_Training.ipynb)

A dedicated, self-contained Google Colab notebook is provided at [`ml-service/notebooks/SymptoSense_Colab_Training.ipynb`](ml-service/notebooks/SymptoSense_Colab_Training.ipynb) for training the full DDXPlus pipeline using GPU acceleration (e.g., T4/V100/A100).

### Key Workflow Steps in Colab:
1. **Environment Check**: Detects CUDA GPUs (auto-enabling `DDX_XGB_DEVICE=cuda` for XGBoost acceleration), CPU cores, and system RAM.
2. **Google Drive Mount**: Optional checkbox to persist trained artifacts across Colab runtime disconnects.
3. **Repository Setup**: Clones the SymptoSense repository and configures the `ml-service` working directory.
4. **Pinned Dependencies**: Installs exact locked packages from `requirements.txt`.
5. **Automated Figshare API Download**: Queries the Figshare v2 API for [DDXPlus Article 20043374](https://figshare.com/articles/dataset/DDXPlus_Dataset/20043374) to download dataset files with automated SHA-256 integrity verification before archive extraction. Manual dataset downloading is not required.
6. **Dataset Verification & EDA**: Verifies all 49 conditions and 223 evidence codes, and inspects class balance.
7. **Realistic-Input Training**: Runs `train_pipeline.py` with configurable row budgets (default 150,000), realistic perturbation (symptom recall constraints, forget rates, and token mutations), and group-safe 5-fold cross-validation.
8. **Interactive Diagnostic Widget**: Provides an interactive test interface displaying top-3 condition predictions, calibrated confidence, selective prediction operating point, and `limited_information` / `confident` flags.
9. **Inline Visualizations**: Displays model comparison bar charts, calibration reliability curves, confusion matrices, SHAP attributions, and robustness plots directly in the notebook.
10. **Artifact Export**: Packages all trained joblib models, `operating_point.json`, schemas, and `ml_report.json` into `SymptoSense_artifacts.zip` with an automated browser download trigger. Extract this archive into `ml-service/artifacts/` to update your local deployment.

## Retained legacy confidence and reviewed-outcome evaluation

The synthetic generator uses a fixed seed and the current shared rule weights/thresholds for the supported model symptom subset. It generates heuristic targets, not clinical correctness labels. Regenerating the dataset and model is an explicit development operation:

- python ml-service/generate_dataset.py
- python ml-service/train_model.py

Severity and duration each retain four distinct levels. The legacy generated dataset has no augmented copies before splitting. These commands replace development training artifacts; preserve/version artifacts that need comparison first. The model metadata identifies synthetic_heuristic as the target kind.

Outcome improvement or recovery alone is never treated as evidence that triage was correct. An authorized reviewer must explicitly verify appropriateness before an outcome can be used for retraining, through POST /api/model-health with action=review, followUpId, and reviewedCorrect. Assign that privilege only to suitable reviewers. Editing the patient's check-in clears its prior review.

Retraining requires at least 50 reviewed samples, enough distinct patients, both correctness classes, patient-separated calibration folds, and a fixed patient-level holdout. Synthetic labels are not mixed into that target. Promotion requires valid probabilities, improvement over the reviewed champion when present, and a Brier score better than both the constant 0.5 baseline and a baseline using the training prevalence. These engineering gates do not constitute clinical validation or deployment approval.

The manifest supplies a valid SVG icon. Offline operation and a service worker are not implemented. Family assessments store patient/relation metadata; persistent independent family health profiles are not implemented.
