-- Read-only. Run against a restored branch first; stop on errors or unexplained schema drift.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
DO $$
DECLARE missing integer;
BEGIN
  SELECT count(*) INTO missing FROM (VALUES
    ('users'),('sections'),('courses'),('announcements'),('announcement_targets'),('categories'),('gallery_media'),('audit_logs')
  ) AS expected(name) WHERE to_regclass('public.' || name) IS NULL;
  IF missing <> 0 THEN RAISE EXCEPTION 'Required legacy tables missing: manual schema review required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.announcements'::regclass AND conname='announcements_type_check') THEN
    RAISE EXCEPTION 'Announcement type constraint differs from reviewed baseline';
  END IF;
  IF (SELECT count(*) FROM users WHERE role='admin') > 1 THEN RAISE EXCEPTION 'Multiple Administrators: explicit resolution required, do not delete automatically'; END IF;
  IF EXISTS (SELECT 1 FROM users WHERE role='admin' AND lower(email) !~ '^[^@[:space:]]+@nst[.]edu[.]ph$') THEN
    RAISE EXCEPTION 'Review authorized Administrator email before rollout';
  END IF;
END $$;
-- Compare this metadata with DATABASE_SCHEMA.sql and the migration files.
SELECT table_name,column_name,data_type,character_maximum_length,is_nullable,column_default
FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position;
SELECT conrelid::regclass AS table_name,conname,pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY conrelid::regclass::text,conname;
SELECT role,count(*) AS accounts FROM users GROUP BY role ORDER BY role;
SELECT 'users' AS entity,count(*) AS rows FROM users UNION ALL
SELECT 'announcements',count(*) FROM announcements UNION ALL
SELECT 'announcement_targets',count(*) FROM announcement_targets UNION ALL
SELECT 'gallery_media',count(*) FROM gallery_media UNION ALL
SELECT 'gallery_b2_keys',count(*) FROM gallery_media WHERE b2_key IS NOT NULL UNION ALL
SELECT 'announcement_b2_keys',count(*) FROM announcements WHERE b2_key IS NOT NULL;
ROLLBACK;
