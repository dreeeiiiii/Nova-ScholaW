# Nova Schola Hub — Coding Tasks (50)

Atomic coding tasks, ordered by priority: **foundation → users/roster → announcements → gallery → dashboards → polish**.

- Each task is small enough to finish in one working session.
- **Dependencies** list the task numbers that must be completed first.
- **Estimated time** is for a solo developer.
- File paths are relative to `server/` or `client/` (see folder structure in DEVELOPMENT_PLAN.md).

---

## Phase A — Foundation & Auth (Tasks 1–14)

### 1. Server project scaffold
- **Files:** `server/package.json`, `server/src/app.js`, `server/src/server.js`, `server/src/middleware/notFound.js`, `server/src/middleware/errorHandler.js`
- **Scope:** Express app with helmet, cors, `express.json()`, 404 + error handler, `POST /api/health` liveness stub; `npm run dev` via nodemon.
- **Dependencies:** none
- **Est. time:** 3h

### 2. Client project scaffold
- **Files:** `client/` (Vite React project), `client/vite.config.js`, `client/tailwind.config.js`, `client/postcss.config.js`, `client/src/main.jsx`, `client/src/App.jsx`, `client/src/index.css`
- **Scope:** Tailwind wired and verified (a colored placeholder renders); dev proxy to the server.
- **Dependencies:** none
- **Est. time:** 3h

### 3. Environment & shared config
- **Files:** `server/.env.example`, `server/src/config/env.js`, `server/src/config/constants.js`, `client/.env.example`
- **Scope:** Central env loading/validation (PORT, DATABASE_URL, JWT_SECRET, CLIENT_ORIGIN, UPLOAD_DIR, NST_EMAIL_DOMAIN); constants for roles, announcement statuses, media statuses, file rules.
- **Dependencies:** 1, 2
- **Est. time:** 1h

### 4. Database connection
- **Files:** `server/src/config/db.js`
- **Scope:** `pg` Pool from env; wire real DB check into `GET /api/health`.
- **Dependencies:** 3
- **Est. time:** 1.5h

### 5. Apply database schema
- **Files:** `DATABASE_SCHEMA.sql` (root, already written), `server/tests/helpers/db.js`
- **Scope:** Run the 8-table schema against a local dev DB; write a smoke check that all tables exist.
- **Dependencies:** 4
- **Est. time:** 1h

### 6. Seed script
- **Files:** `server/src/seed.js`
- **Scope:** Creates a default admin, sample sections/courses, and sample teacher + student accounts (bcrypt-hashed).
- **Dependencies:** 5
- **Est. time:** 2h

### 7. Data-access layer base + users model
- **Files:** `server/src/models/userModel.js`
- **Scope:** Reusable SQL helper; `findByEmail`, `findById`, `create`, `list` (pagination/search/filters) for users.
- **Dependencies:** 5
- **Est. time:** 3h

### 8. Auth utilities
- **Files:** `server/src/utils/jwt.js`, `server/src/utils/password.js`, `server/src/utils/nstEmail.js`
- **Scope:** JWT sign/verify, bcrypt hash/compare, NST email-domain validator (central constant).
- **Dependencies:** 3
- **Est. time:** 1.5h

### 9. Auth middleware
- **Files:** `server/src/middleware/authenticate.js`, `server/src/middleware/requireRole.js`
- **Scope:** `authenticate` (verifies JWT → `req.user`, rejects inactive users); `requireRole('admin', ...)` factory.
- **Dependencies:** 8
- **Est. time:** 1h

### 10. Login endpoint
- **Files:** `server/src/controllers/authController.js`, `server/src/routes/authRoutes.js`, `server/src/middleware/rateLimiter.js`
- **Scope:** `POST /api/auth/login` with rate limiting, email/password validation, JWT response, `last_login_at` update.
- **Dependencies:** 7, 8, 9
- **Est. time:** 2h

### 11. Me + logout endpoints
- **Files:** `server/src/controllers/authController.js`, `server/src/routes/authRoutes.js`
- **Scope:** `GET /api/auth/me` (profile + role/section/course), `POST /api/auth/logout` (stateless discard response).
- **Dependencies:** 10
- **Est. time:** 1.5h

### 12. Frontend API client
- **Files:** `client/src/api/client.js`, `client/src/api/auth.js`
- **Scope:** Axios instance with base URL, JWT header interceptor, 401 → logout, error normalization.
- **Dependencies:** 2
- **Est. time:** 2h

### 13. Login page + auth state
- **Files:** `client/src/pages/auth/LoginPage.jsx`, `client/src/components/auth/LoginForm.jsx`, `client/src/contexts/AuthContext.jsx`, `client/src/hooks/useAuth.js`
- **Scope:** Form with validation, token persistence, user state exposed app-wide, redirect after login.
- **Dependencies:** 12
- **Est. time:** 3h

### 14. Route guards + app shell
- **Files:** `client/src/components/layout/ProtectedRoute.jsx`, `client/src/App.jsx`, `client/src/components/layout/Navbar.jsx`
- **Scope:** Role-aware route protection, `/` redirect by role, minimal navbar shell.
- **Dependencies:** 13
- **Est. time:** 2h

---

## Phase B — Users & Reference Data (Tasks 15–22)

### 15. List users endpoint
- **Files:** `server/src/controllers/userController.js`, `server/src/routes/userRoutes.js`
- **Scope:** `GET /api/users` (Admin) with pagination, search, role/status/section/course filters.
- **Dependencies:** 7, 9
- **Est. time:** 3h

### 16. Create user endpoint
- **Files:** `server/src/controllers/userController.js`, `server/src/middleware/validate.js` (first zod schemas here)
- **Scope:** `POST /api/users` (Admin) — NST email validation, role + section/course assignment rules, temp password hashing, audit row.
- **Dependencies:** 15
- **Est. time:** 2.5h

### 17. Update user endpoint
- **Files:** `server/src/controllers/userController.js`
- **Scope:** `PUT /api/users/:id` — name/email/role/section/course updates with re-validation and audit record.
- **Dependencies:** 16
- **Est. time:** 2h

### 18. Activate / deactivate users
- **Files:** `server/src/controllers/userController.js`
- **Scope:** `PATCH /api/users/:id/status`; guard against deactivating the last active admin; audit row.
- **Dependencies:** 17
- **Est. time:** 1.5h

### 19. Sections CRUD
- **Files:** `server/src/models/sectionModel.js`, `server/src/controllers/sectionController.js`, `server/src/routes/sectionRoutes.js`
- **Scope:** Full CRUD (Admin); Teacher/Student read access for target pickers.
- **Dependencies:** 5, 9
- **Est. time:** 2.5h

### 20. Courses CRUD
- **Files:** `server/src/models/courseModel.js`, `server/src/controllers/courseController.js`, `server/src/routes/courseRoutes.js`
- **Scope:** Full CRUD (Admin); read access for pickers.
- **Dependencies:** 19
- **Est. time:** 2.5h

### 21. Users management UI
- **Files:** `client/src/pages/admin/UsersPage.jsx`, `client/src/components/admin/UserTable.jsx`, `client/src/components/admin/UserForm.jsx`, `client/src/api/users.js`
- **Scope:** Searchable table, create/edit modal, role + section/course dropdowns, activate/deactivate toggle, delete with confirm.
- **Dependencies:** 15, 16, 17, 18
- **Est. time:** 4h

### 22. Sections & courses management UI
- **Files:** `client/src/pages/admin/SectionsPage.jsx`, `client/src/pages/admin/CoursesPage.jsx`, `client/src/api/sections.js`, `client/src/api/courses.js`
- **Scope:** Admin CRUD tables for sections and courses; reusable `SectionSelect`/`CourseSelect` dropdown components for later pages.
- **Dependencies:** 19, 20, 21
- **Est. time:** 3h

---

## Phase C — Announcements (Tasks 23–34)

### 23. Announcement data layer
- **Files:** `server/src/models/announcementModel.js`, `server/src/models/announcementTargetModel.js`, `server/src/services/visibilityResolver.js`
- **Scope:** SQL for create/read/update/delete; targeting insert; the core resolver that, given a user id, returns visible announcement ids (general + matched targets).
- **Dependencies:** 7, 19, 20
- **Est. time:** 4h

### 24. Create general announcement
- **Files:** `server/src/controllers/announcementController.js`, `server/src/routes/announcementRoutes.js`, upload middleware reuse
- **Scope:** `POST /api/announcements` (Admin/Teacher) — general type, optional image upload, optional schedule (publish/expire), status default `draft`.
- **Dependencies:** 23
- **Est. time:** 3h

### 25. Create class announcement (multi-target)
- **Files:** `server/src/controllers/announcementController.js`, `server/src/services/announcementValidation.js`
- **Scope:** `POST /api/announcements` for `type='class'` — accept multiple targets from the three kinds, reject invalid/general-with-targets combos, write all target rows in one transaction.
- **Dependencies:** 23, 24
- **Est. time:** 3h

### 26. Targeting options endpoint
- **Files:** `server/src/controllers/announcementController.js`
- **Scope:** `GET /api/announcements/targets/options` (Admin/Teacher) — sections + courses + students payload for the multi-select picker.
- **Dependencies:** 19, 20, 25
- **Est. time:** 2h

### 27. Update announcement
- **Files:** `server/src/controllers/announcementController.js`
- **Scope:** `PUT /api/announcements/:id` (Author or Admin) — content/image/schedule and full target replacement; ownership check; audit row.
- **Dependencies:** 25
- **Est. time:** 2.5h

### 28. Delete announcement
- **Files:** `server/src/controllers/announcementController.js`
- **Scope:** `DELETE /api/announcements/:id` (Author or Admin) — cascade targets, remove attached image file, audit row.
- **Dependencies:** 27
- **Est. time:** 1.5h

### 29. Announcement feed endpoint
- **Files:** `server/src/controllers/announcementController.js`
- **Scope:** `GET /api/announcements` — published general + class announcements visible to the requesting user (via visibilityResolver), excludes expired.
- **Dependencies:** 25
- **Est. time:** 3h

### 30. Status lifecycle + scheduler
- **Files:** `server/src/controllers/announcementController.js`, `server/src/services/scheduler.js`
- **Scope:** `PATCH /api/announcements/:id/status` with valid transitions; background job auto-publishes `scheduled` and archives `expires_at`-passed announcements (runs on interval).
- **Dependencies:** 28
- **Est. time:** 3h

### 31. TV feed endpoint
- **Files:** `server/src/controllers/announcementController.js`
- **Scope:** `GET /api/announcements/tv` (Public) — currently-published general announcements ordered by publish date, with image URLs; never includes class announcements.
- **Dependencies:** 30
- **Est. time:** 2h

### 32. Announcements feed UI
- **Files:** `client/src/pages/announcements/FeedPage.jsx`, `client/src/components/announcements/AnnouncementCard.jsx`, `client/src/api/announcements.js`
- **Scope:** Feed page showing general + my targeted class announcements; card shows title, content, image, author, date, and a "Class" badge on targeted items.
- **Dependencies:** 29
- **Est. time:** 3h

### 33. Announcement form UI (with multi-select targets)
- **Files:** `client/src/pages/announcements/FormPage.jsx`, `client/src/components/announcements/AnnouncementForm.jsx`, `client/src/components/announcements/TargetSelector.jsx`
- **Scope:** Type toggle (general/class), schedule date fields, image picker, and the multi-select audience picker (sections + courses + students) fed by the options endpoint.
- **Dependencies:** 26, 32
- **Est. time:** 4h

### 34. Announcement management UI
- **Files:** `client/src/pages/announcements/ManagePage.jsx`, `client/src/components/announcements/ManageTable.jsx`
- **Scope:** List of the author's announcements (incl. drafts/scheduled) with edit, delete, and status-action buttons (publish/schedule/archive).
- **Dependencies:** 33
- **Est. time:** 3h

---

## Phase D — Gallery (Tasks 35–46)

### 35. Storage module (Multer)
- **Files:** `server/src/config/multer.js`, `server/src/middleware/upload.js`, `server/src/app.js` (static route), `server/uploads/images/.gitkeep`, `server/uploads/videos/.gitkeep`
- **Scope:** Disk storage keyed by media type with timestamped filenames; Multer size limits; Express static serving for `/uploads`.
- **Dependencies:** 1
- **Est. time:** 2h

### 36. Media validation
- **Files:** `server/src/services/mediaValidator.js`
- **Scope:** Whitelists (JPEG/PNG/WebP ≤10MB; MP4 ≤50MB); videos additionally capped at **2 minutes** (ffprobe/ffprobe-static) — the source of truth for duration.
- **Dependencies:** 35
- **Est. time:** 3h

### 37. Categories CRUD
- **Files:** `server/src/models/categoryModel.js`, `server/src/controllers/categoryController.js`, `server/src/routes/categoryRoutes.js`
- **Scope:** Admin CRUD; public read for gallery filters; guard: deleting a category leaves media intact (SET NULL).
- **Dependencies:** 5, 9
- **Est. time:** 2h

### 38. Upload media endpoint
- **Files:** `server/src/controllers/galleryController.js`, `server/src/routes/galleryRoutes.js`
- **Scope:** `POST /api/gallery` (Student/Teacher) — multipart image/video, category + caption, runs media validation, stores file, creates row as `pending`, audit row.
- **Dependencies:** 35, 36, 37
- **Est. time:** 3h

### 39. Public gallery endpoint
- **Files:** `server/src/controllers/galleryController.js`
- **Scope:** `GET /api/gallery` (Public) — approved only, filters for category, year, date range, and text search; pagination.
- **Dependencies:** 38
- **Est. time:** 3h

### 40. My uploads endpoint
- **Files:** `server/src/controllers/galleryController.js`
- **Scope:** `GET /api/gallery/mine` (Student/Teacher) — the user's uploads with their statuses.
- **Dependencies:** 38
- **Est. time:** 1.5h

### 41. Moderation flow
- **Files:** `server/src/controllers/galleryController.js`
- **Scope:** `GET /api/gallery/moderation` (Admin, pending queue + history with filters); `PATCH /:id/approve`; `PATCH /:id/reject` (required reason); both write audit rows + reviewed_by/at.
- **Dependencies:** 38, 39
- **Est. time:** 3h

### 42. Delete media
- **Files:** `server/src/controllers/galleryController.js`
- **Scope:** `DELETE /api/gallery/:id` (Uploader or Admin) — ownership check, delete DB row + file on disk, audit row.
- **Dependencies:** 41
- **Est. time:** 1.5h

### 43. Gallery UI (public)
- **Files:** `client/src/pages/gallery/GalleryPage.jsx`, `client/src/components/gallery/GalleryGrid.jsx`, `client/src/components/gallery/MediaCard.jsx`, `client/src/components/gallery/MediaLightbox.jsx`, `client/src/api/gallery.js`
- **Scope:** Responsive grid of approved media with lightbox (image view + inline video player), category/year/date filters + search + pagination.
- **Dependencies:** 39
- **Est. time:** 4h

### 44. Upload UI
- **Files:** `client/src/pages/gallery/UploadPage.jsx`, `client/src/components/gallery/UploadForm.jsx`
- **Scope:** Drag/drop or picker with **client-side** MIME/size/duration pre-checks matching server rules; category picker; success screen noting "pending approval".
- **Dependencies:** 38, 43, 37
- **Est. time:** 3h

### 45. Categories & moderation UI
- **Files:** `client/src/pages/admin/CategoriesPage.jsx`, `client/src/components/admin/CategoryManager.jsx`, `client/src/pages/admin/ModerationPage.jsx`, `client/src/components/admin/ModerationQueue.jsx`, `client/src/components/admin/ReviewModal.jsx`
- **Scope:** Admin category CRUD UI; moderation queue with inline previews and approve/reject (reason required) modal.
- **Dependencies:** 41, 37, 44
- **Est. time:** 4h

### 46. My uploads UI
- **Files:** `client/src/pages/gallery/MyUploadsPage.jsx`
- **Scope:** Grid of my uploads with status badges (pending/approved/rejected + reason), delete action, link to upload more.
- **Dependencies:** 40, 44
- **Est. time:** 2h

---

## Phase E — Dashboards, Audit & Polish (Tasks 47–50)

### 47. Audit service + wiring
- **Files:** `server/src/services/auditService.js`, all mutation controllers
- **Scope:** `writeAuditLog({ user, action, entityType, entityId, details, ip })` helper; call it from user, announcement, gallery, and category mutations (making task 16/24/38/41 auditors complete).
- **Dependencies:** 9, 28, 41, 16, 38
- **Est. time:** 3h

### 48. Audit logs endpoint + page
- **Files:** `server/src/controllers/auditLogController.js`, `server/src/routes/auditLogRoutes.js`, `client/src/pages/admin/AuditLogsPage.jsx`, `client/src/components/admin/AuditLogTable.jsx`, `client/src/api/audit.js`
- **Scope:** `GET /api/audit-logs` (filter user/action/entity/date + pagination) and `/export` CSV; admin page displaying them.
- **Dependencies:** 47
- **Est. time:** 3h

### 49. Role-based dashboards + settings
- **Files:** `client/src/pages/dashboard/AdminDashboard.jsx`, `TeacherDashboard.jsx`, `StudentDashboard.jsx`, `client/src/pages/SettingsPage.jsx`, `client/src/api/...` (stats endpoints reused where possible)
- **Scope:** Admin: summary widgets (pending media, total users, recent activity, latest uploads). Teacher: announcements quick-post + my media status. Student: targeted announcement feed + my uploads status. Settings: change-password form (`PUT /auth/change-password`).
- **Dependencies:** 32, 44, 46, 48
- **Est. time:** 4h

### 50. Polish & deployment prep
- **Files:** README (setup/run/deploy), seed-demo refresh, responsive pass across pages, any QA fixes
- **Scope:** Run full lint/typecheck/test suites; fix issues found in a self- QA pass; responsive fixes; populate stable demo content; verify the Vercel + Render deploy checklist from DEVELOPMENT_PLAN.md; rehearse the capstone demo path for each role.
- **Dependencies:** 49
- **Est. time:** 6h

---

## Appendix — Task map by phase

| Phase | Tasks  | Theme                          |
| ----- | ------ | ------------------------------ |
| A     | 1–14   | Foundation, database, auth     |
| B     | 15–22  | Users, sections, courses       |
| C     | 23–34  | Announcements                  |
| D     | 35–46  | Gallery & moderation           |
| E     | 47–50  | Dashboards, audit, polish      |