BEGIN READ ONLY;
SELECT version,checksum FROM schema_migrations ORDER BY version;
SELECT code,name FROM departments ORDER BY code;
SELECT role,count(*) AS unassigned FROM users WHERE department_id IS NULL GROUP BY role;
SELECT 'users' AS entity,count(*) AS rows FROM users UNION ALL
SELECT 'announcements',count(*) FROM announcements UNION ALL
SELECT 'announcement_targets',count(*) FROM announcement_targets UNION ALL
SELECT 'gallery_media',count(*) FROM gallery_media UNION ALL
SELECT 'gallery_b2_keys',count(*) FROM gallery_media WHERE b2_key IS NOT NULL UNION ALL
SELECT 'announcement_b2_keys',count(*) FROM announcements WHERE b2_key IS NOT NULL;
SELECT type,status,count(*) FROM announcements GROUP BY type,status ORDER BY type,status;
SELECT email_eligible,count(*) FROM announcements GROUP BY email_eligible;
SELECT status,count(*) FROM announcement_email_deliveries GROUP BY status;
DO $$
BEGIN
  IF (SELECT count(*) FROM departments) <> 3 OR EXISTS (SELECT 1 FROM departments WHERE
    (code,name) NOT IN (('college','College'),('shs','Senior High School'),('jhs','Junior High School'))) THEN
    RAISE EXCEPTION 'Department mismatch';
  END IF;
  IF (SELECT count(*) FROM users WHERE role='admin') > 1 THEN RAISE EXCEPTION 'Multiple Administrators'; END IF;
END $$;
ROLLBACK;
