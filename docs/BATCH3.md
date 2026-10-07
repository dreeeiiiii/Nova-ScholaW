# Batch 3 final migration report

Date: 2026-10-06. Batch 2 was approved. This work covers Batch 3 only; no deployment was performed.

## 1. Final architecture

Next.js 16.3.5 / React 19 frontend and API proxies in `web`; Node.js / Express backend in `server`; Neon PostgreSQL; existing private Backblaze B2 storage; backend-only Brevo. JWT authentication uses active-account and token-version checks; passwords use bcrypt. Validation used Node **22.14.0**, npm **10.9.2**, PostgreSQL **17.5**, and local Chrome through Playwright.

## 2. Implemented modules

Official Student/Teacher registration and login; centralized Administrator; General/Department/Class Announcements with recipient and visibility isolation; College/SHS/JHS Department Management; image upload/moderation/category management; public homepage/gallery/TV; role dashboards/upload status; Change Password/logout; automated publication email ledger; Administrator Audit Logs.

Batch 3 adds structured audit-detail allowlisting, safe handling of legacy audit details on reads, explicit before/after department/class/section assignment summaries, direct-image-upload markers, partial/failed/configuration-blocked email audit events, current action/entity filter options, accessible filter labels, generic secret-safe server/storage/database logs, and health HTTP 503 when PostgreSQL is disconnected. Old active deployment documentation was corrected and historical plans archived.

## 3. Final role/permission matrix

| Capability | Student | Teacher | Administrator |
| --- | --- | --- | --- |
| Public registration | @my.nst.edu.ph | @tr.nst.edu.ph | Forbidden |
| Authorized login | Own active account | Own active account | @nst.edu.ph, single centralized role |
| General Announcements | Published/valid viewer | Published/valid viewer | Create/publish/manage |
| Department Announcements | Own department viewer | Own department viewer | Create/publish/manage one selected department |
| Class Announcements | Intended audience only | Create/manage own, select Students/classes/sections | No normal Class workflow |
| Approved Event Gallery | Browse | Browse | Browse/manage |
| Event Image upload | Pending | Pending | Direct approved upload |
| Upload status | Own uploads | Own uploads | Moderation queue |
| Approve/reject/categories | Forbidden | Forbidden | Allowed |
| Users/Sections/department assignment | Forbidden | Forbidden | Allowed |
| Audit Logs | Forbidden | Forbidden | View/filter |
| Change Password/logout | Allowed | Allowed | Allowed |

Owning Teachers can review their Class drafts/publications as part of authoring; other Teachers and the public cannot view them. The Administrator manages General/Department Announcements and cannot create normal Teacher Class Announcements.

## 4. Database migrations

No new Batch 3 migration. Reviewed unchanged ordered files: **004_paper_departments.sql**, **005_department_integrity.sql**, **006_email_publication.sql**. Migration runner executes atomically, verifies checksums, uses an advisory lock/timeouts, and refuses partial baseline schemas. Multiple Administrators abort without deleting them. Unknown legacy memberships stay NULL. Existing users, announcements, targets, gallery records and B2 keys survive; historic announcements remain email-ineligible. Historical format columns/constraints stay for compatibility; current application behavior is image-only.

Executed local migration tests cover upgrade, repeat application, altered checksum rejection, exact department names, history/key/target retention, membership consistency, protected academic references and atomic abort for multiple Administrators. New preflight/verification SQL scripts also executed inside these disposable tests.

Production schema was NOT inspected or migrated. [The runbook](../scripts/DEPLOY.md) requires read-only production metadata review, backup restoration rehearsal and branch migration before production application. The preflight detects specific blockers and emits metadata for review; it is not a complete automatic schema equivalence certificate.

Exact later command from `server`, with approved backend environment configured:

```powershell
npm run db:migrate
npm run db:migrate -- --apply
```

The first command only prints a plan and opens no connection. Backup, preflight, verification and restore commands are in the runbook. Do not run baseline SQL or historical demo seeds against production.

## 5. Brevo configuration

Backend only: `EMAIL_MODE`, `BREVO_API_KEY`, `EMAIL_SENDER_ADDRESS`, `EMAIL_SENDER_NAME`, `EMAIL_ENABLED_AT`, `EMAIL_TEST_RECIPIENT`. Modes: mock (default, no transport), disabled, test (one reviewed override mailbox), live (production only, valid cutoff/sender/key required). Sender must be verified with Brevo.

General recipients are active official Students; Department recipients are active Students/Teachers in the selected department; Class recipients are intended active Students. Normalized deduplication and a unique announcement claim prevent duplicate sends. Existing announcements are not automatically resent; edits/republication do not resend. Delivery failures leave publication intact and record safe counts/audit events. Brevo acceptance is not proof of Gmail receipt; that requires the later controlled manual test.

## 6. B2 status

Existing adapter/bucket/key configuration retained; no migration, real upload or deletion. Tests inject local B2 mocks. Historical gallery rows and B2 keys remain intact. New uploads accept JPEG/PNG/WebP only, with content validation and fixed 10 MiB boundary. Pending/rejected images stay out of public feeds.

## 7. Audit Log coverage

Authentication success/failure and password changes; public account registration; Administrator Student/Teacher create/update/activate/deactivate and explicit assignment before/after IDs; Section/class create/update/delete and department IDs; each announcement type's creation/publication (including scheduled publication); archive/update; image upload with role/direct/pending markers, approval/rejection/withdrawal; category create/update/delete; important email failures.

Audit storage accepts only structured enums, numeric IDs/counts, booleans and known changed-field names. Free-text names/titles/reasons, request bodies, passwords, JWTs, API keys, database credentials and signed URLs are excluded. Legacy details are preserved in the database but sanitized before API/UI responses. Audit failure is nonblocking and logs a generic message. Logs have no automatic retry guarantee; monitor failures. API and UI access are Administrator-only.

## 8. Tests executed

The final default `npm test` selects all current safe suites: Batch 1 migration/auth/announcement tests, Batch 2 email/image/category/password tests, Batch 3 audit/health/redaction tests, role middleware and password/JWT utilities. A preload forces mock email/fake B2 and blocks external fetch. Database harness requires localhost plus a test database name and creates/drops unique databases.

Commands executed using the full installed NVM runtime in the temporary shell PATH:

```powershell
node --version
npm --version
# cwd: server, BATCH1_DATABASE_URL set to the existing localhost disposable-test base
npm test
# cwd: repository root; both browser scripts create their own disposable databases
node server/tests/batch1/browser.mjs
node --experimental-test-module-mocks server/tests/batch2/browser.mjs
# cwd: web, explicit localhost API origins and dummy JWT config
npm run lint
npm run typecheck
npm run build
# cwd: repository root
git diff --check
```

Browser suites cover Student/Teacher registration/login/dashboard, Administrator General/Department publication, Teacher Class targets/publication, public homepage/gallery/TV isolation/refresh/expiry, centralized Department Management/section creation/user filters, real image form uploads with mock B2, pending approval/rejection, direct Admin upload, category denial, all-role Account/password/logout/cookie removal, Audit Logs display/filter and Student/Teacher page/API denial.

Reviewed repository terminology/obsolete behavior using `rg`; active source/environment examples/current docs have no conflicting matches. Frontend source and final `.next/static` scan found no Brevo API/key/B2-secret signatures or injected build-secret literal. Real private environment files were not changed or printed.

## 9. Test results

**44 tests passed; 0 failed; 0 skipped** in the final complete safe backend run. Both browser suites passed. Initial direct-upload audit assertion and browser cookie/locator/filter-label failures were corrected and rerun successfully. No unresolved test failures.

Older shared-fixture/live-storage test files remain historical references and are excluded from the explicit safe suite; they were not executed wholesale and are not claimed to pass. This is deliberate isolation from old assumptions and external services, with current acceptance coverage in the new suites.

## 10. Lint/typecheck/build

Frontend lint: exit 0, **0 errors / 20 warnings**. Typecheck: exit 0. Production build: exit 0, successful compilation/TypeScript/page generation (43 generated pages). `git diff --check`: exit 0. Build is local only, with explicit localhost API origins and dummy secret, not a deployment.

## 11. Warnings and source-of-truth comparison

Nonblocking: existing native-image/unused-variable/navigation lint warnings; Next.js multiple-lockfile workspace-root warning; Node experimental module-mocking warning; Windows CRLF normalization notices. Sequential email sends can extend request latency. A crash may leave a processing ledger claim requiring operator review; never delete/retry it blindly. No automatic historic catch-up/retry was added.

| Supplied revised-paper requirement | Verification |
| --- | --- |
| Next.js, Node.js/Express, Neon/PostgreSQL, Brevo | Source/configuration and local execution confirmed |
| One Administrator; three roles; official role domains; no public Administrator registration | Schema/auth/permission tests and browser registration confirmed |
| College / Senior High School / Junior High School only | Exact-name migration tests and centralized UI confirmed |
| General / Department / Class Announcements with correct creators/audiences/email | API, resolver, publication and browser tests confirmed |
| Public homepage/TV General only, status/expiry/refresh | Executed API/browser tests confirmed |
| Department Management without guessing legacy membership | Migration/auth/browser tests confirmed |
| Image-only Event Management, formats/10 MiB/pending/moderation/categories | Actual multipart/Sharp and browser tests confirmed |
| Audit Logs and secure Change Password for all roles | Executed audit/security/browser tests confirmed |
| Automated NST Gmail delivery | Mock transport/resolver/failure rules confirmed; real Gmail receipt intentionally pending manual rollout |

No mismatch was found against the paper requirements supplied in the user messages. No standalone revised-paper PDF/DOCX was present in the repository; an independent full-document comparison was not performed. Production Neon schema, live provider credentials, deliverability and hosting deployments were not exercised. These remain explicit operator review/smoke-test prerequisites, not claimed local passes.

Legitimate Bachelor of Elementary Education course names remain. Historical old terminology/features are retained only in clearly archived plans, prior batch reports, baseline compatibility metadata and negative rejection tests. Internal `announcement_targets` remains unchanged.

## 12. Manual production steps

Follow [DEPLOY.md](../scripts/DEPLOY.md): backup Neon and rehearse restore; review schema/preflight and migrate a branch; apply reviewed migrations; deploy backend with email disabled; verify health; deploy Vercel frontend; smoke-test; enable production test mode for one override mailbox; publish ONE controlled new announcement and verify NST Gmail; then enable live mode with a fresh cutoff and review scheduler activation. No public variable contains secrets.

This adjusts the requested sequence safely: the one-mailbox test precedes unrestricted live mode because a live General Announcement legitimately emails all active Students.

## 13. Rollback

Migration error before commit rolls back atomically. After commit prefer a reviewed forward fix; disable email/scheduler and pause writes. If necessary restore the verified archive into a NEW EMPTY recovery branch, reconcile writes since backup, validate and switch connections only with approval. Keep the migrated database for reconciliation. Do not drop new relationship/ledger structures or erase delivery claims. B2 requires no bucket rollback. Sent email cannot be undone.

## 14. Files changed in Batch 3

35 files, including three preserved historical documents moved into the archive. Previous Batch 1/2 changes and the pre-existing `.vscode/settings.json` deletion were left intact.

```text
README.md
BACKEND.md
DEVELOPMENT_PLAN.md
TASKS.md
DATABASE_SCHEMA.sql
docs/archive/BACKEND-pre-revision.md
docs/archive/DEVELOPMENT_PLAN-pre-revision.md
docs/archive/TASKS-pre-revision.md
docs/BATCH3.md
scripts/DEPLOY.md
scripts/migration-preflight.sql
scripts/migration-verify.sql
server/package.json
server/src/app.js
server/src/server.js
server/src/features/academic/academicController.js
server/src/features/announcements/announcementEmail.js
server/src/features/announcements/announcementScheduler.js
server/src/features/announcements/announcementModel.js
server/src/features/audit/auditDetails.js
server/src/features/audit/auditLogModel.js
server/src/features/audit/auditService.js
server/src/features/gallery/galleryController.js
server/src/features/users/userController.js
server/src/shared/config/b2.js
server/src/shared/config/db.js
server/src/shared/middleware/errorHandler.js
server/tests/safe-network.js
server/tests/batch1/harness.js
server/tests/batch1/migrations.test.js
server/tests/batch2/integration.test.js
server/tests/batch2/browser.mjs
server/tests/batch3/audit.test.js
server/tests/batch3/health.test.js
web/app/(app)/admin/audit-logs/_components/AuditLogTable.tsx
```

## 15. Safety confirmation

No deployment occurred. No real Brevo email was sent. No production database data was modified. No production B2 objects were modified. All executed database writes were confined to unique disposable localhost databases. Existing announcements/gallery images/B2 keys were not deleted. Local runtime/PATH changes were temporary; no Node installation was performed.

## 16. Verdict

**READY FOR PRODUCTION MIGRATION**, through the manual runbook and its mandatory backup/schema-review/rehearsal gates. Local implementation and safe acceptance checks pass. This verdict is not deployment authorization or a claim that production schema/provider/hosting checks have already passed.
