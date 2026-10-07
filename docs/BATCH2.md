# Current Batch 2 verification status

**BATCH 2 READY FOR APPROVAL** for the listed Batch 2 requirements after safe local verification on 2026-10-06. Node v22.14.0 / npm 10.9.2; 24 backend tests and both browser suites passed; lint has 0 errors / 20 warnings; typecheck and build passed. See [the current verification report](BATCH2_VERIFICATION.md) for commands, evidence, fixes, limits and the paper-requirement matrix. No production email, deployment or production database/B2 modification occurred. Batch 3 has not begun.

The initial implementation report below records the earlier blocked state and is retained as history. Its verification status and manual runtime instructions are superseded by BATCH2_VERIFICATION.md.

---

# Batch 2 implementation report

Scope: Phases 4, 5 and 6 only. Batch 1 approval is preserved. Batch 3 has not started.

1. Completed requirements

Implemented backend Brevo submission, publication hooks and persistent result recording; image-only event uploads and moderation; Administrator category permissions; role-specific dashboard links; centralized Department Management; public homepage announcement/gallery content; TV refresh/expiry handling; and Account / Change Password UI using Batch 1's secure backend and token invalidation.

These are implementation claims, not runtime acceptance claims. Required local verification could not execute in this session. The revised capstone paper remains authoritative. No paper file was found in the repository; the available sources were the user's detailed Batch 2 requirements and approved Batch 1 report/code. Direct comparison with the paper remains outstanding.

2. Files changed

The manifest below lists Batch 2 changes, including edits to files already modified by Batch 1. The working tree also contains the approved Batch 1 changes and the pre-existing `.vscode/settings.json` deletion; those are not newly attributed to this batch.

- `server/.env.example`
- `server/package.json`
- `server/src/features/announcements/announcementController.js`
- `server/src/features/announcements/announcementModel.js`
- `server/src/features/announcements/announcementScheduler.js`
- `server/src/features/announcements/announcementEmail.js`
- `server/src/features/dashboard/dashboardModel.js`
- `server/src/features/gallery/galleryController.js`
- `server/src/features/gallery/galleryModel.js`
- `server/src/features/gallery/galleryUpload.js`
- `server/src/shared/config/constants.js`
- `server/src/shared/config/env.js`
- `server/src/shared/db/migrations/006_email_publication.sql`
- `server/src/shared/services/emailService.js`
- `server/src/shared/utils/validateMedia.js`
- `server/tests/batch1/migrations.test.js`
- `server/tests/batch2/email.test.js`
- `server/tests/batch2/integration.test.js`
- `server/tests/batch2/browser.mjs`
- `server/tests/gallery.test.js`
- `server/tests/gallerySearch.test.js`
- `server/tests/categoryBrowseSearch.test.js`
- `web/package.json`
- `web/proxy.ts`
- `web/app/page.tsx`
- `web/app/_components/home/HowToUse.tsx`
- `web/app/(auth)/register/page.tsx`
- `web/app/(auth)/register/RegisterForm.tsx`
- `web/app/(app)/_components/AppShell.tsx`
- `web/app/(app)/account/page.tsx`
- `web/app/(app)/account/ChangePasswordForm.tsx`
- `web/app/(app)/admin/departments/page.tsx`
- `web/app/(app)/admin/departments/Sections.tsx`
- `web/app/(app)/admin/events/page.tsx`
- `web/app/(app)/admin/categories/page.tsx`
- `web/app/(app)/admin/moderation/page.tsx`
- `web/app/(app)/admin/moderation/_components/ModerationQueue.tsx`
- `web/app/(app)/admin/moderation/_components/ModerationTabs.tsx`
- `web/app/(app)/admin/users/page.tsx`
- `web/app/(app)/admin/users/_components/UserManagement.tsx`
- `web/app/(app)/announcements/create/page.tsx`
- `web/app/(app)/dashboard/page.tsx`
- `web/app/(app)/gallery/page.tsx`
- `web/app/(app)/gallery/upload/page.tsx`
- `web/app/(app)/gallery/_components/GalleryClient.tsx`
- `web/app/(app)/gallery/_components/GalleryGrid.tsx`
- `web/app/(app)/gallery/_components/GalleryGuestGrid.tsx`
- `web/app/(app)/gallery/_components/Lightbox.tsx`
- `web/app/(app)/gallery/_components/MyUploadsClient.tsx`
- `web/app/(app)/gallery/_components/ReviewModal.tsx`
- `web/app/(app)/gallery/_components/UploadForm.tsx`
- `web/app/tv/page.tsx`
- `web/app/tv/_components/TvSlideshow.tsx`
- `docs/BATCH2.md`

3. New environment variables

Backend `server/.env.example` now documents these variables without real secrets:

| Variable | Default / purpose |
| --- | --- |
| EMAIL_MODE | `mock`; supported modes: mock, disabled, test, live |
| BREVO_API_KEY | Empty; backend credential only |
| EMAIL_SENDER_ADDRESS | Empty; verified sender for a later approved configuration |
| EMAIL_SENDER_NAME | Nova Schola Hub |
| EMAIL_ENABLED_AT | Empty; ISO UTC cutoff required for test/live delivery |
| EMAIL_TEST_RECIPIENT | Empty; mandatory reviewed override for test mode |

Removed obsolete video size/duration configuration. Existing B2 settings and keys remain in place. No real environment file was edited.

4. Brevo implementation details

The reusable service uses the [Brevo transactional email API](https://developers.brevo.com/reference/send-transac-email), `POST https://api.brevo.com/v3/smtp/email`, with the `api-key` header on the backend. Each message has one recipient, preserving address privacy. A 10-second request timeout bounds individual provider requests. Brevo HTTP acceptance is recorded as `accepted`; it does not establish inbox delivery. No delivery webhook is implemented or required by this batch.

Immediate creation, draft/scheduled-to-published updates, and the existing opt-in scheduler invoke delivery after the announcement is committed. Batch 1's resolver selects active official-domain Students for General, selected-department active Students/Teachers for Department, and active intended Students matched by direct/class/section targets for Class. Case-normalized addresses are deduplicated before sending. Creation permissions remain Administrator General/Department and Teacher Class.

Additive migration `006_email_publication.sql` adds `email_eligible` and `announcement_email_deliveries`. Existing announcements receive FALSE eligibility; future records default TRUE. A unique announcement claim prevents duplicate sending, including repeated edits or republication. No historical scan, catch-up, or automatic retry is provided. Live/test modes additionally reject announcements created before the configured enablement cutoff. Live mode is blocked outside production. Mock mode performs no provider request; test mode replaces the entire intended recipient set with one safe override.

Delivery failures do not remove or roll back a publication. Safe logs contain announcement ID, status and counts only. Provider bodies, credentials, recipients, content and exception text are not logged by the email service. The ledger records recipient and accepted/failed counts, mode, status and timestamps.

5. Event Management changes

JPEG, PNG and WebP only, with a fixed 10 MiB boundary (10 * 1024 * 1024 bytes, matching the existing project's 10 MB convention). Multer rejects larger files and unsupported MIME types. Sharp checks actual image format, decoding, input pixel limits and single-image content; renamed/non-image payloads are rejected before B2 upload.

Student/Teacher images enter Pending. Administrator uploads are approved directly with reviewer metadata. Administrator-only pending review supports approval/rejection; updates guard against concurrent review. Public browse/search/detail/recent feeds, dashboard gallery counts and upload-status lists expose image records only. Historical non-image rows remain in the database, hidden from image workflows. No gallery migration deletes rows or objects.

Category creation/edit/deletion remains Administrator-only in the backend and is now aligned in UI access/navigation. Category deletion retains gallery records through the existing SET NULL relationship. The existing DELETE gallery endpoint now withdraws an image from public display, preserving its row and B2 object; UI copy explains this. B2 upload and signed-image URLs remain in use.

Removed video upload controls, playback branches, filters and labels. Updated video filter success tests to rejection tests. Replaced the obsolete live-B2 gallery test suite with the isolated mocked suite; the old entrypoint is explicitly skipped. Fixed the gallery page's double-question-mark API query defect and negative browse pagination bounds.

6. UI/dashboard changes

Homepage displays published General Announcements and approved gallery image previews, with TV, gallery, Login, Student registration and Teacher registration links. Registration destinations select the requested role on the server and retain Batch 1 validation.

Student/Teacher dashboards link to General, applicable Department and Class feeds, gallery, Upload Event Image, Upload Status and Account. Teachers have Class creation only; category management access is removed. Existing Logout remains available.

Administrator navigation provides General Announcements, Department Management, Event Management, Audit Logs and Account. Department Management contains College, Senior High School and Junior High School with Students, Teachers, Sections CRUD, and preselected Department Announcement creation. Account search/pagination preserves the department filter. All-account management remains available for explicit legacy corrections; no unassigned membership is guessed.

Event Management centralizes Event Images, Pending Uploads/Approve/Reject, Upload Image and Categories. Upload forms and success messages distinguish direct Administrator publication from member review.

TV remains public, reuses the existing Batch 1 public proxy and backend General-only visibility predicate, polls with no-store every 30 seconds, and removes expired content using its clock between polls. Account UI requires current password, validates new password and confirmation, uses the secure Batch 1 password API, clears the cookie on success and requests sign-in again. Prior tokens are invalidated by the existing token-version mechanism for every role.

7. Tests performed

Executed eight static source checks: frontend secret-variable exclusion; absence of video upload/playback paths; MIME and size enforcement configuration; retained gallery records/storage; historical email eligibility and unique ledger claim; Administrator category route guards; corrected gallery query; and valid package JSON. All passed. `git diff --check` passed.

Authored, but NOT executed, safe tests for General/Department/Class recipients, overlapping target deduplication, inactive exclusion, normalized duplicate addresses, provider failures/redaction, safe overrides/cutoffs, publication persistence on email failure, duplicate/historical resend prevention, public/TV isolation, JPEG/PNG/WebP, exact 10 MiB and over-limit cases, invalid content/video rejection, pending/approve/reject, direct Administrator upload, category permissions/preservation, gallery withdrawal, and every role's password/token lifecycle.

Authored, but NOT executed, browser acceptance for homepage content/registration destinations, Student/Teacher/Administrator dashboards, Teacher creation/category restrictions, Department Management, Event Management, image upload controls, TV refresh after archival and Change Password for all roles. Browser network access is limited to localhost; the integration suite mocks B2 and email and rejects external fetches.

8. Test/build results

| Check | Result |
| --- | --- |
| Static source checks | 8 passed |
| Git whitespace | Passed |
| Backend Batch 2 tests | Blocked before execution: node unavailable |
| Browser acceptance | Blocked before execution: node unavailable |
| ESLint | Attempted; npm unavailable |
| Typecheck | Attempted; npm unavailable |
| Next production build | Attempted; npm unavailable |
| Disposable PostgreSQL start | Blocked: restricted-token error 87 / start error 3 |

Node/npm were not on the accessible PATH. Installed runtime directories were denied by the sandbox. A local-runtime download attempt was also blocked by socket permission error 10013. No approval override or deployment was attempted. These failures provide no evidence that application checks pass or fail.

9. Remaining issues

Required runtime checks and direct paper comparison remain outstanding, so regressions cannot yet be ruled out. The broader legacy test/E2E suites retain unrelated old Batch 1 assumptions and external-storage fixtures; no broad suite was run and no Batch 3 audit/test overhaul was started.

Email submission currently runs within the publication request/scheduler call. Large audiences can increase response latency. A process interruption after claiming delivery can leave `processing` status; there is deliberately no automatic retry because it could duplicate sends. Failure recovery requires explicit review. API acceptance does not guarantee inbox delivery. These limits must be assessed during local/staging verification.

10. Manual actions required

Provide the paper's location/content for authoritative comparison. Use an accessible Node 22.23+ runtime (the new test runner uses experimental module mocks) and disposable localhost PostgreSQL. Run the commands below in the indicated directories. They must never select a production database or real storage credentials.

Repository root, after setting `BATCH1_DATABASE_URL` to an isolated localhost test database whose name includes `test`:

```powershell
$env:BATCH1_DATABASE_URL = 'postgresql://LOCAL_TEST_USER@127.0.0.1:LOCAL_TEST_PORT/nova_batch2_test'
node --test server/tests/batch1/migrations.test.js server/tests/batch1/auth.test.js server/tests/batch1/announcements.test.js
node --experimental-test-module-mocks --test server/tests/batch2/email.test.js server/tests/batch2/integration.test.js
```

Web directory, with unused localhost backend addresses for compilation:

```powershell
$env:API_URL = 'http://127.0.0.1:59999'
$env:NEXT_PUBLIC_API_URL = 'http://127.0.0.1:59999'
$env:JWT_SECRET = 'local-validation-only'
npm run lint
npm run typecheck
npm run build
```

Repository root, after a current successful build, with the isolated database variable still set:

```powershell
node server/tests/batch2/browser.mjs
```

The harness creates and drops only fresh randomly named local test databases. Chrome must be available for the browser runner. The new migration has been written but not applied to production. Any future production migration/email activation requires separately approved work; retain mock mode for this batch.

11. Production email confirmation

No production email was sent. No Brevo API request was executed. Tests were authored with mocks/safe overrides and remained unexecuted due to runtime restrictions.

12. Deployment confirmation

No deployment occurred. No production database or B2 operation was performed. Historical announcements/gallery rows and B2 keys were not deleted. No Elementary, Preschool, separate Administrator accounts, or new Targeted Announcement terminology was introduced.

13. Approval readiness

Batch 2 is available for code review but is NOT ready for final approval. Required backend/browser/lint/typecheck/build checks and authoritative paper comparison remain outstanding. Batch 3 has not begun.
