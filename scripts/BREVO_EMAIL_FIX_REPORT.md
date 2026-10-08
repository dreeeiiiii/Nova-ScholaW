# Brevo email pipeline repair

## Production root cause status

The exact Render incident cannot be established from this workspace alone: no failed production announcement row, ledger row, Render publish log or production migration state was provided. No Render/Neon connector is available. Production was not queried or modified. Empty transactional logs do not establish whether no request was made or a request was rejected.

A concrete pre-provider failure was reproduced using the original publication handler with one eligible active Student and a simulated missing migration 008: one delivery claim, one call to emailService, zero provider requests, final ledger status failed with recipient_count=1 and failed_count=1. The blocking operation is the first onDelivery callback in deliverPublication, which updates delivery_details BEFORE fetch. A missing delivery_details column throws PostgreSQL 42703; the service never reaches Brevo. This matches the reported symptoms, but is not a confirmed production diagnosis.

Two source defects were fixed: claims were created before eligibility/configuration/recipient checks (a skipped send consumed the first attempt); and live transport depended on isProduction as well as EMAIL_MODE. The latter would not explain a correctly configured NODE_ENV=production deployment.

## Trace and before/after findings

| Requested finding | Result |
| --- | --- |
| Exact file/function | server/src/features/announcements/announcementEmail.js: deliverPublication, onDelivery; server/src/shared/services/emailService.js: sendAnnouncementEmail |
| UI route | Teacher form POST /api/announcements/class; Next proxy POST to backend /api/announcements/class |
| Publication trigger before fix | Yes: createClassAnnouncement saves/commits targets, then calls deliverPublication for published status. Service is reached only when email_eligible is true and the claim succeeds. |
| Target IDs | Frontend student_ids contains user IDs, backend stores student target rows in student_id and matches users.id. No mismatch found. |
| Active field | users.is_active BOOLEAN; resolver requires TRUE and student role for Class. |
| Recipient count before/after | One in both the original missing-008 reproduction and corrected one-Student integration test. Production count unknown. Resolver unchanged. |
| Eligibility before/after | With live, valid config, published eligible Class and created_at after cutoff: true before and after. With nonproduction NODE_ENV: old live gate blocked, new live sends. Production eligibility unknown. |
| EMAIL_ENABLED_AT | No comparison/timezone bug found. TIMESTAMPTZ plus numeric Date timestamps; equality allowed, UTC/millisecond/offset regressions pass. Keep 2026-10-07T15:50:00Z. Old drafts remain excluded. |
| Duplicate claim | Atomic ON CONFLICT works; first-send self-blocking was not found. Premature claims for no-send outcomes were a bug. Checks now precede claims. Existing claims remain preserved, including failures/uncertain attempts. No automatic resend. |
| Migration 008 | Required. A schema check now fails safely BEFORE a claim if the column is absent, with database_column_missing_run_migrations. Migration file/checksum unchanged. |
| Brevo request | Correct HTTPS POST https://api.brevo.com/v3/smtp/email, api-key, Content-Type application/json, sender object, to array, subject, htmlContent and textContent. No template or SMTP transport. |
| Scheduler false | Immediate Class publication works independently of scheduler. |
| Result handling | Accepted response/messageId and sanitized 400/401/403/429/network results are persisted. Accepted means provider acceptance, not inbox confirmation. |
| Direct script mocked result | Actual CLI with intercepted fetch: HTTP 201, messageId <cli-mocked>, exit 0. Only email key/sender variables supplied; database/B2/cutoff omitted. No real provider requests. |

## Files changed

- server/src/features/announcements/announcementEmail.js: eligibility/resolution/schema checks before atomic claim, safe stage/category diagnostics.
- server/src/shared/services/emailService.js: shared eligibility, live independent of NODE_ENV, request/response diagnostics.
- server/src/shared/services/emailEligibility.js: shared eligibility, recipient normalization and safe config summary.
- server/src/shared/config/emailConfig.js: email-only environment parsing; trims values, validates UTC at application startup.
- server/src/shared/config/env.js: uses shared email configuration.
- server/scripts/test-brevo-email.js and server/package.json: direct provider test through the same service; no DB imports/records/claims. Explicit CLI tests use live transport to exactly the supplied mailbox; the announcement cutoff does not apply to this synthetic connectivity test.
- server/tests/batch2/email.test.js: cutoff, eligibility reasons and live without production gate.
- server/tests/batch2/emailPublication.test.js: real Class publication/resolver/ledger, all requested failures, inactive exclusion and no-recipient preflight.
- server/tests/batch2/emailPreflight.test.js: skipped checks, missing migration and first/duplicate claims.
- server/tests/batch2/directEmail.test.js: exact request, mocked error categories, email-only config and actual CLI.
- scripts/BREVO_PRODUCTION.md and this report: rollout behavior and commands.

No frontend, recipient resolver, section logic, visibility rules, gallery, B2 or migration changes. No push, production DB operation or real email was performed.

## Tests and validation

Coverage includes all 14 requested scenarios: one active Student, live after cutoff, publication calls service, request format, success ledger, 400/401/403/429/network failure ledger, inactive exclusion, duplicate publication, first claim and same-service direct CLI. Additional checks cover missing migration and preflight skips without claims.

Final backend suite: **108 passed, 0 failed, 0 skipped**. ESLint: passed, 0 errors and 17 existing warnings. TypeScript --noEmit: passed. Next production build: passed. git diff --check: passed.

The literal npm test/lint/typecheck/build commands were attempted. Windows cmd invocation failed silently; PowerShell npm execution exposed scripts-disabled errors for node_modules/.bin/*.ps1. Validation therefore ran the exact package-script Node test runner, ESLint, TypeScript and Next executables directly. Backend tests use fake provider/storage configuration, external fetch prohibition and disposable localhost PostgreSQL databases. No production credentials were loaded into backend tests.

## Production deployment commands

After reviewing/committing these changes and manually deploying that commit in Render (nothing was pushed here), keep root directory server, build command npm ci and start command npm start. In the configured Render shell, whose working directory is server:

~~~sh
npm ci
npm run db:migrate
npm run db:migrate -- --apply
~~~

The migration plan/apply commands are particularly relevant if 008 is absent. They use the existing transactional, checksummed runner and preserve data/claims; no reseed/reset. Review the existing deployment runbook for database backup/preflight. Redeploy/restart the backend after pending migrations. Preserve EMAIL_MODE=live, EMAIL_ENABLED_AT=2026-10-07T15:50:00Z and ANNOUNCEMENT_SCHEDULER_ENABLED=false. There is no repository-specific Render deployment CLI or service ID here; select the reviewed commit in Render Manual Deploy. No new migration is introduced.

Exact direct real email test (one actual email; run manually in the Render server shell):

~~~sh
npm run email:test -- student@my.nst.edu.ph
~~~

Replace the example with the controlled real Student mailbox. The CLI prints key/sender configured booleans, recipient, HTTP status and messageId or sanitized error. It makes no database writes. A successful direct test isolates provider connectivity; then create a NEW Class Announcement after cutoff targeting only that active Student to verify the complete application pipeline. Do not reset old delivery claims to retry.

## Expected Render success logs

Values below illustrate a newly published Class Announcement; id/date/messageId vary. Node may print objects across several lines.

~~~text
[email-debug] publish started { announcement_id: 123, type: 'class', status: 'published', created_at: <new timestamp> }
[email-debug] config { email_mode: 'live', email_enabled_at: '2026-10-07T15:50:00Z', api_key_configured: true, sender_configured: true }
[email-debug] recipient resolution { announcement_id: 123, recipient_count: 1, active_recipient_count: 1, target_type: [ 'student' ] }
[email-debug] eligibility { announcement_id: 123, eligible: true, reason: 'eligible' }
[email-debug] delivery claim created { announcement_id: 123 }
[email-debug] brevo request starting { announcement_id: 123, recipient_count: 1 }
[email-debug] brevo response { announcement_id: 123, http_status: 201, success: true, provider_message_id: '<provider id>', safe_error_category: null }
[email] { announcementId: 123, status: 'accepted', recipientCount: 1, accepted: 1, failed: 0 }
~~~

A duplicate logs eligibility reason duplicate_delivery_claim and makes no provider request. Missing migration 008 logs delivery failed with stage delivery_schema_check and safe_error_category database_column_missing_run_migrations; apply pending migrations before the next NEW publication.

## Evidence needed for the production verdict

In a trusted database console, run these read-only queries for the failed announcement ID (replace 123):

~~~sql
SELECT id, type, status, created_at, email_eligible
FROM announcements WHERE id = 123;

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'announcement_email_deliveries'
AND column_name = 'delivery_details';

SELECT announcement_id, mode, status, recipient_count, accepted_count, failed_count, created_at, completed_at
FROM announcement_email_deliveries WHERE announcement_id = 123;

SELECT version FROM schema_migrations
WHERE version IN ('006_email_publication.sql', '008_email_delivery_details.sql');
~~~

Share those safe results and matching Render email log lines to identify the exact production failure. Inspect recipient details privately if needed; they contain email addresses.

Verdict: code defects repaired and mocked provider/one-Student verification ready. Exact production root cause and real Brevo reachability remain unconfirmed until the production evidence and manual direct test are available. The three requested production success verdicts cannot truthfully be asserted yet.
