> Historical review: the engineering findings below have since been repaired. See [FIXES.md](FIXES.md) for implemented changes, verification, and remaining configuration/evidence requirements.

**SymptoSense project analysis — 13 October 2026**

SymptoSense is a functional application prototype with useful separation between its questionnaire, deterministic scoring, confidence model, and external AI services. The reviewed implementation has material correctness, data integrity, security, and deployment blockers. It should not be described as clinically validated or ready for production on the evidence currently present in this repository.

This review indexed 73 TypeScript, TSX, Python, schema, migration, and requirements files and examined the main assessment, authentication, persistence, reporting, voice, training, and retraining paths. It also inspected project configuration, the lockfile, database schemas and aggregate counts, and serialized model hashes. Application source and database contents were not modified. This report is the only new project file.

**What the project actually implements**

| Layer | Implementation and responsibility |
| --- | --- |
| Web application | Next.js App Router and React; landing pages, login/signup, dashboard, questionnaire, results, reports, settings, model health |
| Authentication | NextAuth JWT sessions; credentials with bcrypt and a Google provider |
| Questionnaire | Five static questions plus up to six Groq-generated questions; emergency flow can end early |
| Risk | A deterministic rule engine with a 0–100 score; Medium starts at 28 and High at 55 |
| Confidence | An 18-feature RandomForestRegressor served by FastAPI; two separate deployment implementations |
| Explanation | Groq generates structured reasoning; local fallback logic is available |
| Voice | Sarvam speech recognition, synthesis, and translation; browser fallbacks |
| Storage | Prisma schema explicitly uses SQLite; assessment answers and several report fields are JSON stored in strings |
| Improvement workflow | Prediction logs, outcome check-ins, a retraining script, and an email reminder scheduler |

The main flow is: authenticate → choose language/person → answer questions → calculate risk in the browser → request ML confidence → request an AI explanation → show results → create and complete a database session. Logging happens before a database assessment ID exists.

The lockfile resolves Next.js 15.5.23, React 19.2.5, NextAuth 4.24.15, Prisma 5.22.0, and TypeScript 5.9.3. These are the locked versions, rather than the minimum versions written in package.json. Dependency vulnerabilities were not audited.

**What is working well in the design**

- Session read/write endpoints check the authenticated user's ownership. Follow-up submissions also check ownership.
- Passwords are hashed with bcrypt at cost 12; the registration response excludes the password hash.
- Groq and Sarvam credentials are used in server routes.
- The pure scoring engine is straightforward to inspect and exercise independently.
- The main scoring engine, saved recommendation selection, and gauge color thresholds share threshold definitions.
- The standalone Python service reports inference failure as unavailable, and the confidence meter supports that state.
- Local explanation and voice fallbacks provide a useful starting point for resilient behavior.

These strengths are structural; they do not establish clinical validity or successful deployment.

**Highest-priority findings**

1. **High — Emergency detection disagrees across the questionnaire and final scorer.**

   The questionnaire explicitly treats chest_pain and breathlessness as emergency values. The final engine searches for space-separated phrases and does not normalize the canonical values before searching. There is also a separate red-flag list in lib/redFlags.ts, which is not used by these two paths.

   Executed examples: chest_pain + mild + < 1 day returns 40/Medium with isRedFlag=false; chest pain returns 100/High with isRedFlag=true. The actual emergency acknowledgement supplies severe severity, so chest_pain finishes at 80/High with isRedFlag=false after an interim 100/High emergency finding. The acknowledgement avoids a Medium result in that specific UI path, but it loses the override and emergency provenance. The public analyze endpoint accepts the mild input and returns the inconsistent result.

   Fix: use one canonical symptom vocabulary and red-flag evaluator in interim, final, and server calculations; preserve the detected emergency independently of subsequent answer defaults.

   Evidence: [lib/ai-engine/scoring/engine.ts:15](C:/Users/dell/Desktop/Sympto/SymptoSense/lib/ai-engine/scoring/engine.ts:15), [lib/ai-engine/scoring/rules.ts:86](C:/Users/dell/Desktop/Sympto/SymptoSense/lib/ai-engine/scoring/rules.ts:86), [components/ai-question-engine/useQuestionEngine.ts:30](C:/Users/dell/Desktop/Sympto/SymptoSense/components/ai-question-engine/useQuestionEngine.ts:30), [components/ai-question-engine/useQuestionEngine.ts:492](C:/Users/dell/Desktop/Sympto/SymptoSense/components/ai-question-engine/useQuestionEngine.ts:492).

2. **High — Newly reported danger signs can be ignored, and selection order changes the risk calculation.**

   After an adaptive answer, the interim check receives only the original symptoms and custom symptom. It does not receive the newly selected adaptive answer. Final scoring uses only the first main symptom, first additional value, and first medical-history condition. Additional values can also be ordinary question answers rather than symptoms. customMedication is omitted from the medical-history construction.

   In an executed orchestration example with cough, headache, fatigue, diabetes, heart disease, blood thinners, and an adaptive answer of Sudden confusion, the result was 37/Medium. Only cough, headache, and diabetes contributed. The danger-sign answer and later conditions were not evaluated by the scorer. No clinical claim is needed to identify the defect: confusion is already an override in this project's own rules.

   Fix: extract structured, affirmed findings from every answer; evaluate all reported red flags; apply an explicit aggregation policy to all symptoms and conditions. Do not use array order as the clinical priority rule.

   Evidence: [components/ai-question-engine/useQuestionEngine.ts:364](C:/Users/dell/Desktop/Sympto/SymptoSense/components/ai-question-engine/useQuestionEngine.ts:364), [app/context/AppContext.tsx:258](C:/Users/dell/Desktop/Sympto/SymptoSense/app/context/AppContext.tsx:258), [app/context/AppContext.tsx:270](C:/Users/dell/Desktop/Sympto/SymptoSense/app/context/AppContext.tsx:270).

3. **High — Negated answers are treated as positive symptoms.**

   Both emergency matching and ML feature extraction use substring searches without negation handling. The exact engine returned an emergency score for no chest pain. The exact mapper set chest_pain=1 and dizziness=1 for the answer No chest pain or dizziness. Question keys are also included in the feature-search text, so naming a question after a symptom can activate that feature even when the answer denies it.

   Fix: prefer structured option metadata with explicit yes/no/unknown clinical values. Free text needs tested normalization and negation handling before it changes emergency flags or model features.

   Evidence: [lib/ai-engine/scoring/engine.ts:21](C:/Users/dell/Desktop/Sympto/SymptoSense/lib/ai-engine/scoring/engine.ts:21), [lib/ml/featureMapper.ts:38](C:/Users/dell/Desktop/Sympto/SymptoSense/lib/ml/featureMapper.ts:38), [lib/ml/featureMapper.ts:44](C:/Users/dell/Desktop/Sympto/SymptoSense/lib/ml/featureMapper.ts:44).

4. **High — A failed ML request can show the previous assessment's confidence and advice.**

   The outer ML catch returns an unavailable result but does not update display state. Starting another assessment does not clear the old confidence and explanation fields. An executed mocked network failure left the results screen showing the previous 96%/High confidence, old explanation, old factors, and old primary action. The persistence conversion also produces NaN from an undefined confidence score; JSON serialization converts that value to null.

   Fix: initialize every assessment's result fields, set unavailable display state in every failure path, keep an assessment identity for asynchronous updates, and preserve absent confidence as null without arithmetic. The arithmetic on a possibly undefined ml.score should also be checked by the full TypeScript build.

   Evidence: [app/context/AppContext.tsx:409](C:/Users/dell/Desktop/Sympto/SymptoSense/app/context/AppContext.tsx:409), [app/context/AppContext.tsx:427](C:/Users/dell/Desktop/Sympto/SymptoSense/app/context/AppContext.tsx:427), [app/context/AppContext.tsx:492](C:/Users/dell/Desktop/Sympto/SymptoSense/app/context/AppContext.tsx:492), [app/context/AppContext.tsx:513](C:/Users/dell/Desktop/Sympto/SymptoSense/app/context/AppContext.tsx:513).

5. **High — Serverless inference fabricates confidence when prediction fails.**

   api/predict-confidence.py returns 0.7/Medium when its model cannot load or prediction throws. The standalone service returns HTTP 503 in those cases. The Next.js proxy considers the serverless HTTP 200 response successful, so users and logs cannot distinguish that fabricated number from a real model output.

   Fix: return an explicit unavailable response consistently from both deployments. Share input/output contracts and failure behavior.

   Evidence: [api/predict-confidence.py:49](C:/Users/dell/Desktop/Sympto/SymptoSense/api/predict-confidence.py:49), [api/predict-confidence.py:72](C:/Users/dell/Desktop/Sympto/SymptoSense/api/predict-confidence.py:72), [ml-service/server.py:79](C:/Users/dell/Desktop/Sympto/SymptoSense/ml-service/server.py:79), [app/api/ml/predict/route.ts:49](C:/Users/dell/Desktop/Sympto/SymptoSense/app/api/ml/predict/route.ts:49).

6. **High — Migration history is incompatible with the current database provider and incomplete.**

   The schema uses SQLite, while migration_lock.toml says postgresql. Executing all three SQL files against an in-memory SQLite database reproduced syntax failures: the initial migration fails at ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY; later migrations fail at comma-separated ADD COLUMN syntax. The migrations also omit newer fields and the PredictionLog and FollowUp tables.

   The existing databases were created with SQLite-compatible schemas that do not match the SQL migration history. db push may explain a working local database, but it does not repair deployable migration history.

   Fix: choose a database provider deliberately, create a consistent migration baseline, and verify that a fresh disposable database reaches the complete current schema. Preserve existing data while reconciling the history.

   Evidence: [prisma/schema.prisma:8](C:/Users/dell/Desktop/Sympto/SymptoSense/prisma/schema.prisma:8), [prisma/migrations/migration_lock.toml:3](C:/Users/dell/Desktop/Sympto/SymptoSense/prisma/migrations/migration_lock.toml:3), [prisma/migrations/20260414051124_init/migration.sql:85](C:/Users/dell/Desktop/Sympto/SymptoSense/prisma/migrations/20260414051124_init/migration.sql:85), [prisma/migrations/20260414190108_add_confidence_fields/migration.sql:2](C:/Users/dell/Desktop/Sympto/SymptoSense/prisma/migrations/20260414190108_add_confidence_fields/migration.sql:2).

7. **High — Database files containing records are tracked in Git.**

   Inspection of the Git index confirmed that both prisma/dev.db and prisma/prisma/dev.db are tracked. Aggregate inspection found 10 assessment rows in the first file and one account plus four assessment rows in the second. No personal values or password hashes were printed. Whether those records are dummy data was not established.

   The second database also lacks the newer logging and follow-up tables, making accidental selection of the wrong file a functional problem.

   Fix: verify the records' provenance, stop tracking operational databases, use sanitized fixtures, and add precise ignore rules. If sensitive records have been shared, review repository history and access; deleting the current file does not remove historical copies. No database files were removed during this review.

   Evidence: [prisma/dev.db](C:/Users/dell/Desktop/Sympto/SymptoSense/prisma/dev.db), [prisma/prisma/dev.db](C:/Users/dell/Desktop/Sympto/SymptoSense/prisma/prisma/dev.db), [.gitignore](C:/Users/dell/Desktop/Sympto/SymptoSense/.gitignore).

8. **High — Administrative retraining permissions fail open.**

   isAdmin returns true when ADMIN_EMAILS is empty, allowing any authenticated account to access model-health data and trigger retraining. The Python retrain endpoint requires its token only when RETRAIN_TOKEN is configured. It listens on all interfaces when run directly and starts a new training thread for every accepted request without a concurrency guard.

   Fix: deny administrative access when configuration is missing, require service authentication, and permit only one retraining job at a time. Protect the report endpoint as well.

   Evidence: [app/api/model-health/route.ts:11](C:/Users/dell/Desktop/Sympto/SymptoSense/app/api/model-health/route.ts:11), [ml-service/server.py:138](C:/Users/dell/Desktop/Sympto/SymptoSense/ml-service/server.py:138), [ml-service/server.py:196](C:/Users/dell/Desktop/Sympto/SymptoSense/ml-service/server.py:196).

9. **High — Training logs and saved results trust client-supplied content.**

   The public logging endpoint accepts arbitrary object keys and values, arbitrary prediction results, and a client-supplied testSessionId without an ownership check. Its numeric-only comment is not enforced. Unauthenticated callers can write logs, and supplied session links are trusted. Separately, the authenticated sessions PATCH endpoint stores the caller's supplied score, urgency, and report fields without recomputing them.

   Fix: log validated features and real prediction results inside the server prediction workflow; verify ownership before linking a session; rate-limit writes. Compute authoritative scores on the server and validate all stored fields. Client result manipulation is currently limited by session ownership, but it undermines report and training integrity.

   Evidence: [app/api/ml/log/route.ts:19](C:/Users/dell/Desktop/Sympto/SymptoSense/app/api/ml/log/route.ts:19), [lib/db/predictionLog.ts:14](C:/Users/dell/Desktop/Sympto/SymptoSense/lib/db/predictionLog.ts:14), [app/api/sessions/route.ts:38](C:/Users/dell/Desktop/Sympto/SymptoSense/app/api/sessions/route.ts:38).

**Other substantial defects and limitations**

| Priority | Finding, impact, and repair |
| --- | --- |
| High | **Real-outcome retraining is disconnected.** The frontend logs features without testSessionId, then creates an assessment later. Retraining uses an inner join on that ID, excluding the normal logs. Create the assessment first or link a returned inference ID during completion. Evidence: [app/context/AppContext.tsx:310](C:/Users/dell/Desktop/Sympto/SymptoSense/app/context/AppContext.tsx:310), [app/context/AppContext.tsx:201](C:/Users/dell/Desktop/Sympto/SymptoSense/app/context/AppContext.tsx:201), [ml-service/retrain.py:99](C:/Users/dell/Desktop/Sympto/SymptoSense/ml-service/retrain.py:99). |
| High | **Saved reports lose the assessment inputs.** Only q0–q4 are saved: age, main symptoms, severity, duration, and one additional value. Adaptive answers, medications, custom medication, and the full history are absent. The report expects q11 for blood-thinner warnings, so those warnings cannot work for newly saved assessments. Persist the complete versioned payload with stable field names. Evidence: [app/context/AppContext.tsx:451](C:/Users/dell/Desktop/Sympto/SymptoSense/app/context/AppContext.tsx:451), [app/dashboard/reports/[id]/page.tsx:55](C:/Users/dell/Desktop/Sympto/SymptoSense/app/dashboard/reports/[id]/page.tsx:55), [app/dashboard/reports/[id]/page.tsx:273](C:/Users/dell/Desktop/Sympto/SymptoSense/app/dashboard/reports/[id]/page.tsx:273). |
| Medium | **The first adaptive question has no symptom context.** setSymptoms and setRiskSnapshot are followed immediately by a callback that captured the previous render. A hook simulation selected cough but the outbound first-question context had symptoms=[] and no riskSnapshot. Pass the newly computed context directly or load after the state update. Evidence: [components/ai-question-engine/useQuestionEngine.ts:193](C:/Users/dell/Desktop/Sympto/SymptoSense/components/ai-question-engine/useQuestionEngine.ts:193), [components/ai-question-engine/useQuestionEngine.ts:325](C:/Users/dell/Desktop/Sympto/SymptoSense/components/ai-question-engine/useQuestionEngine.ts:325). |
| High | **Confidence is a synthetic heuristic, with no demonstrated probability interpretation.** The 38,978-row CSV contains generated confidence labels. Labels are built from perturbation instability, hand-set penalties, overrides, and distribution balancing; evaluation reports R²/MAE against those labels. That establishes fit to the synthetic target, not a measured probability that triage is correct. The generator also uses different score weights and 31/61 thresholds from the app's 28/55 thresholds. Document the score's actual meaning, align the feature/rule contract, and evaluate against independent reviewed outcomes before presenting statistical reliability claims. Evidence: [ml-service/generate_dataset.py:20](C:/Users/dell/Desktop/Sympto/SymptoSense/ml-service/generate_dataset.py:20), [ml-service/generate_dataset.py:180](C:/Users/dell/Desktop/Sympto/SymptoSense/ml-service/generate_dataset.py:180), [ml-service/train_model.py:37](C:/Users/dell/Desktop/Sympto/SymptoSense/ml-service/train_model.py:37). |
| High | **Outcome labels do not measure assessment correctness.** derive_label maps recovery to high confidence and deterioration to low confidence without comparing outcome to the original urgency decision. An appropriate emergency referral followed by deterioration is not necessarily an incorrect assessment. Repeated follow-up submissions can create multiple outcome rows for one assessment, which the join then duplicates. Define a target tied to the assessment decision, retain a single authoritative outcome, and separate holdout data by assessment/person/time. Evidence: [ml-service/retrain.py:66](C:/Users/dell/Desktop/Sympto/SymptoSense/ml-service/retrain.py:66), [app/api/followups/route.ts:87](C:/Users/dell/Desktop/Sympto/SymptoSense/app/api/followups/route.ts:87). |
| Medium | **Model artifacts and runtime dependencies can drift.** Both serialized models are 32,506,753 bytes but have different SHA-256 hashes. Prediction parity is unverified. Retraining promotes only ml-service/confidence_model.joblib, leaving the serverless copy unchanged. Python requirements are unpinned; matplotlib, requests, and optional python-dotenv are not included despite relevant scripts importing them. Version and distribute one model artifact with a reproducible runtime. Evidence: [ml-service/retrain.py:295](C:/Users/dell/Desktop/Sympto/SymptoSense/ml-service/retrain.py:295), [ml-service/retrain.py:317](C:/Users/dell/Desktop/Sympto/SymptoSense/ml-service/retrain.py:317), [ml-service/requirements.txt](C:/Users/dell/Desktop/Sympto/SymptoSense/ml-service/requirements.txt), [api/requirements.txt](C:/Users/dell/Desktop/Sympto/SymptoSense/api/requirements.txt). |
| High | **Several paid/public endpoints have no abuse controls.** Question generation, Sarvam STT/TTS/translation, registration, and logging lack route-level rate limits; request types, text lengths, and audio size/type are weakly checked. Add schema validation, size limits, authentication or explicit guest limits, and shared rate limits. Existing ML/explanation limits are per process only. Evidence: [app/api/question-gen/route.ts:8](C:/Users/dell/Desktop/Sympto/SymptoSense/app/api/question-gen/route.ts:8), [app/api/sarvam/stt/route.ts:19](C:/Users/dell/Desktop/Sympto/SymptoSense/app/api/sarvam/stt/route.ts:19), [app/api/auth/register/route.ts:5](C:/Users/dell/Desktop/Sympto/SymptoSense/app/api/auth/register/route.ts:5), [lib/rateLimit.ts:1](C:/Users/dell/Desktop/Sympto/SymptoSense/lib/rateLimit.ts:1). |
| Medium | **External work can hold up results indefinitely.** The ML proxy has a timeout, but the browser explanation request, Groq question-generation server fetch, and Sarvam server fetches lack explicit deadlines. Aborting the questionnaire's browser request does not implement cancellation of its separate upstream request. Set server and client deadlines, cancel obsolete work, and show the deterministic result while optional enrichment loads. Evidence: [app/context/AppContext.tsx:329](C:/Users/dell/Desktop/Sympto/SymptoSense/app/context/AppContext.tsx:329), [app/api/question-gen/route.ts:158](C:/Users/dell/Desktop/Sympto/SymptoSense/app/api/question-gen/route.ts:158), [app/api/sarvam/tts/route.ts:29](C:/Users/dell/Desktop/Sympto/SymptoSense/app/api/sarvam/tts/route.ts:29). |
| Medium | **AI response shape and recommendation policy are not enforced.** Parsed JSON is returned and consumed without a complete schema or checking that advice preserves the deterministic urgency. Instructions in prompts provide guidance but no structural or semantic enforcement. Validate fields and lengths, retain a fixed emergency action from the rules engine, and fall back when validation fails. Evidence: [app/api/explanation/route.ts:178](C:/Users/dell/Desktop/Sympto/SymptoSense/app/api/explanation/route.ts:178), [app/api/question-gen/route.ts:187](C:/Users/dell/Desktop/Sympto/SymptoSense/app/api/question-gen/route.ts:187), [app/components/ResultsPage.tsx:33](C:/Users/dell/Desktop/Sympto/SymptoSense/app/components/ResultsPage.tsx:33). |
| Medium | **The UI claims saving succeeded before it knows.** Persistence is started without being awaited before showing results; errors are only logged, while the footer always says the full analysis was saved. Show pending/saved/failed state, provide retry, and complete the assessment transaction atomically. Evidence: [app/context/AppContext.tsx:484](C:/Users/dell/Desktop/Sympto/SymptoSense/app/context/AppContext.tsx:484), [app/components/ResultsPage.tsx:205](C:/Users/dell/Desktop/Sympto/SymptoSense/app/components/ResultsPage.tsx:205), [lib/db/sessions.ts:50](C:/Users/dell/Desktop/Sympto/SymptoSense/lib/db/sessions.ts:50). |
| Medium | **Report fetch errors can be displayed as reports.** The detail page parses session responses without checking response.ok and treats an error object as a report, then falls back to score 0 and Low. Distinguish unauthorized, forbidden, not found, and server errors before rendering report data. Evidence: [app/dashboard/reports/[id]/page.tsx:139](C:/Users/dell/Desktop/Sympto/SymptoSense/app/dashboard/reports/[id]/page.tsx:139), [app/dashboard/reports/[id]/page.tsx:210](C:/Users/dell/Desktop/Sympto/SymptoSense/app/dashboard/reports/[id]/page.tsx:210). |
| Medium | **Reminder date handling is incompatible with numeric Prisma SQLite timestamps.** The Python query compares scheduledAt and lastRemindedAt with ISO strings. A controlled SQLite test using a future epoch-millisecond scheduledAt returned it as due immediately. The existing databases had no follow-up rows, so this was verified on a synthetic fixture, not live reminders. Use one timestamp representation for selection and writes, and test round-tripping through Prisma. Evidence: [ml-service/followup_reminders.py:49](C:/Users/dell/Desktop/Sympto/SymptoSense/ml-service/followup_reminders.py:49), [ml-service/followup_reminders.py:209](C:/Users/dell/Desktop/Sympto/SymptoSense/ml-service/followup_reminders.py:209). |
| Medium | **WhatsApp reminders are incomplete.** Settings save a phone number, but the reminder query does not select it and run_reminders never invokes _send_whatsapp. Notification preferences and a way to clear the saved phone are also absent. Connect the channel intentionally and store notification preferences. Evidence: [ml-service/followup_reminders.py:54](C:/Users/dell/Desktop/Sympto/SymptoSense/ml-service/followup_reminders.py:54), [ml-service/followup_reminders.py:197](C:/Users/dell/Desktop/Sympto/SymptoSense/ml-service/followup_reminders.py:197), [app/api/profile/route.ts:50](C:/Users/dell/Desktop/Sympto/SymptoSense/app/api/profile/route.ts:50). |
| Medium | **Model-health URLs do not match the documented ML URL contract.** README specifies ML_SERVER_URL with /predict-confidence. Model-health appends /api/retrain/report or /api/retrain to that full URL, yielding the wrong path. The serverless deployment has no matching retrain/report routes. Separate a service base URL from prediction and administrative endpoint URLs. Evidence: [lib/db/modelHealth.ts:49](C:/Users/dell/Desktop/Sympto/SymptoSense/lib/db/modelHealth.ts:49), [lib/db/modelHealth.ts:60](C:/Users/dell/Desktop/Sympto/SymptoSense/lib/db/modelHealth.ts:60), [app/api/ml/predict/route.ts:4](C:/Users/dell/Desktop/Sympto/SymptoSense/app/api/ml/predict/route.ts:4). |
| Medium | **Voice matching has deterministic misclassifications.** Executed tests mapped teen to adult because teen is interpreted as the transliterated number three; not severe mapped to severe; one week matched no duration. Browser STT also resolves its transcript inside startRecording without directly passing it to the option matcher, and recording lacks hook unmount cleanup. Prioritize exact current-option matches, handle negation, expose recognized text through one consistent completion path, and release media tracks on unmount. Evidence: [utils/matchVoiceInput.ts:74](C:/Users/dell/Desktop/Sympto/SymptoSense/utils/matchVoiceInput.ts:74), [components/ai-question-engine/useSarvamSTT.ts:198](C:/Users/dell/Desktop/Sympto/SymptoSense/components/ai-question-engine/useSarvamSTT.ts:198), [components/ai-question-engine/useSarvamSTT.ts:238](C:/Users/dell/Desktop/Sympto/SymptoSense/components/ai-question-engine/useSarvamSTT.ts:238). |

**Documentation, UX, and maintainability gaps**

The README mixes a 0–30 score with the implemented 0–100 engine and describes PostgreSQL where the schema uses SQLite. Page metadata refers to Flask even though the Python service uses FastAPI. Family assessment metadata is stored, but there is no persistent family-profile entity or separate health-history model.

Setup documentation specifies .env.local, while the Python service explicitly attempts to load .env and the Prisma CLI setup needs a compatible environment-loading strategy. It omits Google OAuth credentials and administrative/retraining configuration. There is no committed environment example. The standalone model path is relative to the working directory; initial dataset generation/training are also working-directory dependent. Document one verified installation sequence and use resolved paths.

Language is duplicated between AppContext and the questionnaire hook. Cycling language in the questionnaire does not update the global language used for final explanations and saved session metadata. Local report reasoning remains English, and some Hindi/Marathi fallback content embeds raw English values. The manifest points to icon files that are absent, and no service worker was found; offline/PWA behavior has not been established.

AppContext combines screen state, input conversion, scoring, network calls, persistence, and timers in a 555-line component. The report-detail page combines parsing, recommendations, follow-up forms, and layout in 690 lines. Move orchestration into a dedicated assessment controller, introduce shared validated contracts, and keep display components focused on rendering. Store a rule version and model version with each result so historical reports remain reproducible.

Follow-up listing fetches the latest 50 rows globally before filtering to the caller, so other users' rows can displace that user's results. Filter ownership in the database query before applying the limit. Report history is capped at 20 without pagination, while the UI labels that count as the total.

**Executed verification and its limits**

| Check | Observed result |
| --- | --- |
| Pure scoring from the actual TypeScript source | Canonical/text red-flag mismatch and a false emergency on negated text reproduced |
| Actual ML feature mapper | Negated chest pain/dizziness activated positive features |
| Assessment orchestration with mocked services | Ignored later findings, missing persisted medications/AI answers, and stale 96% confidence after transport failure reproduced |
| Questionnaire hook with mocked React primitives | First adaptive request omitted selected symptoms and risk snapshot |
| Actual voice matcher | teen → adult; not severe → severe; one week → no match |
| All migration SQL executed in memory | All three failed under SQLite |
| Database inspection, read-only | Two schemas differ; tracked files contain account/assessment rows; aggregate counts only inspected |
| Reminder SQL with a synthetic fixture | Future epoch-millisecond date incorrectly selected as due |
| Model file hashes | Two serialized artifacts differ; no prediction parity test performed |
| Dataset metadata | 38,978 rows, 18 inference features, plus confidence and instability columns |

The normal terminal tool failed to start with a helper setup error on two attempts. node_modules is absent. Therefore npm lint, the full TypeScript check, next build, Python model loading, dependency auditing, browser testing, and real external API calls were not run. TypeScript source reproductions used Node's type stripping with isolated mocks; they are not a substitute for compilation or React browser tests. The existing Python test script prints a single HTTP example, catches errors, has no assertions, and imports requests outside the declared requirements. No frontend test runner or CI workflow was found in the inspected tree.

**Recommended order of work**

1. Repair shared emergency evaluation, affirmation/negation handling, and full-answer aggregation. Add regression cases for selected, typed, multilingual, negated, and adaptive danger signs.
2. Make result state specific to each assessment; clear prior output, handle unavailable confidence consistently, bound external calls, and show saving status accurately.
3. Reconcile the database provider and migration history; remove operational databases from version control after checking provenance; retain a sanitized development fixture.
4. Recompute and validate authoritative results on the server; restrict admin actions; validate and limit public writes and paid API calls.
5. Persist the full assessment and link server-recorded predictions to it. Repair follow-up uniqueness, timestamp handling, and reminder channels.
6. Consolidate model serving, artifact versions, feature contracts, and dependency versions. Define the confidence target precisely and build an independent evaluation set.
7. Add a repeatable verification pipeline: lint, strict TypeScript, production build, fresh-database migrations, targeted scoring/ownership/failure tests, and local Python inference smoke checks. Then verify the complete browser flow and multilingual voice behavior.

**External technical references used to check recommendations**

Prisma documents the native SQLite timestamp format as epoch milliseconds, which explains the numeric-date fixture used in the reminder check. See [Prisma SQLite connector documentation](https://docs.prisma.io/docs/orm/v6/overview/databases/sqlite).

scikit-learn documents that loading persisted models across different scikit-learn versions is unsupported; training and serving should use the same package versions. See [scikit-learn model persistence](https://scikit-learn.org/stable/model_persistence.html).

If confidence is intended to represent a probability of a defined assessment outcome, reliability diagrams and proper probabilistic scoring provide relevant evaluation tools. That requires independent observed outcome labels first. See [scikit-learn probability calibration](https://scikit-learn.org/1.8/modules/calibration.html).
