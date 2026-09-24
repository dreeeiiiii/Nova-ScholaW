-- Backfill student_level for users whose column is NULL/empty.
-- Infer from which FK is set: section_id → 'section', course_id → 'course'.
-- If both are set, prefer section_id (SHS students have section only).
-- If neither FK is set but section_course is populated, infer from
-- the format: values containing a hyphen+digit pattern with "bs"
-- prefix are treated as courses, everything else as sections.
-- Review the SELECT output before committing this ALTER.

UPDATE users
SET student_level = 'section'
WHERE (student_level IS NULL OR student_level = '')
  AND section_id IS NOT NULL;

UPDATE users
SET student_level = 'course'
WHERE (student_level IS NULL OR student_level = '')
  AND course_id IS NOT NULL
  AND section_id IS NULL;

-- Legacy self-registered rows: bs* values are courses
UPDATE users
SET student_level = 'course'
WHERE (student_level IS NULL OR student_level = '')
  AND section_course ~ '^bs[a-z]*-[0-9]';

-- Everything else that has a section_course value → section
UPDATE users
SET student_level = 'section'
WHERE (student_level IS NULL OR student_level = '')
  AND section_course IS NOT NULL
  AND section_course <> '';
