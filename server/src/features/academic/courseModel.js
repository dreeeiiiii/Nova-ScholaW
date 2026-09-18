import { query } from '../../shared/config/db.js';

export const listCourses = async () => {
  const { rows } = await query(
    `SELECT id, name, code, description, created_at, updated_at
       FROM courses
      ORDER BY name`
  );
  return rows;
};

export const findCourseById = async (id) => {
  const { rows } = await query(
    `SELECT id, name, code, description, created_at, updated_at
       FROM courses
      WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
};

export const createCourse = async ({ name, code, description }) => {
  const { rows } = await query(
    `INSERT INTO courses (name, code, description)
     VALUES ($1, $2, $3)
     RETURNING id, name, code, description, created_at, updated_at`,
    [name, code, description ?? null]
  );
  return rows[0];
};

export const updateCourse = async (id, { name, code, description }) => {
  if (
    name === undefined &&
    code === undefined &&
    description === undefined
  ) {
    return findCourseById(id);
  }

  const sets = [];
  const params = [];
  for (const field of ['name', 'code', 'description']) {
    if (field === 'description') {
      if (description !== undefined) {
        params.push(description ?? null);
        sets.push(`description = $${params.length}`);
      }
    } else if (field === 'name' && name !== undefined) {
      params.push(name);
      sets.push(`name = $${params.length}`);
    } else if (field === 'code' && code !== undefined) {
      params.push(code);
      sets.push(`code = $${params.length}`);
    }
  }
  params.push(id);

  const { rows } = await query(
    `UPDATE courses
        SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${params.length}
      RETURNING id, name, code, description, created_at, updated_at`,
    params
  );
  return rows[0] ?? null;
};

export const deleteCourse = async (id) => {
  const { rows } = await query('DELETE FROM courses WHERE id = $1 RETURNING id', [id]);
  return rows[0] ?? null;
};

export const countUsersInCourse = async (id) => {
  const { rows } = await query(
    'SELECT COUNT(*)::int AS count FROM users WHERE course_id = $1',
    [id]
  );
  return rows[0].count;
};