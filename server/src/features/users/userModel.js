import { query } from '../../shared/config/db.js';

const SAFE_COLUMNS = `
  id, email, password_hash, full_name, role, section_id, course_id,
  is_active, last_login_at, created_at, updated_at
`;

const PUBLIC_COLUMNS = `
  id, email, full_name, role, section_id, course_id,
  is_active, last_login_at, created_at, updated_at
`;

const UPDATABLE_FIELDS = ['full_name', 'role', 'section_id', 'course_id'];

export const findById = async (id) => {
  const { rows } = await query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
};

export const findByIdWithJoins = async (id) => {
  const { rows } = await query(
    `SELECT u.id, u.email, u.full_name, u.role, u.section_id, u.course_id,
            u.is_active, u.last_login_at, u.created_at,
            s.name AS section_name,
            c.name AS course_name
       FROM users u
       LEFT JOIN sections s ON s.id = u.section_id
       LEFT JOIN courses c ON c.id = u.course_id
      WHERE u.id = $1`,
    [id]
  );
  return rows[0] ?? null;
};

export const findByEmail = async (email) => {
  const { rows } = await query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE email = $1`, [email]);
  return rows[0] ?? null;
};

export const findByEmailWithHash = async (email) => {
  const { rows } = await query(`SELECT ${SAFE_COLUMNS} FROM users WHERE email = $1`, [email]);
  return rows[0] ?? null;
};

const buildFilter = ({ role, search }) => {
  const conditions = [];
  const params = [];

  if (role) {
    params.push(role);
    conditions.push(`u.role = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(u.email ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`
    );
  }

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
};

export const listUsers = async ({ role, search, limit = 50, offset = 0 } = {}) => {
  const { where, params } = buildFilter({ role, search });

  params.push(limit);
  const limitParam = params.length;
  params.push(offset);
  const offsetParam = params.length;

  const { rows } = await query(
    `SELECT u.id, u.email, u.full_name, u.role, u.section_id, u.course_id,
            u.is_active, u.last_login_at, u.created_at, u.updated_at,
            s.name AS section_name,
            c.name AS course_name
       FROM users u
       LEFT JOIN sections s ON s.id = u.section_id
       LEFT JOIN courses c ON c.id = u.course_id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
    params
  );
  return rows;
};

export const countUsers = async ({ role, search } = {}) => {
  const { where, params } = buildFilter({ role, search });

  const { rows } = await query(
    `SELECT COUNT(*)::int AS total
       FROM users u
       ${where}`,
    params
  );
  return rows[0].total;
};

export const createUser = async ({
  email,
  password_hash,
  full_name,
  role,
  section_id = null,
  course_id = null,
}) => {
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, full_name, role, section_id, course_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, full_name, role, section_id, course_id,
               is_active, last_login_at, created_at, updated_at`,
    [email, password_hash, full_name, role, section_id, course_id]
  );
  return rows[0];
};

export const updateUser = async (id, fields = {}) => {
  const sets = [];
  const params = [];

  for (const field of UPDATABLE_FIELDS) {
    if (fields[field] !== undefined) {
      params.push(fields[field]);
      sets.push(`${field} = $${params.length}`);
    }
  }

  if (sets.length === 0) return findById(id);

  params.push(id);
  const { rows } = await query(
    `UPDATE users
        SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${params.length}
      RETURNING id, email, full_name, role, section_id, course_id,
                is_active, last_login_at, created_at, updated_at`,
    params
  );
  return rows[0] ?? null;
};

export const deactivateUser = async (id) => {
  const { rows } = await query(
    `UPDATE users
        SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, full_name, role, section_id, course_id,
                is_active, last_login_at, created_at, updated_at`,
    [id]
  );
  return rows[0] ?? null;
};

export const activateUser = async (id) => {
  const { rows } = await query(
    `UPDATE users
        SET is_active = TRUE, updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, full_name, role, section_id, course_id,
                is_active, last_login_at, created_at, updated_at`,
    [id]
  );
  return rows[0] ?? null;
};

export const updateLastLogin = async (id) => {
  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [id]);
};