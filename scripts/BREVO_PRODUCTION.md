# Production Brevo: verified personal sender

## Implementation and audit

The backend uses HTTPS POST `https://api.brevo.com/v3/smtp/email`, authenticated with `BREVO_API_KEY`. This is the Transactional Email HTTP API, not an SMTP connection. Credentials stay in the backend. No frontend, authentication, route, B2, or announcement permission changes are required.

Publication in `announcementController.js` and scheduled publication in `announcementScheduler.js` call `deliverPublication`. `announcementModel.js` resolves active NST recipients: General -> Students; Department -> Students and Teachers in the selected department; Class -> Students matching explicit student, section, or course targets. Null/invalid addresses are excluded; the service normalizes and deduplicates addresses. Each live recipient receives an individual message to keep addresses private. Existing Administrator-only General/Department and Teacher-only Class rules are retained.

Sender name and address come exclusively from `EMAIL_SENDER_NAME` and `EMAIL_SENDER_ADDRESS`. A personal address is allowed; there is no NST-domain sender restriction and the sender never comes from the authenticated author. Title is the subject; escaped HTML preserves body line breaks and the original body is also sent as text.

**Provider limitation:** Brevo says it replaces free-mail sender addresses, including Gmail, with a compliant address, even for non-Gmail recipients. The app submits your verified personal sender exactly, but cannot guarantee that the inbox From address stays `your@gmail.com`. Check the received From header. If preserving the exact sender address is mandatory, use a personal address on a domain you control and authenticate that domain in Brevo; it does not need to be an NST domain. See [Brevo sender requirements](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders) and [Transactional API](https://developers.brevo.com/docs/send-a-transactional-email).

## Modes, cutoff, duplicate protection and ledger

- `live`: real resolved recipients; ignores `EMAIL_TEST_RECIPIENT`; uses `EMAIL_MODE=live` as the transport control, independent of `NODE_ENV`.
- `test`: a real Brevo request to ONE controlled `EMAIL_TEST_RECIPIENT` when there are resolved recipients. Intended recipient addresses are not sent to Brevo.
- `disabled`: no outgoing email; ledger status `skipped`.
- `mock`: local test mode, no network. Production defaults to disabled when EMAIL_MODE is absent.

Startup validates mode and requires nonblank API key, valid sender address, explicit nonblank sender name, and ISO UTC cutoff for live/test. Only test requires the override mailbox. Invalid configuration produces variable-name errors without secret values.

An announcement must be published and `email_eligible=true`. Migration 006 preserved existing announcements as ineligible. For live/test, `created_at >= EMAIL_ENABLED_AT` is enforced immediately before sending. This is a creation cutoff: an old draft published later remains blocked. Exact equality is allowed. Missing/invalid cutoff or creation date blocks transport. There is no catch-up scan on deployment/restart; scheduler stays disabled.

The ledger primary key is announcement_id. `INSERT ... ON CONFLICT DO NOTHING` atomically claims the announcement after recipient/configuration/cutoff checks and the migration 008 schema check, before transport. Skipped preflight checks do not create claims. The claim survives failures, concurrent publication, retries, republishing, restart and scheduler overlap. There are **no automatic retries**, including existing failed, blocked, mock, disabled or processing claims. Previously stored claims remain untouched. Do not delete/reset ledger rows to resend. Create a fresh announcement for a reviewed test after changing modes/cutoff. A crash after provider acceptance can leave an uncertain/processing claim; inspect Brevo logs and retained details before deciding on any manual recovery. This favors preventing duplicate mail over automatic guaranteed delivery.

The required additive migration `008_email_delivery_details.sql` adds JSONB `delivery_details` to the existing ledger, preserving all claims. It stores actual transport recipient email (test override in test mode), attempt/completion timestamps, processing/accepted/failed/uncertain state, provider message ID when returned, HTTP status and safe error category. Existing announcement ID, mode, resolved recipient count, accepted/failed totals and timestamps remain. Persisting the attempt fails closed before transport; recording fails stop subsequent sends. `accepted` means Brevo accepted the request, not confirmed inbox delivery. No delivery webhook was added.

Authentication rejection, sender rejection/unverified sender, 4xx, rate limiting and 5xx produce safe categories. Timeout/network failure is uncertain because the provider may have accepted the request. Zero recipients produces a `no_valid_recipients` eligibility log without transport or a delivery claim. Provider errors never crash the publication route or unpublish the announcement. Publication audit remains; email outcomes add `email.delivery_result` or `email.delivery_failure` with safe counts. Arbitrary provider error text, API keys, headers, passwords and JWT secrets are not logged. A DB/logging failure is reported without exception payloads; retained claims still prevent resend.

## Exact Render backend checklist

Root directory: `server`. Build: `npm ci`. Start: `npm start`. Health path: `/api/health`. Use Node 22.x. Preserve the existing database, JWT and B2 settings. Render supplies PORT.

```dotenv
NODE_ENV=production
DATABASE_URL=<existing production PostgreSQL URL>
JWT_SECRET=<existing strong backend secret>
JWT_EXPIRES_IN=8h
CLIENT_ORIGIN=<production Vercel HTTPS origin>

NST_STUDENT_EMAIL_DOMAIN=my.nst.edu.ph
NST_TEACHER_EMAIL_DOMAIN=tr.nst.edu.ph
NST_ADMIN_EMAIL_DOMAIN=nst.edu.ph

B2_BUCKET_NAME=<existing bucket name>
B2_BUCKET_ID=<existing bucket ID>
B2_ENDPOINT=<existing S3 endpoint hostname>
B2_REGION=<existing region>
B2_KEY_ID=<existing key ID>
B2_APPLICATION_KEY=<existing application key>
B2_PRESIGN_EXPIRY_SECONDS=3600

EMAIL_MODE=live
BREVO_API_KEY=<real Brevo API key, NOT SMTP key>
EMAIL_SENDER_ADDRESS=<verified personal sender you control>
EMAIL_SENDER_NAME=Nova Schola Hub
EMAIL_ENABLED_AT=<fresh current UTC ISO timestamp ending in Z>
ANNOUNCEMENT_SCHEDULER_ENABLED=false
```

At preparation time UTC was `2026-10-07T04:52:11Z`. Generate a fresh cutoff immediately before activation (PowerShell: `[DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")`); do not reuse the preparation timestamp later. Keep the chosen activation cutoff across routine deployments rather than moving it automatically.

For test mode use `EMAIL_MODE=test` and set `EMAIL_TEST_RECIPIENT=<controlled mailbox>`. For disabled mode use `EMAIL_MODE=disabled`. Live does not require EMAIL_TEST_RECIPIENT; you may remove it.

**Never put BREVO_API_KEY, DATABASE_URL, B2_APPLICATION_KEY or JWT_SECRET in Vercel**, including non-public variables. Keep all backend/B2 credentials on Render. The existing frontend only needs its API origin variables.

Apply the additive migration before deploying the changed delivery code. In the configured Render backend operator shell:

```sh
npm run db:migrate
npm run db:migrate -- --apply
```

The first command shows the plan without connecting. The second applies pending migrations transactionally and preserves previously applied checksums. Review the existing [deployment runbook](DEPLOY.md) for backup/schema preflight. Do not reset or seed production. Keep scheduler false. No production migration or deployment was performed by this implementation task.

## Exact manual Brevo setup

1. Open Brevo Settings -> Senders, Domains & Dedicated IPs -> Senders (labels may vary).
2. Add a sender with name `Nova Schola Hub` and one personal email address you control.
3. Open the verification email in that mailbox and complete verification; confirm the sender is verified in Brevo.
4. Open SMTP & API -> API Keys and create/copy an API key for the backend. Use the API key, not SMTP credentials. Enter it only in Render's BREVO_API_KEY.
5. Confirm the account can send transactional email, has sufficient quota, and that no account review or sender rejection is pending. Sender verification alone does not prove account activation or inbox delivery.
6. For a free-mail address, expect Brevo's documented sender replacement. If the exact From address must be preserved, verify a personal sender on a domain you control and complete Brevo's DKIM/DMARC setup instead. No NST sender requirement is introduced.

## Exact first production live send

1. Verify the personal sender in Brevo as above.
2. Apply the pending additive migration. In Render configure `EMAIL_MODE=live`, `BREVO_API_KEY`, `EMAIL_SENDER_ADDRESS`, `EMAIL_SENDER_NAME=Nova Schola Hub`, a fresh `EMAIL_ENABLED_AT`, and `ANNOUNCEMENT_SCHEDULER_ENABLED=false`.
3. Restart/deploy the backend. Confirm `/api/health` returns 200 with database connected and startup has no email validation error.
4. Log in as a Teacher. Create a NEW **Class Announcement** after the cutoff, targeting exactly ONE real active Student through `student_ids`. Leave section/course targets empty to avoid broadening the audience. Confirm the student email and active status beforehand. Publish once.
5. Verify correct sender (including any Brevo replacement), recipient, title/subject, HTML/text body, actual inbox receipt (check spam), Brevo transactional log/message ID, one ledger row with recipient detail, `announcement.publish` audit and `email.delivery_result`. An API accepted result alone is insufficient.
6. Refresh, repeat the same publish request and restart the backend; confirm no additional Brevo message, recipient attempt, or ledger row for that announcement. Inspect failure/processing states before any recovery; never blindly retry/reset the claim.
7. As Administrator, create one NEW Department Announcement. Verify only active Students and Teachers in that department receive it, with no other departments or inactive accounts.
8. Only after those checks pass, create one NEW General Announcement as Administrator. Confirm all and only active Students receive it. **General must not be the first live test.**
9. Leave scheduler disabled. Stop rollout and use EMAIL_MODE=disabled if any check fails; preserve ledger/audit evidence.

## Read-only verification

Run with the actual first-test announcement ID in a trusted database console:

```sql
SELECT announcement_id, mode, status, recipient_count, accepted_count,
       failed_count, created_at, completed_at, delivery_details
FROM announcement_email_deliveries
WHERE announcement_id = <announcement_id>;

SELECT action, entity_id, details, created_at
FROM audit_logs
WHERE entity_type = 'announcement' AND entity_id = <announcement_id>
ORDER BY created_at;
```

## Remaining production blockers

Real Brevo sender verification, account activation/quota, Render secrets/cutoff, pending migration and backend deployment, and actual receipt/ledger/audit/no-duplicate checks must be completed manually. No real Brevo requests or live announcements were sent during automated verification. An unchanged Gmail From address cannot be promised due to Brevo sender replacement.

## Files changed and verification results

- `server/src/shared/services/emailService.js`: HTML/text, recipient sanitation, safe provider outcomes and recipient attempt callbacks.
- `server/src/features/announcements/announcementEmail.js`: persist recipient details and success audit summaries; preserve atomic claim.
- `server/src/features/audit/auditDetails.js`: allow safe email result status values in audit summaries.
- `server/src/shared/config/env.js`: validate live/test environment; production default disabled.
- `server/src/shared/db/migrations/008_email_delivery_details.sql`: required additive JSONB ledger detail; preserves historical claims.
- `server/.env.example`: modes, verified personal sender and cutoff guidance.
- `server/tests/batch2/email.test.js`: mocked transport checks for modes, sender/body, cutoff, errors, zero recipients and recording failure.
- `server/tests/batch2/emailPublication.test.js`: real resolver/service/ledger with stub transport on disposable localhost PostgreSQL; General/Department/Class, inactive exclusion, concurrent claims, scheduler overlap, failures and historical cutoff.
- `server/tests/batch3/productionConfig.test.js`: live requirements, test-only override requirement, invalid UTC/calendar timestamps and default-disabled production.
- `scripts/DEPLOY.md`, `README.md`, `scripts/BREVO_PRODUCTION.md`: current deployment and live rollout instructions.

Validation on Node 22.14.0:

- Backend `npm test`: **54 passed, 0 failed**. The safe default suite includes Batch 1-3 plus middleware/utilities; legacy tests excluded by the existing package script were not run. Integration tests use unique disposable databases on an isolated localhost PostgreSQL instance, with fake credentials/provider transport and remote network denied.
- Web `npm run lint`: **0 errors, 20 existing warnings**.
- Web `npm run typecheck`: **passed**.
- Changed backend/test JavaScript syntax checks and `git diff --check`: **passed**.
- Backend has no configured lint/typecheck scripts; frontend unchanged, so no frontend build was required.

Verdict: **PRODUCTION BREVO EMAIL SENDING NOT READY** until the manual production blockers above are completed. Implementation and automated checks are ready for that rollout.

## October 8 email pipeline repair

See [the repair report](BREVO_EMAIL_FIX_REPORT.md) for current validation, direct test commands, preflight ordering and the evidence still needed to identify the production incident.
