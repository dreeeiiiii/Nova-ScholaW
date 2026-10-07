-- Nullable import identity; normal live announcements retain their existing defaults.
ALTER TABLE announcements ADD COLUMN display_import_key TEXT UNIQUE;
ALTER TABLE announcements ADD CONSTRAINT display_import_email_safety
  CHECK (display_import_key IS NULL OR (email_eligible = FALSE AND type = 'general' AND department_id IS NULL));
