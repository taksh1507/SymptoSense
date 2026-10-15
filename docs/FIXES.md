# Repair record — 13 October 2026

Implemented the engineering corrections identified in PROJECT_ANALYSIS.md. That analysis is a historical snapshot of the original defects, not the current application status.

| Area | Implemented repair |
| --- | --- |
| Scoring | Shared canonical and multilingual findings; Unicode word boundaries; English/Hindi/Marathi denial handling; all selected/adaptive symptoms and medical conditions evaluated; emergency override preserved; common 28/55 thresholds. |
| Assessment state | Results reset for each assessment; late responses cannot overwrite another assessment; emergency advice shown immediately; saving status and retry reuse the created session. |
| Authoritative persistence | Authenticated, owned session completion recalculates risk on the server and atomically writes the full questionnaire, result, versions, numeric prediction log and unique check-in. Client scores and fabricated logs are rejected. Completed results cannot be changed, including concurrent requests. |
| Database | Complete SQLite baseline, consistent provider and additive adoption script with backup and row-count checks. Existing main database adopted without losing records. Operational databases removed from the Git index and ignored while local files remain. |
| Authentication and APIs | Admin permissions deny access when unset; mandatory retraining token; concurrency lock; request size/type limits, deadlines, authentication and shared production rate-limit support. Google login is disabled when unavailable; sign-in network errors release the loading state. |
| Model service | Standalone/serverless share one implementation and canonical artifact. Strict 18-feature contract, four severity/duration levels, exactly one score normalization, explicit unavailable failures, model hashes and metadata checked together. No fabricated fallback. |
| Training | Reproducible 30,000-row synthetic dataset regenerated with corrected rule weights and thresholds, no augmented copies before the split, and a versioned replacement model. Its target remains a synthetic heuristic. |
| Reviewed retraining | Recovery is not a correctness label. Independently reviewed, linked assessments are required; patients are separated across calibration/holdout; probability and baseline/champion gates apply; edited outcomes lose their review. |
| Follow-ups | Ownership is filtered before limits; repeat submissions update one row; Prisma epoch-millisecond dates; independent email/WhatsApp opt-in; phone clearing; bounded delivery reservation. |
| Reports and language | Complete payload and legacy parsing, medical-history warnings, correct total/pagination, saved language, local Hindi/Marathi care actions and explanations. Urgency/actions cannot be replaced by optional AI prose. Heuristic score wording replaces reliability claims. |
| Voice | Correct age/number matching, no automatic affirmative choice from negated speech, duration matching, browser transcript completion, MIME handling, recording deadlines, microphone/timer cleanup and suppression of late recording/audio callbacks. |
| Setup and verification | Ignored local configuration and pinned Python dependencies; valid manifest icon; font downloads removed from build; automated regression/HTTP tests and CI workflow added. Serverless dependency/package configuration supplied. |

## Verification

- ESLint: passed without errors or warnings.
- TypeScript: passed.
- Production Next.js build: passed, all 26 pages generated.
- JavaScript regression tests: 36 passed, including actual controller code with deterministic React/network mocks.
- Python tests: 24 passed, including the actual model, deployment parity, unavailable predictions, migrations, reminders, and real calibrated candidate/champion training using synthetic reviewed fixtures.
- Production HTTP integration: passed using disposable database, real NextAuth credentials sessions, the real Python service and a local Redis REST test double. Covers ownership, authoritative scoring, full payload, linked logs, idempotency, competing completions, unique outcomes, admin denial, preferences and a service outage.
- Fresh-database migration execution and existing-database adoption verified. Main database still contains the original 10 assessments; the legacy nested database still contains its original account and 4 assessments. No patient values or credentials were printed.
- Git whitespace check passed. Database files and the unused serverless model copy remain on disk but are no longer tracked.

The canonical synthetic model version is a63b0313a7526802; rule version is 2026-10-13.1. Original model/dataset artifacts and consistent database backups are retained locally under ignored .local directories. No Git commit, history rewrite, external notification, or deployment was performed.

## Configuration and evidence still required

Live Groq/Sarvam calls, Google OAuth, SMTP/WhatsApp delivery, a real Redis service and live deployment need the owner's service configuration and were not exercised. Their deadlines, validation, access controls and fallback paths are covered locally. Physical microphone/browser interaction has not been tested; controller/voice matching behavior has automated coverage.

The model remains a synthetic heuristic. Independent clinical evaluation data and suitable clinical reviewers cannot be manufactured by a code repair. Reviewed fixture tests establish software behavior, not medical accuracy. Production needs the documented shared rate-limit credentials, administrator/service authentication and durable SQLite storage. The full SQLite application requires a deployment with persistent writable storage; live serverless deployment is not verified.

Removing databases from the current Git index does not remove historical copies. Their provenance and any necessary history/access remediation remain to be reviewed by the repository owner. Offline operation and separate persistent family profiles are documented as unimplemented capabilities.

The serverless package configuration follows the [official Vercel Python runtime documentation](https://vercel.com/docs/functions/runtimes/python); see README.md for the local and production configuration steps.
