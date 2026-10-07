import { query } from '../../shared/config/db.js';

export const listDepartments = async () => (await query('SELECT id, code, name FROM departments ORDER BY id')).rows;
export const findDepartmentById = async id => (await query('SELECT id, code, name FROM departments WHERE id = $1', [id])).rows[0] ?? null;
export const registrationSections = async departmentId => (await query(
  'SELECT id, name, grade_level, department_id FROM sections WHERE department_id = $1 ORDER BY grade_level, name', [departmentId]
)).rows;

export async function validateMembership({ role, department_id, section_id = null, course_id = null }, { allowUnassigned = false } = {}) {
  if (role === 'admin') return department_id || section_id || course_id ? 'Administrator has no department or class assignment.' : null;
  if (role !== 'student' && (section_id || course_id)) return 'Only Students can have section or class assignments.';
  if (!department_id) {
    return allowUnassigned ? null : 'Select a department.';
  }
  if (!await findDepartmentById(department_id)) return 'Invalid department.';
  for (const [table, id] of [['sections', section_id], ['courses', course_id]]) {
    if (!id) continue;
    const record = (await query(`SELECT department_id FROM ${table} WHERE id = $1`, [id])).rows[0];
    if (!record || String(record.department_id) !== String(department_id)) return 'Section/class must belong to the selected department.';
  }
  return null;
}
