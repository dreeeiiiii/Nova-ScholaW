# Manual production migration and deployment runbook

Prepared in Batch 3. Nothing here has been executed against production. The revised capstone paper is authoritative. Deployment requires separate authorization.

## Architecture and service configuration

Next.js 16 / React 19 in `web` on Vercel; Node.js / Express in `server` on Render; Neon PostgreSQL; existing private Backblaze B2 bucket; backend-only Brevo transactional email. One centralized Administrator manages College, Senior High School and Junior High School.

Render: root directory `server`, Node 22 (local validation: 22.14.0), build `npm ci`, start `npm start`, health path `/api/health`. A disconnected database returns HTTP 503. Render's [Express deployment guide](https://render.com/docs/deploy-node-express-app) and [health-check guide](https://render.com/docs/health-checks) explain the hosting settings.

| Render variable | Required value / handling |
| --- | --- |
| NODE_ENV | production |
| PORT | Render-provided port |
| DATABASE_URL | Approved Neon connection string, SSL; secret |
| JWT_SECRET | Strong random secret; preserve for rollout unless deliberately invalidating sessions |
| JWT_EXPIRES_IN | 8h, matching the frontend cookie lifetime |
| CLIENT_ORIGIN | Exact HTTPS Vercel production origin |
| NST_STUDENT_EMAIL_DOMAIN | my.nst.edu.ph (default; set explicitly for clarity) |
| NST_EMAIL_DOMAIN | Optional legacy Student-domain fallback; unnecessary when dedicated variable is set |
| NST_TEACHER_EMAIL_DOMAIN | tr.nst.edu.ph |
| NST_ADMIN_EMAIL_DOMAIN | nst.edu.ph |
| B2_BUCKET_NAME, B2_BUCKET_ID | Existing bucket values; preserve |
| B2_ENDPOINT | Existing S3 hostname without https:// (the adapter adds it) |
| B2_REGION | Existing region |
| B2_KEY_ID, B2_APPLICATION_KEY | Existing backend-only secrets; preserve |
| B2_PRESIGN_EXPIRY_SECONDS | 3600 unless an approved existing value is required |
| ANNOUNCEMENT_SCHEDULER_ENABLED | false during rollout; true after smoke tests and scheduled-publication review |
| EMAIL_MODE | disabled during rollout; test for the controlled mailbox test; live only after receipt verification |
| BREVO_API_KEY | Backend-only transactional API key, stored in Render secrets |
| EMAIL_SENDER_ADDRESS | Verified Brevo sender address |
| EMAIL_SENDER_NAME | Nova Schola Hub or approved school sender name |
| EMAIL_ENABLED_AT | ISO UTC cutoff set immediately before each test/live activation |
| EMAIL_TEST_RECIPIENT | Reviewed official NST mailbox for test mode |

The image limit is fixed at 10 MiB by validation. `MAX_IMAGE_SIZE_MB` and `UPLOAD_DIR` are unused and were removed; do not configure them. No video setting is required. Never set test-database variables in production.

Vercel: root directory `web`, framework Next.js, install `npm ci`, build `npm run build`, use framework output defaults. Set Production scope variables before building ([Vercel environment guidance](https://vercel.com/docs/environment-variables)).

| Vercel variable | Required value / handling |
| --- | --- |
| API_URL | HTTPS Render origin, without /api or trailing slash |
| NEXT_PUBLIC_API_URL | Same origin; actually required by the existing client relative-media URL resolver |

The frontend does not require JWT_SECRET: it forwards its httpOnly cookie to Express, which validates authentication. Keep JWT_SECRET on Render only. Remove any former duplicate Vercel JWT secret. Never place Brevo, B2, database credentials or JWT secrets in public variables. Production secure cookies require HTTPS. Both packages select Node 22.x via engines; use the host's current 22.x patch.

## Backup, schema review and migration

Pause writes in the existing application and disable scheduled jobs for the cutover. Capture existing deployment versions and service variables securely. Use a PostgreSQL client matching or newer than the Neon server major version. The locally installed PostgreSQL 17 client must not dump a newer server. Configure `NEON_DIRECT_URL` and `DATABASE_URL` securely for the approved target; never commit their values or print them.

Set `NST_BACKUP_FILE` to an absolute path in restricted backup storage outside the repository. Run from the repository root in an approved operator shell:

```powershell
pg_dump --dbname=$env:NEON_DIRECT_URL --format=custom --file=$env:NST_BACKUP_FILE
if ($LASTEXITCODE -ne 0) { throw 'Backup failed: STOP' }
pg_restore --list $env:NST_BACKUP_FILE
if ($LASTEXITCODE -ne 0) { throw 'Invalid backup: STOP' }
psql --dbname=$env:NEON_DIRECT_URL --set=ON_ERROR_STOP=1 --file=scripts/migration-preflight.sql
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed: STOP' }
```

Keep the dump in restricted backup storage, outside the repository. A custom archive is restored with `pg_restore`; see [PostgreSQL backup documentation](https://www.postgresql.org/docs/current/app-pgdump.html). Rehearse restoration into an EMPTY isolated Neon branch/database and run the preflight there. Review the preflight metadata against `DATABASE_SCHEMA.sql` and the three migrations. The SQL file checks required tables, the known type constraint and centralized Administrator conditions; it does not certify every possible production schema variation. Any unexplained drift requires review before proceeding. Production schema was not queried in Batch 3.

Capture baseline row/key counts and a restricted export of `(id,b2_key)` and announcement target records for before/after comparison. Do not print signed URLs or password hashes. Review any existing `schema_migrations` checksums. Multiple Administrators abort the migration; resolve that explicitly without automatic deletion. If no Administrator exists, provision one authorized @nst.edu.ph account with a securely generated bcrypt hash through an approved operator procedure. Do not run `seed:production`, which contains historical demo data. Do not infer departments for legacy users.

After rehearsal and schema review, from the repository root:

```powershell
Set-Location server
npm ci
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed: STOP' }
npm run db:migrate
if ($LASTEXITCODE -ne 0) { throw 'Migration plan failed: STOP' }
npm run db:migrate -- --apply
if ($LASTEXITCODE -ne 0) { throw 'Migration failed: STOP' }
Set-Location ..
psql --dbname=$env:NEON_DIRECT_URL --set=ON_ERROR_STOP=1 --file=scripts/migration-verify.sql
if ($LASTEXITCODE -ne 0) { throw 'Verification failed: STOP' }
```

Run the migration in the configured backend operator environment (`DATABASE_URL`, JWT/CORS/domains/B2 variables present). `db:migrate` WITHOUT `--apply` is a no-connection plan. `--apply` runs the ordered files below in ONE transaction, with an advisory lock, 5-second lock timeout, 60-second statement timeout and checksum verification. Never run `DATABASE_SCHEMA.sql` directly against an existing database.

1. `004_paper_departments.sql`: departments, nullable relationships, token version, Department Announcement constraints, single Administrator index.
2. `005_department_integrity.sql`: membership consistency and academic-history protection triggers.
3. `006_email_publication.sql`: existing announcements email-ineligible; new announcements eligible; unique delivery ledger.

There is no Batch 3 schema migration. Historical users, announcements, targets, gallery records and B2 keys are preserved. Legacy gallery format metadata remains for retention, but current APIs only expose image workflows. Check all before/after counts and key/target exports; counts alone do not prove identity preservation. The verification SQL reports departments, unassigned users, migration versions and delivery eligibility. An upgrade of an unmigrated legacy database should have existing announcement eligibility FALSE and an empty delivery ledger before new publications. On an already migrated database, preserve its existing eligibility/ledger values.

## Deployment and smoke-test order

1. Backup and verify restoration; pause writes and review production schema.
2. Apply reviewed migrations; run verification and compare history/key exports.
3. Deploy compatible backend with EMAIL_MODE=disabled and scheduler false.
4. Require HTTP 200 and database=connected from `/api/health`.
5. Deploy Next.js frontend with the production backend origins.
6. Run all smoke tests below with email disabled.
7. Configure verified Brevo sender/key, EMAIL_MODE=test, reviewed EMAIL_TEST_RECIPIENT and a fresh EMAIL_ENABLED_AT cutoff; restart backend.
8. Publish ONE new controlled General Announcement using the Administrator. Test mode sends to ONE override mailbox; it does not send to resolved Student addresses.
9. Verify NST Gmail receipt and delivery ledger/audit results.
10. Set EMAIL_MODE=live with another fresh cutoff; clear the test recipient if desired, restart, then enable the scheduler after reviewing due announcements. Monitor safe email/audit logs.

This deliberately verifies one mailbox in production test mode before enabling unrestricted live recipients. A live General Announcement emails all active registered Students; it is unsuitable as a one-mailbox smoke test. Messages accepted by Brevo are not proof of Gmail receipt. See the [transactional email API](https://developers.brevo.com/reference/send-transac-email).

Smoke tests: public General Announcements/gallery/TV; both official registration domains and no public Administrator registration; all-role login/dashboard/password change/logout; General and Department Administrator workflows; Teacher Class targets; department isolation; Student image pending, Administrator approve/reject and direct image upload; category permissions; audit page/filter and Student/Teacher denial. Verify expired/unpublished/non-General content is excluded from public/TV. Test JPEG/PNG/WebP and oversized/non-image denial in a staging branch before production. Production smoke records must be explicitly approved and retained/archived appropriately; do not delete historical records or B2 objects.

Email retains normalized recipient deduplication, active-user filtering, department/class isolation, cutoff and unique claim. No historical catch-up or automatic retry. Failed delivery leaves the published announcement intact. In-process sequential delivery can extend publication latency; a crashed processing claim requires explicit operator review and must never be blindly resent.

## Rollback

Before the migration commits, any SQL failure rolls back the entire transaction, including newly inserted migration records. Fix the cause and rerun the unchanged checksummed files; never edit applied migration files.

After commit, disable email and scheduler, pause writes, and restore the previous compatible service versions only if their behavior is safe with the new schema. The old implementation allows obsolete role/image behavior, so do not reopen it unrestricted. Prefer a reviewed forward fix. Do not DROP department columns/tables or the ledger: that destroys new assignments and resend protection.

If restoration is required, restore the verified pre-migration dump into a NEW EMPTY recovery branch/database:

```powershell
pg_restore --dbname=$env:RECOVERY_DATABASE_URL --no-owner --no-acl --exit-on-error $env:NST_BACKUP_FILE
if ($LASTEXITCODE -ne 0) { throw 'Recovery failed: STOP' }
```

Validate the recovery branch and separately reconcile post-backup writes before an approved connection switch. Keep the migrated database for reconciliation. Restoring cannot unsend email; retain delivery evidence. B2 keys/objects remain unchanged and require no bucket rollback. This runbook performs no deployment or production action automatically.
