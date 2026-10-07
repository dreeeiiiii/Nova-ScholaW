# Current backend contract

The revised capstone paper is authoritative. This document supersedes the [archived backend notes](docs/archive/BACKEND-pre-revision.md).

Express features live in `server/src/features`; shared configuration, middleware, database migrations and email transport live in `server/src/shared`.

| Feature | Permission / behavior |
| --- | --- |
| Public auth metadata and registration | Student @my.nst.edu.ph; Teacher @tr.nst.edu.ph; explicit department membership; no Administrator registration |
| Authentication / Account | Active accounts, bcrypt password verification, JWT/token-version validation; current password required for change |
| General Announcements | Administrator create/publish; school-wide dashboards and public homepage/TV |
| Department Announcements | Administrator create/publish for one College/SHS/JHS department; only applicable members view |
| Class Announcements | Teacher create/publish for Students/classes/sections; intended Students and owning Teacher workflow only |
| Department Management | Administrator account/section management and explicit department assignments; no inferred legacy assignments |
| Event Images | JPEG/PNG/WebP, fixed 10 MiB; member uploads pending, Administrator moderation/direct approved uploads |
| Categories | Public browsing, Administrator-only mutations |
| Audit Logs | Administrator-only listing/filtering; structured summaries without free text, credentials or signed URLs |
| Brevo | Backend only; new-publication ledger; active official recipients; deduplication; mock/test/live modes; safe failure audit |

Public feeds exclude Department/Class content and respect publication windows. All sensitive API permissions are enforced in Express regardless of frontend controls. Existing B2 keys/storage and historical records are retained. Password change invalidates existing tokens; account deactivation prevents authentication.

For environment settings, exact safe-test commands, migration commands and deployment steps see [README](README.md), [Batch 3 verification](docs/BATCH3.md) and [manual runbook](scripts/DEPLOY.md). The default backend test script runs only the explicitly selected disposable-database/mock suites.
