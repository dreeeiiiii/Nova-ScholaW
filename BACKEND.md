# Backend Overview

NovaSchola is a school portal API for managing announcements, a media gallery, user accounts, and academic structure (sections and courses). The backend is built with Node.js (ES Modules), Express 4, PostgreSQL (via `pg`), and JWT-based authentication. Run `npm start` to launch the server, `npm test` to run the test suite (112 tests, 14 suites), and `npm run db:seed` to populate the database with test data. The entry point is `src/server.js`, which creates the app via `src/app.js`.

# Folder Structure

```
src/
├── app.js                              # Express app factory — mounts routes, middleware
├── server.js                           # Entry point — starts HTTP server, graceful shutdown
├── seed.js                             # Database seeder script
│
├── features/                           # Business domains — one folder per feature
│   ├── academic/                       # Sections & courses CRUD
│   ├── announcements/                  # Announcements, targeting, image uploads
│   ├── audit/                          # Audit log reading + writing service
│   ├── auth/                           # Login, token, /me, logout
│   ├── categories/                     # Gallery categories CRUD
│   ├── dashboard/                      # Admin aggregate statistics
│   ├── gallery/                        # Media upload, approval workflow, browse, search
│   └── users/                          # User CRUD (admin only)
│
└── shared/                             # Infrastructure used by multiple features
    ├── config/                         # Environment vars, DB pool, constants
    ├── db/                             # Schema migration runner
    ├── errors/                         # PG error -> HTTP response helpers
    ├── middleware/                      # Auth, RBAC, error handling, uploads, rate limiting
    └── utils/                          # JWT, password hashing, ID parsing, validation
```

**Where does new code go?**

| You are adding...                    | Put it in...                          |
| ------------------------------------ | ------------------------------------- |
| A new feature                        | `src/features/<name>/`                |
| A shared utility used by 2+ features | `src/shared/utils/`                   |
| Shared middleware used by many routes| `src/shared/middleware/`               |
| A DB migration script                | `src/shared/db/`                      |
| A test                               | `tests/`                              |

# The Feature-Module Pattern

Each business domain gets its own folder under `src/features/`. A feature owns its controller (HTTP handlers), model (SQL queries), routes (URL definitions), and any feature-specific middleware (like Multer upload configs). The feature's public entry point is its `index.js` barrel file, which re-exports the routes.

Cross-feature communication happens through specific named imports -- for example, `import { audit } from '../audit/auditService.js'` -- not through wildcard imports like `import * as auditModel`.

### Example: The categories feature

```
src/features/categories/
├── categoryController.js    # HTTP handlers: listCategoriesHandler, createCategoryHandler, etc.
├── categoryModel.js         # SQL queries: listCategories, findCategoryById, createCategory, etc.
├── categoryRoutes.js        # Route definitions: GET /, POST /, PUT /:id, DELETE /:id
└── index.js                 # Barrel: re-exports categoryRoutes
```

- **categoryController.js** -- Parses the request, calls model functions, builds the JSON response. Contains zero SQL.
- **categoryModel.js** -- Exports named functions that run SQL against the `categories` table. Has no awareness of `req` or `res`.
- **categoryRoutes.js** -- Maps HTTP methods + paths to controller handlers. Applies middleware (`authenticate`, `requireRole`). Contains no business logic.
- **index.js** -- One line: `export { default as categoryRoutes } from './categoryRoutes.js'`

# Request Lifecycle

```
HTTP Request
    |
src/app.js (route mount: app.use('/api/categories', categoryRoutes))
    |
src/features/categories/categoryRoutes.js (middleware chain -> handler)
    |
src/features/categories/categoryController.js (parse request, call model, build response)
    |
src/features/categories/categoryModel.js (SQL queries)
    |
PostgreSQL (via shared/config/db.js -> query())
    |
Controller builds JSON response
    |
HTTP Response
```

### Full traced example: POST /api/categories

1. **`src/app.js`** line 61 -- `app.use('/api/categories', categoryRoutes)` matches the path
2. **`src/features/categories/categoryRoutes.js`** line 15 -- `router.post('/', adminOnly, createCategoryHandler)` matches POST. The `adminOnly` array is `[authenticate, requireRole('admin')]`, so Express runs them in order:
   - **`src/shared/middleware/authenticate.js`** `authenticate()` -- extracts Bearer token from Authorization header, calls `verifyToken(token)`, looks up user in DB, sets `req.user`, calls `next()`
   - **`src/shared/middleware/requireRole.js`** `requireRole('admin')` -- checks `req.user.role === 'admin'`, calls `next()` or returns 403
3. **`src/features/categories/categoryController.js`** `createCategoryHandler()` -- reads `req.body.name`, validates it, calls `findCategoryByName(name.trim())` to check for duplicates, calls `createCategory({ name, description, created_by })`, calls `audit(req, 'category.create', 'category', category.id, { name })`, returns `res.status(201).json({ category })`
4. **`src/features/categories/categoryModel.js`** `createCategory()` -- runs `INSERT INTO categories (name, description, created_by) VALUES ($1, $2, $3) RETURNING ...`
5. **`src/features/audit/auditService.js`** `audit()` -- runs `INSERT INTO audit_logs (...) VALUES (...)` (fire-and-forget, never throws)

# Layer Responsibilities

### 1. Routes

**Belongs here:** HTTP method, path, middleware chain, controller handler reference.
**Does NOT belong here:** Business logic, SQL, conditionals beyond middleware arrays.

```js
// src/features/categories/categoryRoutes.js
const adminOnly = [authenticate, requireRole('admin')];
router.get('/', listCategoriesHandler);
router.post('/', adminOnly, createCategoryHandler);
```

### 2. Controller

**Belongs here:** Request parsing, calling model/service, building JSON response, HTTP status codes, try/catch with `next(err)`.
**Does NOT belong here:** SQL queries, direct database access.

```js
// src/features/categories/categoryController.js
export const listCategoriesHandler = async (req, res, next) => {
  try {
    const categories = await listCategories();
    return res.json({ categories });
  } catch (err) {
    return next(err);
  }
};
```

### 3. Service (only when it exists)

**Belongs here:** Business logic that spans multiple models, or cross-cutting concerns reused by many features.
**Does NOT belong here:** Simple CRUD operations that a controller can handle directly.

This backend has one service: `features/audit/auditService.js`. Most features do not need a service.

### 4. Model

**Belongs here:** All SQL for the feature's tables. Named exports that return data.
**Does NOT belong here:** HTTP awareness (`req`, `res`), status codes, response formatting.

```js
// src/features/categories/categoryModel.js
export const listCategories = async () => {
  const { rows } = await query(
    `SELECT id, name, description, created_by, created_at, updated_at
       FROM categories
      ORDER BY name`
  );
  return rows;
};
```

### 5. Shared middleware

**Belongs here:** `authenticate.js`, `requireRole.js`, `errorHandler.js`, `notFound.js`, `rateLimiter.js`, `multerErrorHandler.js`. Used by multiple features.

**Does NOT belong here:** Feature-specific upload configs (those live in the feature folder).

# Feature Directory Reference

| Feature | Responsibility | Main tables | Public entry | Key files |
| --- | --- | --- | --- | --- |
| **auth** | Login, JWT issuance, current-user lookup, logout | `users` (read) | `authRoutes.js` | `authController.js` |
| **users** | User CRUD (admin-only), activate/deactivate | `users` | `userRoutes.js` | `userController.js`, `userModel.js` |
| **academic** | Sections & courses CRUD, delete-guards | `sections`, `courses` | `academicRoutes.js` | `academicController.js`, `sectionModel.js`, `courseModel.js` |
| **announcements** | Create/list/edit/delete announcements, targeting, TV feed, image upload | `announcements`, `announcement_targets` | `announcementRoutes.js` | `announcementController.js`, `announcementModel.js`, `upload.js` |
| **gallery** | Media upload, approve/reject, browse, search, my-uploads | `gallery_media` | `galleryRoutes.js` | `galleryController.js`, `galleryModel.js`, `galleryUpload.js` |
| **categories** | Gallery category CRUD | `categories` | `categoryRoutes.js` | `categoryController.js`, `categoryModel.js` |
| **dashboard** | Admin aggregate statistics | `users`, `announcements`, `gallery_media` (reads only) | `dashboardRoutes.js` | `dashboardController.js`, `dashboardModel.js` |
| **audit** | Audit log writing (service) + admin-only listing | `audit_logs` | `auditLogRoutes.js` | `auditService.js`, `auditLogController.js`, `auditLogModel.js` |

# Cross-Feature Dependencies

### Dependency graph

```
auth          -> users   (findByEmailWithHash, updateLastLogin, findByIdWithJoins)
auth          -> audit   (auditService.audit)
users         -> academic (sectionModel.findSectionById, courseModel.findCourseById)
users         -> audit   (auditService.audit)
announcements -> audit   (auditService.audit)
gallery       -> audit   (auditService.audit)
categories    -> audit   (auditService.audit)
dashboard     -> (none -- reads via its own model)
academic      -> (none)
```

All features import from `shared/` (db, middleware, utils).

### The two non-obvious cross-feature imports

**1. auth -> users**

`authController.js` imports `findByEmailWithHash`, `updateLastLogin`, and `findByIdWithJoins` from `userModel.js`. This coupling exists because login needs the password hash (which only the users model should access) and the `/me` endpoint needs section/course JOINs that only the users model provides. This is acceptable because auth and users are tightly coupled by design -- auth is the entry gate for users.

**2. users -> academic**

`userController.js` imports `findSectionById` from `sectionModel.js` and `findCourseById` from `courseModel.js`. This coupling exists because creating or updating a student user requires validating that the referenced section and course actually exist. This is acceptable because user creation is the only place where academic references are validated.

### The rule

A feature must not import another feature's model unless the imported function is a deliberate public interface. Use specific named imports (`import { findSectionById } from '../academic/sectionModel.js'`), not wildcard imports.

### The audit service exception

`features/audit/auditService.js` is intentionally imported by 5 features (auth, users, announcements, gallery, categories). It is a write-side service that never throws -- if the audit INSERT fails, it logs to console and continues. It is the one shared service in this backend. Read-side queries (listing audit logs) stay inside the audit feature.

# Authentication and Authorization

### How it works

1. **Login** (`POST /api/auth/login`) -- the client sends `{ email, password }`. The server calls `comparePassword(password, hash)` from `shared/utils/password.js`, then `signToken({ userId, role })` from `shared/utils/jwt.js`. The JWT is signed with `config.jwtSecret` and expires after `config.jwtExpiresIn`.

2. **Authenticated requests** -- the client sends `Authorization: Bearer <token>`. The `authenticate` middleware (`shared/middleware/authenticate.js`) extracts the token, calls `verifyToken(token)`, looks up the user in the DB, and sets `req.user = { id, email, full_name, role, section_id, course_id, is_active }`.

3. **Role checks** -- the `requireRole` middleware (`shared/middleware/requireRole.js`) checks `req.user.role` against the allowed roles. Usage: `requireRole('admin')` or `requireRole('admin', 'teacher')`.

4. **Rate limiting** -- the login endpoint uses `rateLimiter()` from `shared/middleware/rateLimiter.js`. It limits to 30 attempts per 15 minutes per IP+email combination.

### Roles

| Role | Can do |
| --- | --- |
| `admin` | Everything -- manage users, categories, approve gallery media, view audit logs, dashboard stats |
| `teacher` | Create/edit/delete own announcements, upload gallery media, view all announcements |
| `student` | View announcements targeted to them, upload gallery media, view approved gallery |

### Real route example with middleware

```js
// src/features/gallery/galleryRoutes.js
const adminOnly = [authenticate, requireRole('admin')];
const authenticated = [authenticate];

router.post('/upload', authenticated, uploadMediaHandler);   // any logged-in user
router.get('/pending', adminOnly, listPendingMedia);          // admin only
router.patch('/:id/approve', adminOnly, approveMedia);        // admin only
router.get('/search', searchGallery);                         // public (no auth)
```

# Database Access

The backend connects to PostgreSQL through `shared/config/db.js`, which exports:

- **`query(text, params)`** -- for single statements. Wraps `pool.query()`.
- **`getClient()`** -- returns a pool client for transactions. You must call `client.release()` when done.

### Transaction pattern

When an operation requires multiple queries to succeed or fail atomically (like creating an announcement with its targets), use `getClient()`:

```js
// src/features/announcements/announcementModel.js -- createClassWithTargets()
const client = await getClient();
try {
  await client.query('BEGIN');

  const { rows: annRows } = await client.query(
    `INSERT INTO announcements (...) VALUES (...) RETURNING ...`,
    [...]
  );
  // ... insert targets ...

  await client.query('COMMIT');
  return { announcement, targets };
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

### The rule

All SQL lives in feature model files. Controllers never write SQL.

# Validation and Error Handling

### Request validation

Controllers validate input using shared helpers from `shared/utils/normalize.js` and `shared/utils/parseId.js`:

| Helper | What it does | Used by |
| --- | --- | --- |
| `parseId(raw)` | Converts URL param to integer or `null` | Every `/:id` route |
| `readNonEmpty(value)` | Returns trimmed string or `null` if empty | `academicController`, `announcementController` |
| `readOptionalString(v)` | Alias for `readNonEmpty` | `announcementController` |
| `readOptionalDate(v)` | Returns ISO date string or `null` | `announcementController` |
| `normalizeLimit(raw)` | Returns clamped integer (1-200, default 50) | `auditLogController`, `userController` |
| `normalizeOffset(raw)` | Returns non-negative integer (default 0) | `auditLogController`, `userController` |

### PostgreSQL error handling

When a query violates a UNIQUE or FOREIGN KEY constraint, `shared/errors/conflictError.js` converts it to a 409 JSON response. Controllers also handle specific constraint errors directly:

```js
// src/features/categories/categoryController.js
} catch (err) {
  if (err.code === '23505') {
    return res.status(409).json({ status: 409, message: 'Category with this name already exists.' });
  }
  return next(err);
}
```

### Global error handling

- **`shared/middleware/errorHandler.js`** -- catches any error passed to `next(err)`. Returns the error's status code (default 500). In production, hides the error message for 5xx errors.
- **`shared/middleware/notFound.js`** -- returns 404 JSON for any route that didn't match.
- **`shared/middleware/multerErrorHandler.js`** -- converts Multer upload errors (file too large, invalid type) to 400 JSON.

### The rule

Controllers validate input and call `next(err)` for unexpected errors. They produce specific business error responses (400 for missing fields, 404 for not found, 409 for conflicts) directly.

# Audit Logging

`features/audit/auditService.js` exports a fire-and-forget audit logger. It never throws -- failures only print to console.

### How to use it

```js
import { audit } from '../audit/auditService.js';

// In a controller, after a successful operation:
await audit(req, 'category.create', 'category', category.id, { name: category.name });
```

The `audit()` function signature: `(req, action, entityType, entityId, details)`.

### Action naming convention

`<feature>.<action>` -- for example:

| Action | Feature | What happened |
| --- | --- | --- |
| `auth.login_success` | auth | User logged in |
| `auth.login_failure` | auth | Failed login attempt |
| `user.create` | users | Admin created a user |
| `user.update` | users | Admin updated a user |
| `user.deactivate` | users | Admin deactivated a user |
| `user.activate` | users | Admin activated a user |
| `announcement.create` | announcements | Announcement created |
| `announcement.update` | announcements | Announcement updated |
| `announcement.delete` | announcements | Announcement deleted |
| `gallery.upload` | gallery | Media uploaded |
| `gallery.approve` | gallery | Media approved |
| `gallery.reject` | gallery | Media rejected |
| `category.create` | categories | Category created |
| `category.update` | categories | Category updated |
| `category.delete` | categories | Category deleted |

### Where to call it

Call `await audit(req, ...)` after a successful write operation in the controller, before sending the response. You do not need try/catch around it -- the function handles its own errors.

# File Uploads

### How it works

1. **Multer config** lives in the feature folder: `features/announcements/upload.js` (images only, 10MB max) or `features/gallery/galleryUpload.js` (images + video, 50MB max).
2. **Shared validation** in `shared/utils/validateMedia.js` checks file type, size, and video duration (via ffprobe).
3. **Shared error handler** in `shared/middleware/multerErrorHandler.js` converts Multer errors to 400 JSON.
4. Files are saved to disk under `uploads/announcements/` or `uploads/gallery/images/` or `uploads/gallery/videos/`.
5. The controller constructs a URL like `/uploads/gallery/images/1726800000-123456789.jpg` and returns it in the response.

### Route example

```js
// src/features/announcements/announcementRoutes.js
router.post('/announcements/upload-image', adminOrTeacher, uploadImage, handleUploadError, uploadAnnouncementImage);
```

Here `uploadImage` is the Multer middleware, `handleUploadError` catches upload errors, and `uploadAnnouncementImage` is the controller handler.

### The rule

Feature-specific upload configs (storage destination, file filter, size limits) live in the feature folder. Shared upload validation and error handling live in `shared/`.

# Adding a New Feature -- Checklist

Example: "Add a notifications feature"

### 1. Create the feature folder

```
src/features/notifications/
```

### 2. Create the model (SQL only)

```js
// src/features/notifications/notificationModel.js
import { query } from '../../shared/config/db.js';

export const listForUser = async (userId) => {
  const { rows } = await query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return rows;
};

export const markAsRead = async (id) => {
  const { rows } = await query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *',
    [id]
  );
  return rows[0] ?? null;
};
```

### 3. Create the controller (HTTP only)

```js
// src/features/notifications/notificationController.js
import * as notificationModel from './notificationModel.js';
import { parseId } from '../../shared/utils/parseId.js';

export const listNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationModel.listForUser(req.user.id);
    return res.json({ notifications });
  } catch (err) {
    return next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid notification id.' });
    }
    const notification = await notificationModel.markAsRead(id);
    if (!notification) {
      return res.status(404).json({ status: 404, message: 'Notification not found.' });
    }
    return res.json({ notification });
  } catch (err) {
    return next(err);
  }
};
```

### 4. Create the routes

```js
// src/features/notifications/notificationRoutes.js
import { Router } from 'express';
import authenticate from '../../shared/middleware/authenticate.js';
import { listNotifications, markAsRead } from './notificationController.js';

const router = Router();

router.get('/', authenticate, listNotifications);
router.patch('/:id/read', authenticate, markAsRead);

export default router;
```

### 5. Create the barrel

```js
// src/features/notifications/index.js
export { default as notificationRoutes } from './notificationRoutes.js';
```

### 6. Register in app.js

```js
// src/app.js
import { notificationRoutes } from './features/notifications/index.js';

// Inside createApp():
app.use('/api/notifications', notificationRoutes);
```

### 7. Add audit logging

```js
// In notificationController.js
import { audit } from '../audit/auditService.js';

// After a successful write:
await audit(req, 'notification.create', 'notification', notification.id, { title });
```

### 8. Add tests

Create `tests/notifications.test.js`. Follow the pattern in existing test files -- use the helpers from `tests/helpers/db.js` for setup/teardown.

### 9. Run the test suite

```bash
npm test
```

Confirm all tests pass (baseline: 112 passing). If your new feature has tests, the count will increase.

### Decision table

| Situation | Where it goes |
| --- | --- |
| Only this feature needs it | `features/<name>/` |
| Two or more features need it | `shared/` |
| HTTP middleware used by many routes | `shared/middleware/` |
| A table-specific SQL query | `features/<name>/<name>Model.js` |
| A write-side cross-feature service | `features/<feature>/` (exported as public interface, like `auditService.js`) |

# Common Mistakes to Avoid

1. **Do not put SQL in controllers.** If a controller has SELECT, INSERT, UPDATE, or DELETE, that SQL belongs in a model file.

2. **Do not import another feature's model unless it is a public interface.** Use specific named imports (`import { findSectionById } from '../academic/sectionModel.js'`), not wildcard imports.

3. **Do not create a service layer for simple CRUD.** Services are for business logic that spans multiple models or needs to be reused across features. If your feature is just "receive request, query DB, return result," a controller + model is enough.

4. **Do not put feature-specific middleware in shared/.** If a middleware is only used by gallery uploads, it goes in `features/gallery/galleryUpload.js`.

5. **Do not add a new shared utility until it is used by at least two features.** Premature sharing creates coupling.

6. **Do not change shared middleware without running the full test suite.** `authenticate.js`, `requireRole.js`, and `errorHandler.js` are used by every route. A breaking change there breaks everything.

7. **Do not import from old paths** (`../controllers/`, `../models/`, `../routes/`, `../services/`). Those directories no longer exist. Use `./features/<name>/<file>` or `./shared/<layer>/<file>`.

8. **Always create `index.js` for a new feature.** This barrel re-exports the routes and keeps `app.js` imports consistent.

9. **Do not put business logic in routes.** Routes should only contain: HTTP method + path + middleware chain + controller handler reference. No if-statements, no database calls, no validation logic.

10. **Do not delete a model export without searching the whole codebase first.** What looks unused might be imported by a test or another feature.

11. **Do not write raw SQL in dashboard-style aggregate features either.** Aggregates still belong in the feature model (see `features/dashboard/dashboardModel.js`).

# The One Rule

> If only one feature needs it, it lives in that feature.
> If two or more features need it, it lives in shared.

This rule determines where every piece of code belongs. When you write a new function, ask: "Will any other feature besides this one ever call this?" If yes, put it in `shared/`. If no, keep it in the feature folder. This prevents both duplication (copying the same helper into three features) and over-sharing (putting everything in `shared/` so nothing is cohesive). Apply this rule to models, utilities, middleware, and constants alike.
