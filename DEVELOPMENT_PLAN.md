# Nova Schola Hub — Development Plan

**Project:** Nova Schola Hub — Web-based digital bulletin board and event gallery system
**Client:** Nova Schola Tanauan
**Status:** Planning Phase (v1.0)

---

## 1. Project Overview

Nova Schola Hub is a web platform that replaces physical bulletin boards and photo-print walls with a single digital system for announcements and event media.

- **General Announcements** — public notices shown on the website slideshow and hallway TV screens. Posted by Admins and Teachers. Supports image attachments and scheduled publishing/expiry.
- **Class Announcements** — private notices targeted at specific sections, courses, or individual students. Teachers multi-select any combination of audiences at once. Visible **only on the dashboards** of the targeted users — never on TV screens.
- **Moderated Event Gallery** — students and teachers upload photos and videos. Admins approve or reject items before they become public. Admin-managed categories, plus date/year filtering and search.
- **Role-based dashboards** — Admin (full control, user management, moderation, audit logs), Teacher (post announcements, upload media), Student (view targeted announcements, upload media awaiting approval).
- **Account management** — all accounts are created manually by an Admin using NST email addresses only (no self-signup, no social login).
- **Audit logs** — automatic recording of announcements, uploads, approvals, and rejections.

### Technical Stack

| Layer          | Technology                                   |
| -------------- | -------------------------------------------- |
| Frontend       | React.js (Vite) + Tailwind CSS + Axios       |
| Backend        | Node.js + Express.js                         |
| Database       | PostgreSQL (via `pg`)                        |
| Auth           | JWT (access token) + bcrypt password hashing |
| File uploads   | Multer (local server disk)                   |
| HTTP client    | Axios                                        |
| Validation     | zod (request payload validation)             |
| Security       | helmet, cors, express-rate-limit             |

---

## 2. Database Schema Plan

**Note on table count:** the original spec listed 6 tables. After planning the class-announcement targeting feature, `sections` and `courses` reference tables were added **so targeting has real foreign keys and referential integrity**. Total: **8 tables**. The full DDL lives in `DATABASE_SCHEMA.sql`.

### 2.1 Table Relationships (overview)

```
sections ──< users.section_id >── users ──< announcements.author_id >── announcements
courses  ──< users.course_id  >──  |     |      |            ^
                                  |     |      |            | (type='class')
                                  |     |      v            |
                                  |     |   announcement_targets ──< section_id ──> sections
                                  |     |                          < course_id  ──> courses
                                  |     |                          < student_id ──> users
                                  |     | < categories.created_by      |
                                  |     v                            v
                                  |   categories < gallery_media.category_id > gallery_media
                                  |                                                 |
                                  |                                                 | uploader_id / reviewed_by
                                  |                                                 v
                                  +───────────────────< users >─────────────────────+
                                        (single user table; roles distinguish behavior)

audit_logs.user_id ──> users.id  (every user action is logged)
```

### 2.2 Tables, Columns, Types, and Relationships

#### 2.2.1 `sections`
| Column       | Type           | Constraints                                  |
| ------------ | -------------- | -------------------------------------------- |
| id           | BIGSERIAL      | PK                                            |
| name         | VARCHAR(100)   | NOT NULL, UNIQUE (e.g. "Grade 10 - A")       |
| grade_level  | VARCHAR(20)    | NOT NULL (e.g. "Grade 10")                   |
| created_at   | TIMESTAMPTZ    | NOT NULL, DEFAULT NOW()                      |
| updated_at   | TIMESTAMPTZ    | NOT NULL, DEFAULT NOW()                      |

#### 2.2.2 `courses`
| Column      | Type           | Constraints                                  |
| ----------- | -------------- | -------------------------------------------- |
| id          | BIGSERIAL      | PK                                            |
| name        | VARCHAR(150)   | NOT NULL, UNIQUE (e.g. "STEM")               |
| code        | VARCHAR(30)    | NOT NULL, UNIQUE (e.g. "STEM12")             |
| description | TEXT           | NULL                                         |
| created_at  | TIMESTAMPTZ    | NOT NULL, DEFAULT NOW()                      |
| updated_at  | TIMESTAMPTZ    | NOT NULL, DEFAULT NOW()                      |

#### 2.2.3 `users`
| Column        | Type           | Constraints                                             |
| ------------- | -------------- | ------------------------------------------------------- |
| id            | BIGSERIAL      | PK                                                       |
| email         | VARCHAR(255)   | NOT NULL, UNIQUE — NST address only (app-level + CHECK for basic format; exact domain to be locked in app config) |
| password_hash | VARCHAR(255)   | NOT NULL, bcrypt                                         |
| full_name     | VARCHAR(150)   | NOT NULL                                                 |
| role          | VARCHAR(20)    | NOT NULL, CHECK IN (`admin`, `teacher`, `student`)      |
| section_id    | BIGINT         | FK → sections.id, ON DELETE SET NULL (students)          |
| course_id     | BIGINT         | FK → courses.id, ON DELETE SET NULL (students)           |
| is_active     | BOOLEAN        | NOT NULL, DEFAULT TRUE (admin can deactivate)            |
| last_login_at | TIMESTAMPTZ    | NULL                                                     |
| created_at    | TIMESTAMPTZ    | NOT NULL, DEFAULT NOW()                                  |
| updated_at    | TIMESTAMPTZ    | NOT NULL, DEFAULT NOW()                                  |

**Indexes:** `role`, `section_id`, `course_id` (email has a UNIQUE index).

#### 2.2.4 `announcements`
| Column     | Type         | Constraints                                                      |
| ---------- | ------------ | ---------------------------------------------------------------- |
| id         | BIGSERIAL    | PK                                                                |
| author_id  | BIGINT       | NOT NULL, FK → users.id, ON DELETE CASCADE                       |
| type       | VARCHAR(10)  | NOT NULL, CHECK IN (`general`, `class`)                          |
| title      | VARCHAR(255) | NOT NULL                                                          |
| content    | TEXT         | NOT NULL                                                          |
| image_url  | VARCHAR(500) | NULL (optional image attachment)                                 |
| status     | VARCHAR(20)  | NOT NULL, DEFAULT `draft`, CHECK IN (`draft`, `scheduled`, `published`, `archived`) |
| publish_at | TIMESTAMPTZ  | NULL — set when scheduled                                         |
| expires_at | TIMESTAMPTZ  | NULL — auto-hide after this                                       |
| created_at | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                           |
| updated_at | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                           |

**Constraints/check:** `publish_at <= expires_at` when both present.
**Indexes:** `status`, `publish_at`, `expires_at`, `type`, `author_id`.

#### 2.2.5 `announcement_targets`
| Column          | Type        | Constraints                                                       |
| --------------- | ----------- | ----------------------------------------------------------------- |
| id              | BIGSERIAL   | PK                                                                |
| announcement_id | BIGINT      | NOT NULL, FK → announcements.id, ON DELETE CASCADE               |
| target_type     | VARCHAR(10) | NOT NULL, CHECK IN (`section`, `course`, `student`)              |
| section_id      | BIGINT      | FK → sections.id, ON DELETE CASCADE (NULL unless target_type = section) |
| course_id       | BIGINT      | FK → courses.id, ON DELETE CASCADE (NULL unless target_type = course)  |
| student_id      | BIGINT      | FK → users.id, ON DELETE CASCADE (NULL unless target_type = student)   |
| created_at      | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                            |

**CHECK — exactly one target populated** per row, matching `target_type`.
**Business rule (enforced in app code):** only `type = 'class'` announcements may have target rows, and they must have ≥ 1 target. General announcements never have targets.
**Indexes:** `announcement_id`, `section_id`, `course_id`, `student_id`.

#### 2.2.6 `categories`
| Column      | Type         | Constraints                                  |
| ----------- | ------------ | -------------------------------------------- |
| id          | BIGSERIAL    | PK                                            |
| name        | VARCHAR(100) | NOT NULL, UNIQUE                              |
| description | TEXT         | NULL                                          |
| created_by  | BIGINT       | FK → users.id, ON DELETE SET NULL (admin)     |
| created_at  | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                       |
| updated_at  | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                       |

#### 2.2.7 `gallery_media`
| Column             | Type         | Constraints                                                      |
| ------------------ | ------------ | ---------------------------------------------------------------- |
| id                 | BIGSERIAL    | PK                                                                |
| uploader_id        | BIGINT       | NOT NULL, FK → users.id, ON DELETE CASCADE                      |
| category_id        | BIGINT       | FK → categories.id, ON DELETE SET NULL (media keeps on category delete) |
| media_type         | VARCHAR(10)  | NOT NULL, CHECK IN (`image`, `video`)                            |
| file_url           | VARCHAR(500) | NOT NULL                                                          |
| original_filename  | VARCHAR(255) | NOT NULL                                                          |
| caption            | TEXT         | NULL                                                              |
| duration_seconds   | INTEGER      | NULL, CHECK > 0 — set for videos only                             |
| status             | VARCHAR(10)  | NOT NULL, DEFAULT `pending`, CHECK IN (`pending`, `approved`, `rejected`) |
| reviewed_by        | BIGINT       | FK → users.id, ON DELETE SET NULL (admin who reviewed)            |
| reviewed_at        | TIMESTAMPTZ  | NULL                                                              |
| rejection_reason   | TEXT         | NULL (required when status = rejected, enforced app-side)         |
| created_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                           |
| updated_at         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                           |

**Indexes:** `status`, composite (`status`, `created_at DESC`) for queued browsing, `category_id`, `uploader_id`, `created_at DESC`.

#### 2.2.8 `audit_logs`
| Column      | Type         | Constraints                                                     |
| ----------- | ------------ | --------------------------------------------------------------- |
| id          | BIGSERIAL    | PK                                                               |
| user_id     | BIGINT       | FK → users.id, ON DELETE SET NULL (NULL = system/background)     |
| action      | VARCHAR(100) | NOT NULL (e.g. `announcement.create`, `gallery.approve`)         |
| entity_type | VARCHAR(50)  | NOT NULL (e.g. `announcement`, `gallery_media`, `user`)          |
| entity_id   | BIGINT       | NULL — id of the affected row                                    |
| details     | JSONB        | NULL — change summary, before/after snapshots                    |
| ip_address  | INET         | NULL                                                             |
| created_at  | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                                          |

**Indexes:** `user_id`, `created_at DESC`, composite (`entity_type`, `entity_id`), `action`.

### 2.3 File-upload limits (business rules)

| Kind   | Allowed types        | Max size | Extra rules               |
| ------ | -------------------- | -------- | ------------------------- |
| Image  | JPEG, PNG, WebP      | 10 MB    | —                         |
| Video  | MP4                  | 50 MB    | Max duration 2 minutes    |

Video duration is validated server-side (e.g. `ffprobe`) at upload time.

---

## 3. API Endpoint List

Base URL: `/api`. All endpoints returning lists support pagination (`page`, `limit`). Auth values: **Public** = no token, **Auth** = valid JWT, **Role** = JWT + matching role (Admin has all teacher/student capabilities). `Author or Admin` = the request user owns the resource, or is an Admin.

### 3.1 Auth
| Method | Path                          | Auth     | Role         | Description                                  |
| ------ | ----------------------------- | -------- | ------------ | -------------------------------------------- |
| POST   | `/api/auth/login`             | Public   | —            | Login with NST email + password → JWT        |
| GET    | `/api/auth/me`                | Auth     | All          | Current user profile + dashboard context     |
| PUT    | `/api/auth/change-password`   | Auth     | All          | Change own password                          |
| POST   | `/api/auth/logout`            | Auth     | All          | Client-side token discard (stateless)        |

### 3.2 Users (Admin only)
| Method | Path                        | Auth     | Role  | Description                                     |
| ------ | --------------------------- | -------- | ----- | ----------------------------------------------- |
| GET    | `/api/users`                | Auth     | Admin | List users; filters: role, status, search, section, course |
| POST   | `/api/users`                | Auth     | Admin | Create account (NST email enforced)             |
| GET    | `/api/users/:id`            | Auth     | Admin | User detail                                     |
| PUT    | `/api/users/:id`            | Auth     | Admin | Update user (name, role, section, course, email) |
| PATCH  | `/api/users/:id/status`     | Auth     | Admin | Activate / deactivate account                   |
| DELETE | `/api/users/:id`            | Auth     | Admin | Delete user (soft-guard: skip if owns content)  |
| POST   | `/api/users/:id/reset-password` | Auth  | Admin | Reset password to a generated temporary one    |

### 3.3 Sections & Courses (Admin manages; Teacher may read for targeting)
| Method | Path                          | Auth  | Role           | Description                  |
| ------ | ----------------------------- | ----- | -------------- | ---------------------------- |
| GET    | `/api/sections`               | Auth  | Admin, Teacher | List sections                |
| POST   | `/api/sections`               | Auth  | Admin          | Create section               |
| PUT    | `/api/sections/:id`           | Auth  | Admin          | Update section               |
| DELETE | `/api/sections/:id`           | Auth  | Admin          | Delete section (unassign users) |
| GET    | `/api/courses`                | Auth  | Admin, Teacher | List courses                |
| POST   | `/api/courses`                | Auth  | Admin          | Create course                |
| PUT    | `/api/courses/:id`            | Auth  | Admin          | Update course                |
| DELETE | `/api/courses/:id`            | Auth  | Admin          | Delete course (unassign users) |

### 3.4 Announcements
| Method | Path                                | Auth  | Role                  | Description                                        |
| ------ | ----------------------------------- | ----- | --------------------- | -------------------------------------------------- |
| GET    | `/api/announcements`                | Auth  | All                   | Feed: published general + targeted class announcements for current user (dashboard) |
| GET    | `/api/announcements/manage`         | Auth  | Admin, Teacher        | All of author's announcements (incl. drafts/scheduled) w/ targets |
| GET    | `/api/announcements/tv`             | Public| —                     | TV/Digital-signage feed: published general announcements (with images), schedule-aware |
| POST   | `/api/announcements`                | Auth  | Admin, Teacher        | Create announcement (general or class w/ multi-select targets, optional image, optional schedule) |
| GET    | `/api/announcements/:id`            | Auth  | All                   | Detail (class announcements only to author, admin, or targeted users) |
| PUT    | `/api/announcements/:id`            | Auth  | Author or Admin       | Update content/image/targets/schedule              |
| DELETE | `/api/announcements/:id`            | Auth  | Author or Admin       | Delete announcement (targets cascade)              |
| PATCH  | `/api/announcements/:id/status`     | Auth  | Author or Admin       | Transition status: draft → scheduled → published → archived |
| GET    | `/api/announcements/targets/options`| Auth  | Admin, Teacher        | Combined selector data (sections + courses + students) for target picker |

### 3.5 Gallery (Moderated)
| Method | Path                              | Auth   | Role                | Description                                    |
| ------ | --------------------------------- | ------ | ------------------- | ---------------------------------------------- |
| GET    | `/api/gallery`                    | Public | —                   | Approved media; filters: category, year, date range, `q` search; pagination |
| GET    | `/api/gallery/mine`               | Auth   | Student, Teacher    | Current user's uploads + their statuses        |
| GET    | `/api/gallery/moderation`         | Auth   | Admin               | Pending queue (also rejected/approved history w/ filters) |
| POST   | `/api/gallery`                    | Auth   | Student, Teacher    | Upload media (multipart) → status `pending`    |
| GET    | `/api/gallery/:id`                | Public | —                   | Media detail (approved only publicly)          |
| DELETE | `/api/gallery/:id`                | Auth   | Uploader or Admin   | Delete media + file                            |
| PATCH  | `/api/gallery/:id/approve`        | Auth   | Admin               | Approve (status → approved)                    |
| PATCH  | `/api/gallery/:id/reject`         | Auth   | Admin               | Reject with required `reason`                  |

### 3.6 Categories
| Method | Path                    | Auth  | Role  | Description                                      |
| ------ | ----------------------- | ----- | ----- | ------------------------------------------------ |
| GET    | `/api/categories`       | Public| —     | List categories                                  |
| POST   | `/api/categories`       | Auth  | Admin | Create category                                  |
| PUT    | `/api/categories/:id`   | Auth  | Admin | Rename / update category                         |
| DELETE | `/api/categories/:id`   | Auth  | Admin | Delete (media keep existing category ref → SET NULL) |

### 3.7 Audit Logs
| Method | Path                         | Auth  | Role  | Description                              |
| ------ | ---------------------------- | ----- | ----- | ---------------------------------------- |
| GET    | `/api/audit-logs`            | Auth  | Admin | List logs; filters: user, action, entity, date range; pagination |
| GET    | `/api/audit-logs/export`     | Auth  | Admin | Download logs as CSV                    |

### 3.8 System
| Method | Path          | Auth   | Role | Description                       |
| ------ | ------------- | ------ | ---- | --------------------------------- |
| GET    | `/api/health` | Public | —    | Liveness check (also pings DB)    |

---

## 4. Frontend Pages & Components

### 4.1 Pages / Routes

| Page                    | Route                          | Backend endpoints used                                   | Roles |
| ----------------------- | ------------------------------ | -------------------------------------------------------- | ----- |
| Login                   | `/login`                       | `POST /auth/login`, `GET /auth/me`                       | All   |
| Dashboard (role-based)  | `/dashboard`                   | `GET /announcements`, `GET /auth/me`; Admin: stats + moderation counts; Teacher does not see gallery management | All |
| Announcements feed      | `/announcements`               | `GET /announcements`, `GET /announcements/:id`            | Ion   |
| Announcement form       | `/announcements/new`           | `POST /announcements`, `GET /announcements/targets/options` | Admin, Teacher |
| Announcement detail     | `/announcements/:id`           | `GET /announcements/:id`                                  | All   |
| Manage announcements    | `/announcements/manage`        | `GET /announcements/manage`, PUT/DELETE/PATCH endpoints   | Admin, Teacher |
| Gallery                 | `/gallery`                     | `GET /gallery`, `GET /categories`, `/gallery/:id`         | Public |
| Upload media            | `/gallery/upload`              | `POST /gallery`, `GET /categories`                        | Student, Teacher |
| My uploads              | `/gallery/mine`                | `GET /gallery/mine`, `DELETE /gallery/:id`                | Student, Teacher |
| Moderation queue        | `/admin/moderation`            | `GET /gallery/moderation`, approve/reject                 | Admin |
| Manage users            | `/admin/users`                 | `GET /users`, POST/PUT/PATCH/DELETE                       | Admin |
| Manage sections         | `/admin/sections`              | sections CRUD                                             | Admin |
| Manage courses          | `/admin/courses`               | courses CRUD                                              | Admin |
| Manage categories       | `/admin/categories`            | categories CRUD                                           | Admin |
| Audit logs              | `/admin/audit-logs`            | `GET /audit-logs`, `/audit-logs/export`                   | Admin |
| Settings                | `/settings`                    | `PUT /auth/change-password`                               | All   |
| TV slideshow            | `/tv`                          | `GET /announcements/tv` (public)                          | Public (on lobby/TV screens) |

### 4.2 Key Components

**Layout**
- `ProtectedRoute` (role guard), `Navbar`, `Sidebar` (menu varies by role), `Footer`, `PageHeader`, `Spinner`, `EmptyState`, `ErrorBoundary`.

**Common UI**
- `Button`, `Input`, `Textarea`, `Select`, `Modal`, `ConfirmDialog`, `Pagination`, `Badge` (status pills), `Toast` (notifications), `SearchInput`, `DatePicker`.

**Auth**
- `LoginForm`, `AuthContext` (JWT storage + user state), `PasswordChangeForm`.

**Announcements**
- `AnnouncementCard` (feed item, shows target badge for class), `AnnouncementForm` (type toggle, schedule fields, image picker), `TargetSelector` (multi-select: sections ∨ courses ∨ students — auto-syncs with `GET /announcements/targets/options`), `ManageTable`, `StatusBadge`.

**Gallery**
- `GalleryGrid`, `MediaCard`, `MediaLightbox` (image/video viewer), `FilterBar` (category + year + date range + search), `UploadForm` (client-side MIME/size pre-check), `ModerationQueue`, `ReviewModal` (approve/reject w/ reason), `CategoryManager`.

**Admin**
- `UserTable`, `UserForm` (role, section, course, email), `AuditLogTable` (filterable), `SectionForm`, `CourseForm`.

---

## 5. Folder Structure

### 5.1 `server/`

```
server/
├── .env.example
├── package.json
├── uploads/                    # local disk storage (Multer)
│   ├── images/
│   └── videos/
├── tests/                      # Vitest + Supertest
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── helpers/
└── src/
    ├── app.js                  # Express app assembly
    ├── server.js               # entrypoint, listens on PORT
    ├── config/
    │   ├── env.js              # env validation/loading
    │   ├── db.js               # pg Pool
    │   ├── multer.js           # storage config + limits
    │   └── constants.js        # roles, statuses, file rules
    ├── middleware/
    │   ├── authenticate.js     # JWT verify → req.user
    │   ├── requireRole.js      # role guard factory
    │   ├── validate.js         # zod schema validator
    │   ├── upload.js           # multer middleware wrappers
    │   ├── rateLimiter.js      # login + global rate limits
    │   ├── notFound.js
    │   └── errorHandler.js
    ├── models/                 # SQL data-access layer (raw pg queries)
    │   ├── userModel.js
    │   ├── sectionModel.js
    │   ├── courseModel.js
    │   ├── announcementModel.js
    │   ├── announcementTargetModel.js
    │   ├── galleryModel.js
    │   ├── categoryModel.js
    │   └── auditLogModel.js
    ├── controllers/
    │   ├── authController.js
    │   ├── userController.js
    │   ├── sectionController.js
    │   ├── courseController.js
    │   ├── announcementController.js
    │   ├── galleryController.js
    │   ├── categoryController.js
    │   └── auditLogController.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── userRoutes.js
    │   ├── sectionRoutes.js
    │   ├── courseRoutes.js
    │   ├── announcementRoutes.js
    │   ├── galleryRoutes.js
    │   ├── categoryRoutes.js
    │   └── auditLogRoutes.js
    ├── services/
    │   ├── auditService.js    # writeAuditLog() helper used everywhere
    │   ├── scheduler.js       # scheduled publish/expire job (node-cron / interval)
    │   └── mediaValidator.js  # image/video validation incl. ffprobe duration
    └── utils/
        ├── jwt.js
        ├── password.js        # bcrypt hash/compare
        ├── nstEmail.js        # NST address validator
        ├── asyncHandler.js
        └── apiResponse.js
```

### 5.2 `client/`

```
client/
├── .env.example               # VITE_API_BASE_URL
├── index.html
├── package.json
├── vite.config.js             # dev proxy → server
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx
    ├── App.jsx                # router + providers
    ├── index.css
    ├── api/                   # Axios wrappers
    │   ├── client.js          # axios instance + interceptor (JWT, 401 handling)
    │   ├── auth.js
    │   ├── announcements.js
    │   ├── gallery.js
    │   ├── categories.js
    │   ├── users.js
    │   ├── sections.js
    │   ├── courses.js
    │   └── audit.js
    ├── contexts/
    │   ├── AuthContext.jsx
    │   └── ToastContext.jsx
    ├── hooks/
    │   ├── useAuth.js
    │   ├── useQuery.js        # small fetch-in-React helper (or TanStack Query)
    │   └── useDebounce.js
    ├── utils/
    │   ├── format.js          # dates, file size
    │   └── validators.js      # client-side email/file checks
    ├── components/
    │   ├── layout/            # Navbar, Sidebar, Footer, ProtectedRoute
    │   ├── common/            # Button, Input, Modal, Pagination, Toast, Badge, ...
    │   ├── announcements/     # AnnouncementCard, AnnouncementForm, TargetSelector
    │   ├── gallery/           # GalleryGrid, MediaCard, Lightbox, FilterBar, UploadForm
    │   └── admin/             # UserTable, UserForm, ModerationQueue, AuditLogTable
    └── pages/
        ├── auth/LoginPage.jsx
        ├── dashboard/AdminDashboard.jsx, TeacherDashboard.jsx, StudentDashboard.jsx
        ├── announcements/FeedPage.jsx, FormPage.jsx, DetailPage.jsx, ManagePage.jsx
        ├── gallery/GalleryPage.jsx, UploadPage.jsx, MyUploadsPage.jsx
        ├── admin/UsersPage.jsx, ModerationPage.jsx, CategoriesPage.jsx,
        │        SectionsPage.jsx, CoursesPage.jsx, AuditLogsPage.jsx
        ├── SettingsPage.jsx
        └── TVScreen/TVPage.jsx
```

---

## 6. Six-Week Development Roadmap

| Week | Phase                      | Focus                                                                     | Deliverables |
| ---- | -------------------------- | ------------------------------------------------------------------------- | ------------ |
| 1    | **Foundation**             | Scaffold `server/` + `client/`, DB pool, run `DATABASE_SCHEMA.sql`, seed script (admin, sample sections/courses); bcrypt + JWT utilities; auth middleware; login flow front-to-back | Working login + lint/test harness |
| 2    | **Users & Reference Data** | User CRUD admin endpoints + UI (NST email validation, roles/assignments, activate/deactivate); sections & courses CRUD; seeded student/teacher accounts | Admin can manage the school roster |
| 3    | **Announcements**          | Data layer; create general + class announcements with multi-select targeting; feed queries; update/delete; status lifecycle + scheduler; TV feed endpoint; frontend form + feed + manage pages | Announcements on dashboards & TV endpoint |
| 4    | **Gallery**                | Multer storage + static serving; media validation (MIME, 10MB/50MB, ffprobe 2-min); categories CRUD; upload → pending; public filtered gallery + search; moderation approve/reject/delete; frontend gallery + upload + moderation pages | Moderated gallery live |
| 5    | **Dashboards & Audit**     | Role-based dashboard views + summary widgets; audit service wired into all mutating actions; audit-logs page + CSV export; settings/password page; TV slideshow page | Full admin center + activity trail |
| 6    | **Testing, Polish, Deploy**| Fill test gaps (unit/integration/E2E), UAT checklist run with client, responsive pass, seed demo data, deploy to free-tier hosts, environment hardening, capstone demo rehearsal | Shippable, deployed capstone |

Each week ends with a working, runnable slice of the system (vertical slices wherever possible: e.g. in Week 3 a teacher can create a class announcement and a student in that section sees it).

---

## 7. Security Plan

| Area                | Measure                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| **Passwords**       | bcrypt (cost 10–12); never store plaintext; reset-flow generates temp passwords for admins      |
| **Sessions**        | JWT (HS256, ~short-lived; e.g. 8h) signed with secret from env; token sent via Authorization header (never localStorage XSS-prone handling — HttpOnly cookie option documented); logout = client discard; 401 auto-logout on frontend |
| **AuthZ**           | `requireRole('admin' | 'teacher' | 'student')` middleware at every protected route; ownership checks (`Author or Admin`) for edit/delete |
| **NST-only accounts** | No registration route exists; admin-only user creation; backend validator enforces the NST domain + unique email; basic format CHECK in DB |
| **Input validation**| zod schemas on every body/query/param; strict `content-type`; reject unknown fields            |
| **SQL injection**   | Parameterized queries everywhere (`pg` placeholders); no string-concatenated SQL                  |
| **File uploads**    | Extensions + MIME whitelist (JPEG/PNG/WebP ≤10MB; MP4 ≤50MB); video duration ≤2 min via ffprobe; files stored outside public source tree; served from a dedicated static route with content sniffing disabled |
| **XSS**             | React escape-by-default; no `dangerouslySetInnerHTML` for user content; sanitize/HTML-encode rich text if allowed later |
| **Transport**       | HTTPS enforced in production; HSTS via helmet                                       |
| **Headers/CORS**    | helmet defaults; CORS allow-list for the client origin only                    |
| **Rate limiting**   | `express-rate-limit` on `/auth/login` (e.g. 10/min/IP) and a global API limiter                |
| **Secrets**         | All secrets in `.env` (git-ignored); `.env.example` committed with placeholders; never log tokens/passwords |
| **Audit trail**     | Every mutating action writes an `audit_logs` row with user, IP, action, entity, and details     |
| **Privilege**       | Admin cannot delete own account; deactivation requires a different admin (documented)           |

---

## 8. Testing Plan

### 8.1 Unit (Vitest — server)
- Password hashing/compare; JWT sign/verify; NST email validator; file-name/extension sanitizer; announcement visibility resolver (general vs. targeted); status-transition rules (invalid transitions rejected); media validator (size/MIME/duration edge cases).
- Purpose: fast, dependency-free (mock DB).

### 8.2 Integration (Vitest + Supertest — server against a test Postgres DB)
- Auth: login success/failure, deactivated account, wrong password, rate limit trips.
- Users: create/list/update/deactivate; NST-only rejection of other domains.
- Announcements: general publish visibility; class targeting multi-select → correct visible audiences; schedule transitions; unauthorized access (student reading others' class announcements → 403).
- Gallery: upload pending; admin approve/reject sets status + audit rows; public feed only returns approved; filters/search/pagination.
- Audit: each mutating endpoint creates a correct log row.
- DB wipe + reseed between suites.

### 8.3 System (end-to-end)
- Browser E2E (Playwright or Vitest browser mode): full journeys —
  - Admin logs in → creates student & teacher → approves a pending upload → rotates announcement statuses.
  - Teacher logs in → posts general announcement → creates class announcement targeting multiple sections/courses/students.
  - Student logs in → sees only targeted class announcement + general; uploads media; sees `pending` status in My Uploads.
  - Visitor opens public gallery and TV page.
- Verify uploads persist across requests; file-type/size limits block invalid files client- and server-side.

### 8.4 Acceptance (UAT checklist)
- Approved scenarios above vetted **with the school client** on a staging deploy; sign-off form per scenario; fixes tracked in issues before final demo.

---

## 9. Deployment Plan

**Target: free-tier hosting (user decision).** Docker kept optional.

| Piece                   | Host                           | Notes                                                                 |
| ----------------------- | ------------------------------ | --------------------------------------------------------------------- |
| Frontend (Vite build)   | Vercel / Netlify               | Static export; env `VITE_API_BASE_URL`; proxy in dev                   |
| Backend (Express)       | Render (Web Service) / Railway | `npm start`; env vars for DB URL, JWT secret, origins, upload dir      |
| PostgreSQL              | Render / Neon (free tier)      | Connection string in server env                                        |
| Uploads (local disk)    | Server service disk            | **Caveat:** Render free disk is ephemeral — media is lost on redeploy. Mitigations below. |
| Asset serving           | Express static `/uploads`      | Alternatively proxy to a bucket later (documented migration path)      |

### Pre-deployment checklist
1. `.env.production` populated; `NODE_ENV=production`.
2. DB migrations/SQL applied; seed script generates a default admin (password changed at first login).
3. `/uploads` created with write permissions; static route disabled for non-image/video extensions.
4. `CORS` allow-list = real client origin; helmet + rate limits on.
5. Uploads disk caveat: back up `uploads/` before redeploys; for capstone demos, keep the seed demo media stable. (Long-term fix: swap `multer.storage` for an S3-style bucket in Week 6 if time permits.)
6. Health check at `/api/health` used by host uptime monitors.

### Release
- Manual/simple: push → host auto-builds → run SQL → smoke test core path.
- Optional: GitHub Actions deploy on `main` merge (build client, run server tests).

---

## 10. Risks and Mitigation

| # | Risk | Likelihood | Impact | Mitigation |
| - | ---- | ---------- | ------ | ---------- |
| 1 | **Ephemeral disk on free-tier hosting** loses uploaded media on redeploy/restart | High | High | Backup `uploads/` before deploy; seed stable demo media; document bucket migration path; confirm Render disk size is sufficient for 50MB videos |
| 2 | **Video duration validation** (2-min cap) is complex; ffprobe dependency/missing binary | Med | Med | Vendor `ffprobe-static`; validate client-side first (rough check) + server as source of truth; reject early with clear errors |
| 3 | **Class-announcement targeting complexity** (multi-select across 3 entity types; visibility math) | Med | High | Single `visibilityResolver` function with unit-tested SQL; keep targeting picker server-driven by `GET /announcements/targets/options` |
| 4 | **Scheduling timezone bugs** (publish/expire off-by-hours) | Med | Med | Store `TIMESTAMPTZ`; scheduler runs UTC; display times converted in client with `toLocaleString` |
| 5 | **Scope creep** during capstone demo pressure | Med | Med | Freeze scope after Week 4; UAT checklist gates Week 5–6 changes; polish instead of new features |
| 6 | **Large 50MB video uploads** overwhelm the free-tier request body / slow connections | Med | Med | Client-side pre-check + size warnings; multer `limits.fileSize`; consider a note of ≤25MB recommended for class use |
| 7 | **NST email domain unknown / changes** | Low | Med | Centralize domain in one config constant + validator util; schema CHECK documents the final pattern; easy to update |
| 8 | **Accidental delete of data** (user accounts with content, categories, announcements) | Med | Med | FK rules (CASCADE on owned content, SET NULL on categories/courses/sections); confirm dialogs; recycle-bin not needed at capstone scope |
| 9 | **Token theft / XSS on the client** | Low | Med | Short-lived JWT; HttpOnly cookie option; no unsafe HTML rendering; helmet; careful CSP |
| 10 | **Dev–prod DB drift** (schema applied differently in two places) | Low | Med | One source of truth: `DATABASE_SCHEMA.sql`; replay on every env; test DB rebuilt from same file in CI |