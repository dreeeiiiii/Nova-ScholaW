# Nova Schola Hub

School announcements + gallery platform for NST (**PERN stack**): role-based dashboards for
Admin / Teacher / Student, targeted class announcements, a public gallery with admin moderation,
a public TV slideshow display, and full audit logging.

## Tech stack

| Layer | Tech |
| ----- | ---- |
| Frontend | Next.js 16 + React 19 + Tailwind CSS 4, lucide-react, App Router |
| Backend | Node.js 18+ + Express 4, Multer uploads, `pg` (Neon PostgreSQL) |
| Auth | JWT (`jsonwebtoken`) + bcrypt, NST email-domain validation |
| Database | PostgreSQL (Neon) — 8 tables, see `DATABASE_SCHEMA.sql` |
| Deploy | Vercel (web) · Render / Railway (server) · Neon (DB) |

## Project structure

```
NovaScholaW/
├── web/               # Next.js frontend (port 3000)
│   └── app/
│       ├── (app)/     # Protected app routes (dashboard, announcements, gallery, admin/*)
│       ├── api/       # Route handlers proxying to backend
│       └── lib/       # auth, api, config
├── server/            # Express API (port 5000)
│   └── src/
│       ├── routes/    # auth, users, academic, announcements, gallery, categories, dashboard, audit-logs
│       ├── controllers/
│       ├── models/    # SQL data-access layer
│       ├── services/  # auditService, visibilityResolver, scheduler, mediaValidator
│       ├── middleware/# authenticate, requireRole, upload, rateLimiter, ...
│       ├── config/    # env, db (pg Pool), constants, multer
│       ├── db/migrate.js  # applies DATABASE_SCHEMA.sql
│       └── seed.js    # demo users + sections/courses
├── scripts/DEPLOY.md  # Vercel + Render + Neon deployment steps
├── DATABASE_SCHEMA.sql
└── TASKS.md           # 50-task build plan
```

## Prerequisites

- Node.js ≥ 18.8, npm
- A PostgreSQL database (Neon recommended) + connection string

## Setup

### Backend

```bash
cd server
npm install
cp .env.example .env   # then fill in DATABASE_URL, JWT_SECRET, CLIENT_ORIGIN, ...
npm run db:migrate     # applies DATABASE_SCHEMA.sql to DATABASE_URL
npm run db:seed        # creates demo accounts + sections/courses
npm run dev            # nodemon on http://localhost:5000
```

### Frontend

```bash
cd web
npm install
cp .env.example .env.local   # then fill in API_URL if needed (defaults to http://localhost:5000)
npm run dev            # Next.js on http://localhost:3000
```

Open http://localhost:3000/login.

### Environment variables

**Server** (`server/.env`, full list in `server/.env.example`):

| Var | Required | Default / example |
| --- | -------- | ----------------- |
| `PORT` | No | `5000` |
| `NODE_ENV` | No | `development` (`production` enforces all required vars) |
| `DATABASE_URL` | Yes (prod) | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | Yes (prod) | long random string |
| `JWT_EXPIRES_IN` | No | `8h` |
| `CLIENT_ORIGIN` | Yes (prod) | `http://localhost:3000` |
| `UPLOAD_DIR` | Yes (prod) | `uploads` |
| `NST_EMAIL_DOMAIN` | Yes (prod) | `my.nst.edu.ph` |
| `MAX_IMAGE_SIZE_MB` / `MAX_VIDEO_SIZE_MB` / `MAX_VIDEO_DURATION_SECONDS` | No | `10` / `50` / `120` |

**Web** (`web/.env.local`, see `web/.env.example`):

| Var | Required | Example |
| --- | -------- | ------- |
| `API_URL` | No | `http://localhost:5000` (server URL, defaults if unset) |

## Demo accounts (seeded)

| Role | Email | Password |
| ---- | ----- | -------- |
| Admin | `admin@my.nst.edu.ph` | `Admin@1234` |
| Teacher | `teacher@my.nst.edu.ph` | `Nova1234!` |
| Student | `student1@my.nst.edu.ph` | `Nova1234!` |

> **E2E fixtures:** Playwright tests use `b22test_*@my.nst.edu.ph` accounts (see `web/e2e/fixtures.ts`: `b22test_admin`, `b22test_teacher`, `b22test_student`, etc.).

## Migrations & seed

```bash
cd server
npm run db:migrate   # node src/db/migrate.js — applies DATABASE_SCHEMA.sql
npm run db:seed      # node src/seed.js — idempotent demo data
```

## Tests

```bash
cd server
npm test             # node --test, requires DATABASE_URL — 193 tests (21 suites)
cd web && npx playwright test  # 13 E2E tests
```

The suite covers auth, users/roles, announcements (incl. visibility + TV feed),
gallery upload/moderation/search, categories, audit logging + dashboard stats,
and schema/utils.

## Key routes

**Public (no login):** `GET /api/gallery`, `GET /api/gallery/search`, `GET /api/categories`,
`GET /api/announcements/tv`, `GET /api/health`, pages `/gallery`, `/tv`, `/login`.

**Auth:** `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`.

**Users (admin):** `GET/POST /api/users`, `PUT /api/users/:id`, `PATCH /api/users/:id/status`.

**Announcements:** `POST /api/announcements` (general + class w/ multi-target),
`GET /api/announcements` (visibility-filtered feed), `PUT/DELETE /:id`,
`PATCH /:id/status`, `GET /api/announcements/targets/options`.

**Gallery:** `POST /api/gallery` (multipart → `pending`), `GET /api/gallery/mine`,
`GET /api/gallery/moderation` + `PATCH /:id/approve` / `PATCH /:id/reject` (admin),
`DELETE /api/gallery/:id`.

**Admin:** `GET /api/audit-logs` (filters: `action`, `entity_type`, `user_id` + pagination),
`GET /api/dashboard/stats`.

## Deployment notes

Full checklist in [`scripts/DEPLOY.md`](scripts/DEPLOY.md). Summary:

- **Web → Vercel:** root `web`, build `npm run build` → `.next`, set `API_URL`.
- **Server → Render/Railway:** root `server`, build `npm install`, start `npm start`,
  health check `/api/health`, set all production env vars.
- **DB:** Neon (already configured) — no action needed.
- ⚠️ **Ephemeral disk:** Render free-tier disks wipe `UPLOAD_DIR` on redeploy, so
  uploaded files can 404 while DB rows survive. Attach a persistent disk or move to
  object storage for production (details in `scripts/DEPLOY.md`).
- Graceful shutdown (`SIGTERM`/`SIGINT` → drain → close pg pool) is wired in
  `server/src/server.js`.
