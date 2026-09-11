import { query } from '../config/db.js';

export const listCategories = async () => {
  const { rows } = await query(
    `SELECT id, name, description, created_by, created_at, updated_at
       FROM categories
       ORDER BY name`
  );
  return rows;
};

export const findCategoryById = async (id) => {
  const { rows } = await query(
    `SELECT id, name, description, created_by, created_at, updated_at
       FROM categories
      WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
};

export const createCategory = async ({ name, description, created_by }) => {
  const { rows } = await query(
    `INSERT INTO categories (name, description, created_by)
     VALUES ($1, $2, $3)
     RETURNING id, name, description, created_by, created_at, updated_at`,
    [name, description ?? null, created_by]
  );
  return rows[0];
};

export const updateCategory = async (id, { name, description }) => {
  if (name === undefined && description === undefined) return findCategoryById(id);

  const sets = [];
  const params = [];
  if (name !== undefined) {
    params.push(name);
    sets.push(`name = $${params.length}`);
  }
  if (description !== undefined) {
    params.push(description ?? null);
    sets.push(`description = $${params.length}`);
  }
  params.push(id);

  const { rows } = await query(
    `UPDATE categories
        SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${params.length}
      RETURNING id, name, description, created_by, created_at, updated_at`,
    params
  );
  return rows[0] ?? null;
};

export const deleteCategory = async (id) => {
  const { rows } = await query(
    'DELETE FROM categories WHERE id = $1 RETURNING id',
    [id]
  );
  return rows[0] ?? null;
};

export const countMediaInCategory = async (id) => {
  const { rows } = await query(
    'SELECT COUNT(*)::int AS count FROM gallery_media WHERE category_id = $1',
    [id]
  );
  return rows[0].count;
};

export const findCategoryByName = async (name) => {
  const { rows } = await query(
    `SELECT id, name, description, created_by, created_at, updated_at
       FROM categories
      WHERE name = $1`,
    [name]
  );
  return rows[0] ?? null;
};
