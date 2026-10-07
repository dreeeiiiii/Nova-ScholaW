-- Additive upgrade. No guessed membership or historical data updates.
CREATE TABLE departments (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE CHECK (code IN ('college', 'shs', 'jhs')),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO departments (code, name) VALUES
  ('college', 'College'), ('shs', 'Senior High School'), ('jhs', 'Junior High School');
ALTER TABLE users ADD COLUMN department_id BIGINT REFERENCES departments(id) ON DELETE RESTRICT;
ALTER TABLE sections ADD COLUMN department_id BIGINT REFERENCES departments(id) ON DELETE RESTRICT;
ALTER TABLE courses ADD COLUMN department_id BIGINT REFERENCES departments(id) ON DELETE RESTRICT;
ALTER TABLE announcements ADD COLUMN department_id BIGINT REFERENCES departments(id) ON DELETE RESTRICT;
ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE announcements DROP CONSTRAINT announcements_type_check;
ALTER TABLE announcements ADD CONSTRAINT announcements_type_check CHECK (type IN ('general', 'department', 'class'));
ALTER TABLE announcements ADD CONSTRAINT announcements_department_check CHECK (
  (type = 'department' AND department_id IS NOT NULL) OR
  (type IN ('general', 'class') AND department_id IS NULL)
);
CREATE INDEX idx_users_department ON users (department_id);
CREATE INDEX idx_sections_department ON sections (department_id);
CREATE INDEX idx_courses_department ON courses (department_id);
CREATE INDEX idx_announcements_department ON announcements (department_id);
-- Abort for manual review if multiple admins exist; never delete them.
CREATE UNIQUE INDEX users_single_administrator ON users (role) WHERE role = 'admin';
