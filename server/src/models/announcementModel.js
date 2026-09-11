import { query, getClient } from '../config/db.js';

const ANNOUNCEMENT_COLUMNS = `
  id, author_id, type, title, content, image_url, status, publish_at, expires_at,
  created_at, updated_at
`;

export const createAnnouncement = async ({
  author_id,
  type,
  title,
  content,
  image_url,
  status,
  publish_at,
  expires_at,
}) => {
  const { rows } = await query(
    `INSERT INTO announcements (author_id, type, title, content, image_url, status, publish_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${ANNOUNCEMENT_COLUMNS}`,
    [author_id, type, title, content, image_url ?? null, status, publish_at ?? null, expires_at ?? null]
  );
  return rows[0];
};

export const findById = async (id) => {
  const { rows } = await query(
    `SELECT ${ANNOUNCEMENT_COLUMNS} FROM announcements WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
};

const SCHEDULING_FILTER = `(publish_at IS NULL OR publish_at <= NOW()) AND (expires_at IS NULL OR expires_at > NOW())`;
const SCHEDULING_FILTER_ALIAS = `(a.publish_at IS NULL OR a.publish_at <= NOW()) AND (a.expires_at IS NULL OR a.expires_at > NOW())`;

export const getEffectiveStatus = (announcement) => {
  if (!announcement) return 'draft';
  const now = new Date();
  const publishAt = announcement.publish_at ? new Date(announcement.publish_at) : null;
  const expiresAt = announcement.expires_at ? new Date(announcement.expires_at) : null;

  if (announcement.status === 'draft') return 'draft';
  if (publishAt && publishAt > now) return 'scheduled';
  if (expiresAt && expiresAt <= now) return 'expired';
  return announcement.status || 'draft';
};

export const listAnnouncements = async ({ type, author_id, status, limit = 50, offset = 0 } = {}) => {
  const conditions = [];
  const params = [];

  if (type) {
    params.push(type);
    conditions.push(`a.type = $${params.length}`);
  }
  if (author_id) {
    params.push(author_id);
    conditions.push(`a.author_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`a.status = $${params.length}`);
  }

conditions.push(SCHEDULING_FILTER_ALIAS);

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(limit);
  const limitParam = params.length;
  params.push(offset);
  const offsetParam = params.length;

  const { rows } = await query(
    `SELECT a.${ANNOUNCEMENT_COLUMNS.split(',').join(', a.')}, u.full_name AS author_name
       FROM announcements a
       LEFT JOIN users u ON u.id = a.author_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
     params
   );
   return rows;
 };

export const listForStudent = async ({ userId, section_id, course_id, limit = 50, offset = 0 } = {}) => {
  const conditions = [];
  const params = [userId];
  let paramIndex = 1;

  if (section_id !== null && section_id !== undefined) {
    paramIndex++;
    params.push(section_id);
    conditions.push(`at.target_type = 'section' AND at.section_id = $${paramIndex}`);
  }
  if (course_id !== null && course_id !== undefined) {
    paramIndex++;
    params.push(course_id);
    conditions.push(`at.target_type = 'course' AND at.course_id = $${paramIndex}`);
  }
  conditions.push(`at.target_type = 'student' AND at.student_id = $1`);

  params.push(limit);
  const limitParam = params.length;
  params.push(offset);
  const offsetParam = params.length;

  const targetConditions = conditions.join(' OR ');
const { rows } = await query(
    `SELECT DISTINCT a.${ANNOUNCEMENT_COLUMNS.split(',').join(', a.')}, u.full_name AS author_name
       FROM announcements a
       LEFT JOIN announcement_targets at ON at.announcement_id = a.id
       LEFT JOIN users u ON u.id = a.author_id
WHERE a.status = 'published'
          AND ${SCHEDULING_FILTER_ALIAS}
         AND (
           a.type = 'general'
           OR (
             a.type = 'class'
             AND (${targetConditions})
           )
         )
       ORDER BY a.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
     params
   );
  return rows;
};

export const updateAnnouncement = async (id, fields = {}) => {
  const allowedFields = ['title', 'content', 'image_url', 'status', 'publish_at', 'expires_at'];
  const sets = [];
  const params = [];

  for (const field of allowedFields) {
    if (fields[field] !== undefined) {
      params.push(fields[field]);
      sets.push(`${field} = $${params.length}`);
    }
  }

  if (sets.length === 0) return findById(id);

  params.push(id);
  const { rows } = await query(
    `UPDATE announcements
       SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${params.length}
     RETURNING ${ANNOUNCEMENT_COLUMNS}`,
    params
  );
  return rows[0] ?? null;
};

export const deleteAnnouncement = async (id) => {
  const { rows } = await query('DELETE FROM announcements WHERE id = $1 RETURNING id', [id]);
  return rows[0] ?? null;
};

export const addTargets = async (announcement_id, targets) => {
  if (!targets || targets.length === 0) return [];

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const inserted = [];
    for (const target of targets) {
      const { rows } = await client.query(
        `INSERT INTO announcement_targets (announcement_id, target_type, section_id, course_id, student_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, announcement_id, target_type, section_id, course_id, student_id, created_at`,
        [
          announcement_id,
          target.target_type,
          target.section_id ?? null,
          target.course_id ?? null,
          target.student_id ?? null,
        ]
      );
      inserted.push(rows[0]);
    }
    await client.query('COMMIT');
    return inserted;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const removeTargets = async (announcement_id) => {
  await query('DELETE FROM announcement_targets WHERE announcement_id = $1', [announcement_id]);
};

export const getTargets = async (announcement_id) => {
  const { rows } = await query(
    `SELECT id, announcement_id, target_type, section_id, course_id, student_id, created_at
       FROM announcement_targets
      WHERE announcement_id = $1
      ORDER BY created_at`,
    [announcement_id]
  );
  return rows;
};

export const countAnnouncements = async ({ type, author_id, status } = {}) => {
  const conditions = [];
  const params = [];

  if (type) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }
  if (author_id) {
    params.push(author_id);
    conditions.push(`author_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  conditions.push(SCHEDULING_FILTER);

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT COUNT(*)::int AS total FROM announcements ${where}`,
    params
  );
  return rows[0].total;
};

export const findPublishedGeneral = async ({ limit = 20 } = {}) => {
  const { rows } = await query(
    `SELECT id, title, content, image_url, created_at
       FROM announcements
      WHERE type = 'general'
        AND status = 'published'
        AND (publish_at IS NULL OR publish_at <= NOW())
        AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC
       LIMIT $1`,
    [limit]
  );
  return { rows };
};

export const findWithTargets = async (id) => {
  const announcement = await findById(id);
  if (!announcement) return null;
  const targets = await getTargets(id);
  return { ...announcement, targets };
};