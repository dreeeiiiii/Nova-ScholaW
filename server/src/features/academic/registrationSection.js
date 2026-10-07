import { query } from '../../shared/config/db.js';

import { normalizeName, validateSectionName } from '../../shared/utils/sectionInput.js';
const invalid = message => { throw Object.assign(new Error(message), { status: 400 }); };
const defaults = {
  college: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'],
  shs: ['Grade 11', 'Grade 12'],
  jhs: ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
};
export async function registrationOptions(departmentId, db = { query }) {
  const department = (await db.query('SELECT id, code, name FROM departments WHERE id = $1', [departmentId])).rows[0];
  if (!department) invalid('Select a valid department.');
  const sections = (await db.query('SELECT id, name, grade_level, department_id FROM sections WHERE department_id = $1 ORDER BY grade_level, name', [departmentId])).rows;
  const courses = (await db.query('SELECT id, code, name, department_id FROM courses WHERE department_id = $1 ORDER BY name', [departmentId])).rows;
  const levels = [...new Set([...(defaults[department.code] ?? []), ...sections.map(s => normalizeName(s.grade_level))])];
  return { sections, courses, levels };
}
export async function resolveRegistrationSection(db, membership, body) {
  const { department_id, course_id, section_id } = membership;
  if (!department_id) invalid('Select a department.');
  const department = (await db.query('SELECT id, code FROM departments WHERE id = $1 FOR SHARE', [department_id])).rows[0];
  if (!department) invalid('Select a valid department.');
  // Courses and sections have independent department FKs. There is no course-section
  // join table or exclusive ownership: do not infer one from a name or one student.
  if (course_id) {
    const course = (await db.query('SELECT id, department_id FROM courses WHERE id = $1 FOR SHARE', [course_id])).rows[0];
    if (!course || String(course.department_id) !== String(department_id)) invalid('Course/program must belong to the selected department.');
  }
  const creating = body.new_section_name !== undefined && body.new_section_name !== null;
  if (Boolean(section_id) === creating) invalid('Select a section or enter a missing section name, but not both.');
  let section, created = false;
  const grade = normalizeName(body.grade_level);
  if (section_id) {
    section = (await db.query('SELECT id, name, grade_level, department_id FROM sections WHERE id = $1 FOR SHARE', [section_id])).rows[0];
  } else {
    const name = validateSectionName(body.new_section_name);
    const { levels } = await registrationOptions(department_id, db);
    if (!grade || grade.length > 20 || !levels.some(level => level.toLowerCase() === grade.toLowerCase())) invalid('Select a valid student level for this department.');
    const canonicalGrade = levels.find(level => level.toLowerCase() === grade.toLowerCase());
    // Global lookup includes all sections and therefore all existing students'
    // section IDs; an incompatible equivalent is rejected, never cloned/reassigned.
    const lookup = () => db.query('SELECT id, name, grade_level, department_id FROM sections WHERE normalize_section_name(name) = normalize_section_name($1) FOR SHARE', [name]);
    section = (await lookup()).rows[0];
    if (!section) {
      section = (await db.query(
        'INSERT INTO sections(name, grade_level, department_id) VALUES($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id, name, grade_level, department_id',
        [name, canonicalGrade, department_id],
      )).rows[0];
      created = Boolean(section);
      // READ COMMITTED: the statement after a conflicting insert sees the winner
      // once its transaction commits. The unique index covers Admin writes too.
      if (!section) section = (await lookup()).rows[0];
    }
  }
  if (!section || String(section.department_id) !== String(department_id)) invalid('Section must exist and belong to the selected department.');
  if (grade && normalizeName(section.grade_level).toLowerCase() !== grade.toLowerCase()) invalid('Section must match the selected student level.');
  const inconsistent = (await db.query(
    `SELECT u.id FROM users u LEFT JOIN courses c ON c.id = u.course_id
      WHERE u.section_id = $1 AND u.role = 'student' AND (
        (u.department_id IS NOT NULL AND u.department_id IS DISTINCT FROM $2::bigint)
        OR (u.course_id IS NOT NULL AND c.department_id IS DISTINCT FROM $2::bigint)
      ) LIMIT 1`, [section.id, department_id],
  )).rows[0];
  if (inconsistent) invalid('This section has inconsistent historical academic assignments. Contact the Administrator.');
  return { section, created };
}
