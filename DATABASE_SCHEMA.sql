-- ============================================================================
-- Nova Schola Hub — PostgreSQL Database Schema
-- Nova Schola Tanauan — Digital Bulletin Board & Event Gallery System
--
-- Engine : PostgreSQL 14+
-- Notes  :
--   * 8 tables (users, sections, courses, announcements, announcement_targets,
--     categories, gallery_media, audit_logs). Sections & courses were added to
--     the original 6-table plan to give class-announcement targeting real
--     referential integrity (see DEVELOPMENT_PLAN.md).
--   * All timestamps use TIMESTAMPTZ. Set updated_at from the application layer
--     (e.g. ON UPDATE trigger or manual set in code).
--   * Foreign keys use ON DELETE rules to keep the audit trail and media
--     history consistent (see per-table comments).
-- ============================================================================

-- ============================================================================
-- 1. sections — sections/class sections announcements can target
-- ============================================================================
CREATE TABLE sections (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,                 -- e.g. "Grade 10 - A"
    grade_level VARCHAR(20)  NOT NULL,                        -- e.g. "Grade 10"
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT sections_grade_level_not_empty CHECK (grade_level <> '')
);

-- Lookups used when building class-announcement audience pickers.
CREATE INDEX idx_sections_grade_level ON sections (grade_level);

-- ============================================================================
-- 2. courses — courses (e.g. "STEM 12") announcements can target
-- ============================================================================
CREATE TABLE courses (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL UNIQUE,                 -- e.g. "STEM"
    code        VARCHAR(30)  NOT NULL UNIQUE,                 -- e.g. "STEM12"
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. users — admin / teacher / student accounts (created by Admin only)
-- ============================================================================
CREATE TABLE users (
    id              BIGSERIAL   PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    -- Nightly dev note: the exact school address is unknown at planning time.
    -- Enforce the real NST domain in the app layer (configurable) AND uncomment
    -- the email domain pattern here once the domain is finalized, e.g.:
    --   email VARCHAR(255) NOT NULL UNIQUE
    --     CONSTRAINT users_email_format CHECK (
    --       email ~ '^[A-Za-z0-9._%+-]+@<nst-domain>$'
    --     ),
    password_hash   VARCHAR(255) NOT NULL,                    -- bcrypt
    full_name       VARCHAR(150) NOT NULL,
    role            VARCHAR(20)  NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    section_id      BIGINT REFERENCES sections(id) ON DELETE SET NULL,   -- students only
    course_id       BIGINT REFERENCES courses(id)  ON DELETE SET NULL,   -- students only
    student_level   VARCHAR(10) CHECK (student_level IN ('section', 'course')),  -- self-reported level (free-text era)
    section_course  VARCHAR(100),                                                -- normalized free-text section/course
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,      -- admin deactivates accounts
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT users_email_basic_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    CONSTRAINT users_name_not_blank CHECK (full_name <> '')
);

-- Login lookups by email (unique index already created by UNIQUE above).
-- Useful for role-based filtering and reporting.
CREATE INDEX idx_users_role        ON users (role);
CREATE INDEX idx_users_section_id  ON users (section_id);
CREATE INDEX idx_users_course_id   ON users (course_id);

-- ============================================================================
-- 4. announcements — general (public) and class (targeted) announcements
-- ============================================================================
CREATE TABLE announcements (
    id                    BIGSERIAL PRIMARY KEY,
    author_id             BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- admin/teacher
    type                  VARCHAR(10) NOT NULL CHECK (type IN ('general', 'class')),
    title                 VARCHAR(255) NOT NULL,
    content               TEXT        NOT NULL,
    image_url             VARCHAR(500),                                -- optional image attachment
    cloudinary_public_id  TEXT,                                        -- Cloudinary public_id for new uploads
    show_on_tv            BOOLEAN     NOT NULL DEFAULT true,           -- TV kiosk visibility for general announcements
    status                VARCHAR(20) NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
    publish_at  TIMESTAMPTZ,                                 -- set when scheduled
    expires_at  TIMESTAMPTZ,                                 -- auto-hide after this
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT announcements_title_not_blank CHECK (title <> ''),
    CONSTRAINT announcements_date_range CHECK (
        publish_at IS NULL OR expires_at IS NULL OR publish_at <= expires_at
    )
);

-- Scheduled-publisher jobs and TV feed queries scan these heavily.
CREATE INDEX idx_announcements_status      ON announcements (status);
CREATE INDEX idx_announcements_publish_at  ON announcements (publish_at);
CREATE INDEX idx_announcements_expires_at  ON announcements (expires_at);
CREATE INDEX idx_announcements_type        ON announcements (type);
CREATE INDEX idx_announcements_author      ON announcements (author_id);

-- ============================================================================
-- 5. announcement_targets — class-announcement audience rows (multi-select)
-- ============================================================================
-- One row per target. A class announcement must have >= 1 target row.
-- Only `type = 'class'` announcements may have target rows (enforced in code,
-- cross-table CHECKs are not possible in PostgreSQL).
CREATE TABLE announcement_targets (
    id               BIGSERIAL PRIMARY KEY,
    announcement_id  BIGINT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    target_type      VARCHAR(10) NOT NULL CHECK (target_type IN ('section', 'course', 'student')),
    section_id       BIGINT REFERENCES sections(id) ON DELETE CASCADE,
    course_id        BIGINT REFERENCES courses(id)  ON DELETE CASCADE,
    student_id       BIGINT REFERENCES users(id)    ON DELETE CASCADE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT announcement_targets_exactly_one CHECK (
        (target_type = 'section' AND section_id IS NOT NULL AND course_id IS NULL AND student_id IS NULL)
        OR
        (target_type = 'course'  AND section_id IS NULL AND course_id IS NOT NULL AND student_id IS NULL)
        OR
        (target_type = 'student' AND section_id IS NULL AND course_id IS NULL AND student_id IS NOT NULL)
    )
);

-- Audience resolution (students matching a target) is the hot path.
CREATE INDEX idx_announcement_targets_announcement ON announcement_targets (announcement_id);
CREATE INDEX idx_announcement_targets_section      ON announcement_targets (section_id);
CREATE INDEX idx_announcement_targets_course       ON announcement_targets (course_id);
CREATE INDEX idx_announcement_targets_student      ON announcement_targets (student_id);

-- ============================================================================
-- 6. categories — admin-managed gallery categories
-- ============================================================================
CREATE TABLE categories (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT categories_name_not_blank CHECK (name <> '')
);

-- ============================================================================
-- 7. gallery_media — photos & videos with admin approval workflow
-- ============================================================================
CREATE TABLE gallery_media (
    id                    BIGSERIAL PRIMARY KEY,
    uploader_id           BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id           BIGINT      REFERENCES categories(id) ON DELETE SET NULL,
    media_type            VARCHAR(10) NOT NULL CHECK (media_type IN ('image', 'video')),
    file_url              VARCHAR(500) NOT NULL,
    cloudinary_public_id  TEXT,                                        -- Cloudinary public_id for new uploads
    original_filename     VARCHAR(255) NOT NULL,
    caption            TEXT,
    duration_seconds   INTEGER     CHECK (duration_seconds > 0),   -- videos only
    status             VARCHAR(10) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by        BIGINT      REFERENCES users(id) ON DELETE SET NULL,  -- admin
    reviewed_at        TIMESTAMPTZ,
    rejection_reason   TEXT,                                         -- set when rejected
    featured           BOOLEAN     NOT NULL DEFAULT false,             -- dashboard featured
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Public gallery browsing (approved only) + moderation queue.
CREATE INDEX idx_gallery_media_status       ON gallery_media (status);
CREATE INDEX idx_gallery_media_category     ON gallery_media (category_id);
CREATE INDEX idx_gallery_media_uploader     ON gallery_media (uploader_id);
CREATE INDEX idx_gallery_media_created      ON gallery_media (created_at DESC);
CREATE INDEX idx_gallery_media_status_created
    ON gallery_media (status, created_at DESC);
CREATE INDEX idx_gallery_media_featured ON gallery_media (featured) WHERE featured = true;

-- ============================================================================
-- 8. audit_logs — automatic record of announcements, uploads, approvals, ...
-- ============================================================================
CREATE TABLE audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,  -- NULL = system action
    action      VARCHAR(100) NOT NULL,   -- e.g. 'announcement.create', 'gallery.approve'
    entity_type VARCHAR(50)  NOT NULL,   -- e.g. 'announcement', 'gallery_media', 'user'
    entity_id   BIGINT,                  -- id of the affected row
    details     JSONB,                   -- change summary / before-after snapshots
    ip_address  INET,                    -- originating IP
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log browsing & retention queries.
CREATE INDEX idx_audit_logs_user_id    ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_created    ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_entity     ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_action     ON audit_logs (action);
-- Step 10+: self-reported level fields (idempotent for existing databases).
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_level VARCHAR(10) CHECK (student_level IN ('section', 'course'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS section_course VARCHAR(100);
