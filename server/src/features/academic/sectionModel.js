import { query } from '../../shared/config/db.js';

export const listSections = async () => {
  const { rows } = await query(
    `SELECT id, name, grade_level, created_at, updated_at
       FROM sections
      ORDER BY grade_level, name`
  );
  return rows;
};

export const findSectionById = async (id) => {
  const { rows } = await query(
    `SELECT id, name, grade_level, created_at, updated_at
       FROM sections
      WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
};

export const createSection = async ({ name, grade_level }) => {
  const { rows } = await query(
    `INSERT INTO sections (name, grade_level)
     VALUES ($1, $2)
     RETURNING id, name, grade_level, created_at, updated_at`,
    [name, grade_level]
  );
  return rows[0];
};

export const updateSection = async (id, { name, grade_level }) => {
  if (name === undefined && grade_level === undefined) return findSectionById(id);

  const sets = [];
  const params = [];
  if (name !== undefined) {
    params.push(name);
    sets.push(`name = $${params.length}`);
  }
  if (grade_level !== undefined) {
    params.push(grade_level);
    sets.push(`grade_level = $${params.length}`);
  }
  params.push(id);

  const { rows } = await query(
    `UPDATE sections
        SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${params.length}
      RETURNING id, name, grade_level, created_at, updated_at`,
    params
  );
  return rows[0] ?? null;
};

export const deleteSection = async (id) => {
  const { rows } = await query(
    'DELETE FROM sections WHERE id = $1 RETURNING id',
    [id]
  );
  return rows[0] ?? null;
};

export const countUsersInSection = async (id) => {
  const { rows } = await query(
    'SELECT COUNT(*)::int AS count FROM users WHERE section_id = $1',
    [id]
  );
  return rows[0].count;
};