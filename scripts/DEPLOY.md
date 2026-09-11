# Nova Schola Hub — Deployment Guide

Target topology: **Vercel** (client) + **Render** (server, or Railway) + **Neon** (PostgreSQL, already configured).

## 1. Environment variables

### Server (Render → Environment tab)

| Var | Required | Example |
| --- | -------- | ------- |
| `PORT` | No (Render injects) | `5000` |
| `NODE_ENV` | Yes → `production` | `production` |
| `DATABASE_URL` | Yes | `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require` |
| `JWT_SECRET` | Yes | long random string |
| `JWT_EXPIRES_IN` | No | `8h` |
| `CLIENT_ORIGIN` | Yes | `https://novaschola.vercel.app` |
| `UPLOAD_DIR` | Yes | `uploads` |
| `NST_EMAIL_DOMAIN` | Yes | `my.nst.edu.ph` |
| `MAX_IMAGE_SIZE_MB` | No | `10` |
| `MAX_VIDEO_SIZE_MB` | No | `50` |
| `MAX_VIDEO_DURATION_SECONDS` | No | `120` |

See `server/.env.example` for the full list.

### Client (Vercel → Environment Variables)

| Var | Required | Example |
| --- | -------- | ------- |
| `VITE_API_URL` | Yes | `https://novaschola-api.onrender.com/api` |

See `client/.env.example`. If unset, the client falls back to `/api` (Vite dev proxy) — correct for local dev only.

## 2. Deploy steps

### Database (Neon — already configured)

No migration needed for existing data. For a fresh DB:

```bash
cd server
npm install
npm run db:migrate
npm run db:seed
```

### Backend → Render (or Railway)

1. New **Web Service** from this repo, root directory `server`.
2. Build command: `npm install`
3. Start command: `npm start`
4. Set env vars from the table above.
5. Health check path: `/api/health` (returns `{ status: 'ok', database: 'connected', ... }`).
6. Deploy. Verify `GET /api/health` returns `"database": "connected"`.

### Frontend → Vercel

1. New project from this repo, root directory `client`.
2. Framework preset: **Vite**. Build command: `npm run build`. Output dir: `dist`.
3. Set `VITE_API_URL` to the Render backend URL + `/api`.
4. Deploy. Verify `/login` loads and public `/gallery` shows approved media.

## 3. ⚠️ Ephemeral disk warning (uploads)

Render (and Railway) free-tier disks are **ephemeral**: files under `UPLOAD_DIR`
(`server/uploads/...`) are **wiped on every redeploy/restart**. The DB rows in
`gallery_media` survive (Neon), but the files they point to will 404.

Options:

- **Capstone/demo (current):** acceptable — re-upload demo media after redeploys.
- **Production:** attach a Render Persistent Disk mounted at `UPLOAD_DIR`, or
  migrate uploads to object storage (S3/R2/Supabase Storage) and store the
  public URL in `gallery_media.file_url`.

## 4. Post-deploy smoke test

1. `GET /api/health` → `status: ok`, `database: connected`.
2. Login as admin → dashboard stats load.
3. Public `/gallery` (no login) → approved media only.
4. Public `/tv` (no login) → slideshow rotates every 10s.
5. Upload as student → `pending` in My Uploads → approve as admin → visible in public gallery.
