# Batch 1 migration report — Nova Schola Hub

Project: Nova Schola Hub: A Web-Based Announcement and Event Management System for Nova Schola Tanauan.

The revised paper and the user's latest requirements define the target. This batch changes the existing Next.js/Express/PostgreSQL project; Backblaze B2 remains in place. No live Neon migration, deployment, production email, or production storage operation was performed.

Git checkpoint: `ef11e4f` (before Batch 1 implementation). The user's pre-existing deletion of `.vscode/settings.json` was left untouched. Implementation changes remain available for review in the working tree.

## Phase 1 — Database and relationships

Paper: exactly College, Senior High School, Junior High School; department relationships for Students, Teachers, sections and Department Announcements; preserve history.

Starting system: eight domain tables, section/course targeting, no departments, nullable academic IDs and historical free-text registration fields.

Migration:
- Reuse all eight domain tables.
- Add `departments` with exactly three allowed codes, `college/shs/jhs`.
- Add nullable `department_id` foreign keys to `users/sections/courses/announcements`. The course table remains the existing class targeting representation.
- Add `users.token_version` for password/session invalidation.
- Expand the existing announcement type constraint to `general/department/class`; Department requires exactly one department; the other types have none.
- Enforce at most one Administrator account. If multiple accounts exist, migration aborts for review; it does not delete or convert accounts.
- Add assignment integrity triggers for explicit changed/new membership, and protection against deleting historically targeted sections/classes.
- Add `schema_migrations` metadata. The runner is transactional, serializes migrations, records checksums, bounds lock waits, and handles whole SQL scripts.
- No users, announcements, free-text fields, targets, gallery records, categories, or audit history are backfilled or removed.

Scripts:
1. `server/src/shared/db/migrations/004_paper_departments.sql`
2. `server/src/shared/db/migrations/005_department_integrity.sql`

The numbering follows the existing 002/003 legacy scripts; the new runner executes only the ordered files in the new migrations directory. It does not reapply the legacy scripts. `DATABASE_SCHEMA.sql` stays the legacy empty-database baseline, with an explanatory header.

Backend/frontend: department model and department-aware academic/user APIs; registration options now use real department/section IDs. Unknown historical assignments stay NULL and remain editable without invented membership.

Tests: upgrade preservation, repeat application, unsupported department rejection, mandatory department type relationship, unique Administrator, mismatched membership, protected historical targets, checksum drift rejection, and atomic abort with two pre-existing Administrators.

## Phase 2 — Authentication and roles

Paper: Student registration @my.nst.edu.ph, Teacher registration @tr.nst.edu.ph, one authorized @nst.edu.ph Administrator, no public Administrator registration, change password.

Starting system: Student-only public registration with free-text academic information; administrative role creation and editing could create extra Administrators; no account password API.

Migration:
- Public registration accepts Student or Teacher only and validates the exact official domain.
- New registrations require a valid department; Students select a real section within it. Teachers cannot have Student section/class assignments.
- New administrative creation accepts Student/Teacher only; ordinary APIs cannot grant/remove the central Administrator role or deactivate that account.
- User lists support department filtering. Explicit Student/class/section membership must match the chosen department.
- Login still uses existing bcrypt/JWT authentication and httpOnly Next.js cookie proxies.
- Change Password validates the current password, replaces the bcrypt hash, and invalidates prior sessions through token versioning. Deactivation also invalidates sessions.
- Public user responses never contain password hashes or token versions.
- Category creation/editing now requires Administrator permission; this is a role correction, not the Batch 2 gallery migration.
- Existing institutional-domain environment variables remain in place; registration/login validation enforces the paper's exact domains rather than permitting a conflicting configurable domain.

Database: token version column above; historical hashes/roles/IDs retained.
Backend: authentication/user controllers/models, authentication middleware, reusable membership/password input helpers, academic CRUD guards.
Frontend: Student/Teacher registration, department/section options, Administrator account form safeguards, password proxy. Account navigation/page is reserved for Batch 2.
Tests: registration role/domain validation, duplicate emails, cross-department section rejection, official Teacher HTTP registration, authorization checks, legacy unassigned account edit, hash omission, password verification/change/session invalidation, and no passwords in audit details.

## Phase 3 — Announcement migration

Paper: Administrator-only General and Department creation; Teacher-only Class creation; no General manual targeting; restricted department/Class reads; school-wide General delivery surfaces.

Starting system: only General/Class; Teachers could create General, Administrators could create Class; Teacher reads were broad; detail/list checks differed; Student totals/filters were unreliable; scheduled announcements had no publisher.

Migration:
- Existing tables and targeting IDs remain. No historical type or author is rewritten.
- General and Department creation require Administrator; Class creation requires Teacher. Teachers can edit/archive their own Class announcements; Administrators manage General/Department announcements.
- Administrators do not receive the normal Class feed/detail workflow. Teachers can inspect their own Class content; Student reads require an intended target and published content.
- General accepts no manual targeting and is always exposed by the public/TV published feed irrespective of old `show_on_tv=false` historical values.
- Department requires one supported department; authenticated members see published applicable content.
- Class supports intended active Students, existing sections, and existing classes/courses; targets are validated/deduplicated. Partial changes preserve omitted target sets.
- List, count, filters and details share one visibility predicate, including status/publication/expiry checks. Students do not receive other recipients' personal information.
- The retained DELETE route now archives announcements, keeping content, targets, and B2 references. UI explains this retention.
- Add public/Department/TV Next proxies and role-specific creation/edit forms. Add Department badges/filtering and dashboard label support.
- Scheduled publication supports a 30-second backend worker and records publication audit entries. It is opt-in via ANNOUNCEMENT_SCHEDULER_ENABLED=true and disabled by default to avoid accidental live scheduled-data changes from local startup. It does not run when the application is imported by tests. Historical schedules whose authors conflict with the new creation permissions remain scheduled for explicit review.
- Add the reusable recipient resolver: General = active registered Students; Department = active member Students/Teachers; Class = intended active Students, deduplicated. Official role domains are filtered. Brevo sending/result recording is intentionally not implemented until Batch 2.

Database: announcement department/type support above, with historical target rows reused.
Tests: creation permission matrix, mandatory department, invalid targets/dates, visibility across departments/direct URLs, Class ownership, status/expiry privacy, correct filtered totals with pagination, public/TV exclusion, partial targeting, archive retention, historical Teacher General preservation, recipient resolution, and due-only scheduled publication.

## API changes

| API | Access/behavior |
| --- | --- |
| GET /api/auth/departments | Public registration choices |
| GET /api/auth/sections?department_id=... | Public real section IDs for selected department |
| POST /api/auth/register | Student/Teacher only; exact institutional domain |
| POST /api/auth/change-password | Authenticated; current password required; sessions revoked |
| GET /api/departments | Authenticated; three fixed departments |
| GET /api/users?department_id=... | Administrator; department-filtered account list |
| POST/PUT /api/users | Administrator; Student/Teacher management with assignment validation; no extra admin |
| GET /api/sections and /api/courses | Authenticated; optional department filter and Student counts |
| POST/PUT/DELETE /api/sections and /api/courses | Administrator; explicit department; preserve referenced history |
| POST /api/announcements/general | Administrator; school-wide; no targets |
| POST /api/announcements/department | Administrator; exactly one department |
| POST /api/announcements/class | Teacher; intended Student/section/class targets |
| GET /api/announcements and /:id | Role/audience/publication checks; inaccessible detail returns 404 |
| PUT /api/announcements/:id | Administrator General/Department; owning Teacher Class |
| DELETE /api/announcements/:id | Same write permission; archive instead of physical deletion |
| GET /api/announcements/public and /tv | Public published General only |
| POST/PUT /api/categories | Administrator only |

Existing route names remain; compatible Next proxies are supplied for the new APIs and academic mutations.

## Validation and limits

- Backend: 10 passing tests, including six announcement subtests, using fresh databases on an isolated local PostgreSQL cluster. No live database URLs are selected.
- Browser: local headless Chrome workflow for Student/Teacher registration, login proxy, Administrator announcement publishing, Teacher Class publishing, TV proxy, and Student dashboard/read permissions.
- Next.js production build passes, including TypeScript and route generation.
- ESLint has zero errors and 19 warnings, primarily existing image/navigation/unused-variable warnings.
- Migration CLI plan-only verification passes without opening a database connection.
- Git whitespace validation passes.
- The broad legacy backend/E2E suites were not run: some retain old permission expectations and perform database or B2 mutation/cleanup. They need safe updates in Batch 3. These targeted tests do not claim production or full-system acceptance.
- The build reports the existing multiple-lockfile/workspace-root warning; deployment configuration cleanup remains in the later preparation batch.

## Reproduce safe local checks

Prerequisite: a disposable localhost PostgreSQL database whose name contains `test`, with permission to create fresh test databases. The harness creates random test database names and drops only those it created. It rejects non-local URLs before doing so.

PowerShell, repository root:

```powershell
$env:BATCH1_DATABASE_URL = 'postgresql://LOCAL_TEST_USER@127.0.0.1:LOCAL_TEST_PORT/nova_batch1_test'
node --test server/tests/batch1/migrations.test.js server/tests/batch1/auth.test.js server/tests/batch1/announcements.test.js
node server/src/shared/db/migrate.js
```

Frontend build (web directory), using a disposable/unused localhost API address:

```powershell
$env:API_URL = 'http://127.0.0.1:LOCAL_API_PORT'
$env:NEXT_PUBLIC_API_URL = 'http://127.0.0.1:LOCAL_API_PORT'
$env:JWT_SECRET = 'local-validation-only'
npm run lint
npm run build
```

After the build, from repository root with the isolated database variable set:

```powershell
node server/tests/batch1/browser.mjs
```

The browser test starts/stops its own localhost Express/Next servers, creates test accounts, uses dummy B2 credentials, and blocks browser requests to non-local hosts. Chrome must be installed. There are no upload/delete-storage/email tests in this batch.

## Production manual actions — require separate approval

1. Review Batch 1 before beginning Batch 2. This branch is not ready for production release of the final system.
2. Before any approved Neon migration: verify a restorable database backup/Neon recovery point and test the upgrade on an isolated copy. Confirm the actual baseline tables/columns/constraint names and one authorized Administrator. Do not use the legacy baseline SQL against production.
3. The safe default command is `npm run db:migrate` from server: plan only, no connection. Only after explicit live-database approval does `npm run db:migrate -- --apply` apply both migrations using the existing backend environment. Do not run that now.
4. Supply a reviewed mapping of existing sections/classes and users to College/SHS/JHS. No mapping is shipped or executed. Assign academic records first; users with unknown membership remain NULL. Then explicitly assign reviewed users and resolve legacy free-text section/class references.
5. Until that mapping is complete, unassigned users retain access to General and existing intended Class announcements, but have no Department visibility. New Student registration needs a section explicitly assigned to the selected department.
6. Review old scheduled Teacher General/Admin Class announcements before allowing any publication through a paper-aligned author/workflow. For historical Teacher General records, Administrator review can publish immediately while keeping original authorship; future rescheduling is rejected. Enable the scheduler only after the approved migration, historical review, and Batch 2 email integration. Published history remains available to its permitted audience; it is not resent by this batch.
7. Review historical accounts with nonconforming official domains; their data is retained, but login validates the required role domain. Do not automatically change email addresses or assign roles.
8. Deploy only in the later authorized preparation/deployment step, after all batches pass local/staging acceptance. No secrets or existing live/local environment files were changed. The example environment documents the new optional scheduler switch.

## Rollback considerations

Migration errors roll back the entire transaction, including migration metadata and both scripts. Duplicate Administrators, incomplete schemas or lock/statement timeouts stop safely instead of deleting records.

After a successful migration, prefer keeping the additive tables/columns and fixing forward. Do not blindly drop departments, columns, or new Department announcements; that would discard new data. Do not restore the old permissive backend as an automatic rollback: it can re-enable conflicting creation permissions and cannot handle the new Department type correctly.

A schema rollback would require a separately reviewed plan, paused writes/scheduler, verified backups, and preservation/export of all post-migration Department/assignment records. No destructive down migration is provided or executed.

## Remaining later-batch work

- Batch 2: reusable Brevo service, automated publication delivery and results; image-only gallery enforcement/moderation/category UI; complete centralized Administrator Department Management navigation/screens; public homepage/TV presentation updates; Account/Change Password page.
- Batch 3: full audit coverage, removal of remaining old Targeted/video terminology, consistency updates to legacy helpers/tests, full paper acceptance testing and deployment preparation.
- Production department mappings and live migration approval remain manual dependencies. Batch 1 is ready for review of its scoped local implementation, not deployment.

## Files changed

This manifest excludes the user's pre-existing VS Code deletion and disposable validation files.

- `DATABASE_SCHEMA.sql`
- `server/src/features/academic/academicController.js`
- `server/src/features/academic/academicRoutes.js`
- `server/src/features/announcements/announcementController.js`
- `server/src/features/announcements/announcementModel.js`
- `server/src/features/announcements/announcementRoutes.js`
- `server/src/features/auth/authController.js`
- `server/src/features/auth/authRoutes.js`
- `server/src/features/categories/categoryRoutes.js`
- `server/src/features/dashboard/dashboardController.js`
- `server/src/features/users/userController.js`
- `server/src/features/users/userModel.js`
- `server/src/server.js`
- `server/.env.example`
- `server/src/shared/config/env.js`
- `server/src/shared/config/db.js`
- `server/src/shared/db/migrate.js`
- `server/src/shared/middleware/authenticate.js`
- `server/src/shared/middleware/errorHandler.js`
- `server/src/shared/utils/nstEmail.js`
- `web/app/(app)/admin/users/_components/UserFormModal.tsx`
- `web/app/(app)/announcements/[id]/edit/page.tsx`
- `web/app/(app)/announcements/_components/AnnouncementCard.tsx`
- `web/app/(app)/announcements/_components/AnnouncementDetailModal.tsx`
- `web/app/(app)/announcements/_components/AnnouncementForm.tsx`
- `web/app/(app)/announcements/_components/AnnouncementList.tsx`
- `web/app/(app)/announcements/_components/DeleteAnnouncementModal.tsx`
- `web/app/(app)/announcements/create/page.tsx`
- `web/app/(app)/announcements/page.tsx`
- `web/app/(app)/dashboard/page.tsx`
- `web/app/(auth)/register/page.tsx`
- `web/app/api/auth/sections/route.ts`
- `web/app/api/courses/route.ts`
- `web/app/api/sections/route.ts`
- `web/lib/auth.ts`
- `.gitignore`
- `server/src/features/academic/departmentModel.js`
- `server/src/features/announcements/announcementScheduler.js`
- `server/src/shared/db/migrations/004_paper_departments.sql`
- `server/src/shared/db/migrations/005_department_integrity.sql`
- `server/src/shared/utils/academicInput.js`
- `server/tests/batch1/announcements.test.js`
- `server/tests/batch1/auth.test.js`
- `server/tests/batch1/browser.mjs`
- `server/tests/batch1/harness.js`
- `server/tests/batch1/migrations.test.js`
- `web/app/api/announcements/department/route.ts`
- `web/app/api/announcements/public/route.ts`
- `web/app/api/announcements/tv/route.ts`
- `web/app/api/auth/change-password/route.ts`
- `web/app/api/auth/departments/route.ts`
- `web/app/api/courses/[id]/route.ts`
- `web/app/api/departments/route.ts`
- `web/app/api/sections/[id]/route.ts`
- `web/lib/proxy-api.ts`
- `docs/BATCH1.md`
