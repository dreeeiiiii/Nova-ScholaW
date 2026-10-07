# Nova Schola Hub

NST announcements and image-only Event Gallery. The revised capstone paper is authoritative; the final verification report is [Batch 3](docs/BATCH3.md). Historical plans in BACKEND.md, DEVELOPMENT_PLAN.md and TASKS.md are explicitly superseded.

| Layer | Implementation |
| --- | --- |
| Frontend | Next.js 16, React 19, Tailwind CSS 4; App Router and authenticated API proxies |
| Backend | Node.js, Express 4, PostgreSQL `pg`, bcrypt, JWT |
| Database | Neon PostgreSQL; additive, checksummed migrations |
| Email | Backend-only Brevo; mock by default, controlled test override, explicit live activation |
| Event storage | Existing private Backblaze B2 bucket; JPEG/PNG/WebP, 10 MiB maximum |
| Hosting | Vercel frontend, Render backend, Neon database |

One centralized Administrator manages College, Senior High School and Junior High School. Students register with @my.nst.edu.ph and Teachers with @tr.nst.edu.ph. There is no public Administrator registration; the authorized Administrator uses @nst.edu.ph.

General and Department Announcements are Administrator-only. Class Announcements are Teacher-only and target Students, classes or sections. Public homepage and TV show only published, unexpired General Announcements. Department and Class visibility and email recipients follow their audience.

Student/Teacher Event Image uploads await Administrator approval; Administrator direct uploads are approved. Only approved images enter the public gallery. Categories and Audit Logs are Administrator-only. All roles can change passwords using the current password; old tokens are invalidated.

## Local development

Use Node 22 (verified 22.14.0, npm 10.9.2). Install dependencies using `npm ci` in `server` and `web`. Configure private local files using `server/.env.example` and `web/.env.example`; never commit credentials. Backend runs with `npm run dev` in `server`; Next.js runs with `npm run dev` in `web`.

`npm run db:migrate` is a plan only. Use `npm run db:migrate -- --apply` only with an explicitly selected disposable/local database, or later with approved production authorization. The baseline SQL must not be applied directly to an existing database. No department guesses are made for historical users.

## Safe verification

The default backend `npm test` explicitly selects the current safe suites (Batch 1–3, role middleware, password/JWT utilities). Legacy shared-fixture/live-storage tests remain as historical references and are not claimed to pass.

Set `BATCH1_DATABASE_URL` to a localhost test database whose role can CREATE DATABASE. The harness creates and drops a unique disposable database for each suite; it never uses production DATABASE_URL for tests. Set EMAIL_MODE=mock, ANNOUNCEMENT_SCHEDULER_ENABLED=false, and fake B2 configuration for utility tests. Integration image tests replace B2; email tests inject a fake transport.

```powershell
Set-Location server
npm test
Set-Location ..
node server/tests/batch1/browser.mjs
node --experimental-test-module-mocks server/tests/batch2/browser.mjs
Set-Location web
npm run lint
npm run typecheck
npm run build
Set-Location ..
git diff --check
```

Browser tests require a current Next.js production build and locally installed Chrome. They run against localhost only with disposable databases and mock email/storage. Do not run older E2E suites against production.

## Manual production preparation

See [the deployment runbook](scripts/DEPLOY.md) for Render/Vercel variables, backup, schema preflight, migration order and commands, verification SQL, controlled Brevo test and rollback. Nothing deploys automatically. Preserve the existing B2 bucket and credentials. Do not run historical production demo seeds.
