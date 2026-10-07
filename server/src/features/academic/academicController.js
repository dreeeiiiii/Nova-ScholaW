import { normalizeName } from '../../shared/utils/sectionInput.js';
import { query } from '../../shared/config/db.js';
import { nullableId } from '../../shared/utils/academicInput.js';
import { findDepartmentById, listDepartments as departments } from './departmentModel.js';
import { audit } from '../audit/auditService.js';

export const listDepartments = async (req, res, next) => {
  try { res.json({ departments: await departments() }); } catch (e) { next(e); }
};

const handlers = (table, singular, required, assignment) => ({
  list: async (req, res, next) => {
    try {
      const department = nullableId(req.query.department_id);
      const { rows } = await query(`SELECT a.*, COUNT(u.id)::int AS student_count FROM ${table} a
        LEFT JOIN users u ON u.${assignment} = a.id AND u.role = 'student' AND u.is_active = TRUE
        WHERE ($1::bigint IS NULL OR a.department_id = $1) GROUP BY a.id ORDER BY a.name`, [department]);
      res.json({ [table]: rows });
    } catch (e) { next(e); }
  },
  save: async (req, res, next) => {
    try {
      const id = req.params.id ? nullableId(req.params.id) : null;
      const existing = id ? (await query(`SELECT * FROM ${table} WHERE id = $1`, [id])).rows[0] : null;
      if (id && !existing) return res.status(404).json({ message: 'Record not found.' });
      const body = req.body ?? {};
      const department = Object.hasOwn(body, 'department_id') ? nullableId(body.department_id) : existing?.department_id;
      if (!department || !await findDepartmentById(department)) return res.status(400).json({ message: 'Select a valid department.' });
      const fields = { department_id: department };
      for (const field of required) {
        const value = body[field] ?? existing?.[field];
        if (typeof value !== 'string' || !value.trim()) return res.status(400).json({ message: `${field} is required.` });
        const max = field === 'grade_level' ? 20 : field === 'code' ? 30 : table === 'sections' ? 100 : 150;
        if (value.trim().length > max) return res.status(400).json({ message: field + ' is too long.' });
        fields[field] = table === 'sections' ? normalizeName(value) : value.trim();
      }
      if (table === 'courses') fields.description = body.description === undefined ? existing?.description ?? null : body.description;
      if (id && String(department) !== String(existing.department_id)) {
        const { rows } = await query(`SELECT COUNT(*)::int AS count FROM users WHERE ${assignment} = $1 AND department_id IS NOT NULL AND department_id IS DISTINCT FROM $2::bigint`, [id, department]);
        if (rows[0].count) return res.status(409).json({ message: 'Resolve assigned users before changing this department; assignments are never inferred.' });
      }
      const keys = Object.keys(fields), values = Object.values(fields);
      const sql = id
        ? `UPDATE ${table} SET ${keys.map((key, i) => `${key} = $${i + 1}`).join(', ')}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`
        : `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`;
      const record = (await query(sql, id ? [...values, id] : values)).rows[0];
      await audit(req, `${singular}.${id ? 'update' : 'create'}`, singular, record.id, { department_id: department, previous_department_id: existing?.department_id ?? null });
      res.status(id ? 200 : 201).json({ [singular]: record });
    } catch (e) { if (e.code === '23505') return res.status(409).json({ message: 'Record already exists.' }); next(e); }
  },
  remove: async (req, res, next) => {
    try {
      const id = nullableId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Invalid id.' });
      const references = (await query(`SELECT
        (SELECT COUNT(*) FROM users WHERE ${assignment} = $1) +
        (SELECT COUNT(*) FROM announcement_targets WHERE ${assignment} = $1) AS count`, [id])).rows[0];
      if (Number(references.count)) return res.status(409).json({ message: 'Cannot delete an assigned or historically targeted record.' });
      const record = (await query(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [id])).rows[0];
      if (!record) return res.status(404).json({ message: 'Record not found.' });
      await audit(req, `${singular}.delete`, singular, id);
      res.json({ message: 'Record deleted.' });
    } catch (e) { next(e); }
  },
});
const sections = handlers('sections', 'section', ['name', 'grade_level'], 'section_id');
const courses = handlers('courses', 'course', ['name', 'code'], 'course_id');
export const listSections = sections.list, createSection = sections.save, updateSection = sections.save, deleteSection = sections.remove;
export const listCourses = courses.list, createCourse = courses.save, updateCourse = courses.save, deleteCourse = courses.remove;
