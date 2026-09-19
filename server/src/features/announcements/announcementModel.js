import { query, getClient } from '../../shared/config/db.js';

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

export const listAnnouncements = async ({ type, author_id, status, limit = 50, offset = 0, q } = {}) => {
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
  if (typeof q === 'string' && q.trim() !== '') {
    params.push(`%${q.trim()}%`);
    const qIdx = params.length;
    conditions.push(`(a.title ILIKE $${qIdx} OR a.content ILIKE $${qIdx})`);
  }

  if (status === 'scheduled') {
    conditions.push(`a.publish_at IS NOT NULL AND a.publish_at > NOW()`);
  } else {
    conditions.push(SCHEDULING_FILTER_ALIAS);
  }

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

export const listUpcoming = async ({ limit = 10, offset = 0 } = {}) => {
  const limitNum = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const offsetNum = Math.max(Number(offset) || 0, 0);
  const { rows } = await query(
    `SELECT a.${ANNOUNCEMENT_COLUMNS.split(',').join(', a.')}, u.full_name AS author_name
       FROM announcements a
       LEFT JOIN users u ON u.id = a.author_id
      WHERE a.publish_at IS NOT NULL AND a.publish_at > NOW()
      ORDER BY a.publish_at ASC
      LIMIT $1 OFFSET $2`,
    [limitNum, offsetNum]
  );
  return rows;
};

export const countUpcoming = async () => {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total FROM announcements WHERE publish_at IS NOT NULL AND publish_at > NOW()`
  );
  return rows[0].total;
};

export const listUpcomingForStudent = async ({ userId, section_id, course_id, limit = 10, offset = 0 } = {}) => {
  const limitNum = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const offsetNum = Math.max(Number(offset) || 0, 0);
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
  const targetConditions = conditions.join(' OR ');

  const { rows } = await query(
    `SELECT DISTINCT a.${ANNOUNCEMENT_COLUMNS.split(',').join(', a.')}, u.full_name AS author_name
       FROM announcements a
       LEFT JOIN announcement_targets at ON at.announcement_id = a.id
       LEFT JOIN users u ON u.id = a.author_id
      WHERE a.publish_at IS NOT NULL AND a.publish_at > NOW()
        AND (
          a.type = 'general'
          OR (
            a.type = 'class'
            AND (${targetConditions})
          )
        )
      ORDER BY a.publish_at ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limitNum, offsetNum]
  );
  return rows;
};

export const countUpcomingForStudent = async ({ userId, section_id, course_id } = {}) => {
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
  const targetConditions = conditions.join(' OR ');

  const { rows } = await query(
    `SELECT COUNT(DISTINCT a.id)::int AS total
       FROM announcements a
       LEFT JOIN announcement_targets at ON at.announcement_id = a.id
      WHERE a.publish_at IS NOT NULL AND a.publish_at > NOW()
        AND (
          a.type = 'general'
          OR (
            a.type = 'class'
            AND (${targetConditions})
          )
        )`,
    params
  );
  return rows[0].total;
};

export const listForStudent = async ({ userId, section_id, course_id, limit = 50, offset = 0, q } = {}) => {
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

  const hasQ = typeof q === 'string' && q.trim() !== '';
  let qIdx = null;
  if (hasQ) {
    params.push(`%${q.trim()}%`);
    qIdx = params.length;
  }

  params.push(limit);
  const limitParam = params.length;
  params.push(offset);
  const offsetParam = params.length;

  const targetConditions = conditions.join(' OR ');
  const qCondition = hasQ ? ` AND (a.title ILIKE $${qIdx} OR a.content ILIKE $${qIdx})` : '';
const { rows } = await query(
    `SELECT DISTINCT a.${ANNOUNCEMENT_COLUMNS.split(',').join(', a.')}, u.full_name AS author_name
       FROM announcements a
       LEFT JOIN announcement_targets at ON at.announcement_id = a.id
       LEFT JOIN users u ON u.id = a.author_id
WHERE a.status = 'published'
          AND ${SCHEDULING_FILTER_ALIAS}${qCondition}
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

export const getTargets = async (announcement_id) => {
  const { rows } = await query(
    `SELECT at.id, at.announcement_id, at.target_type, at.section_id, at.course_id, at.student_id, at.created_at,
            s.name AS section_name, c.name AS course_name, u.full_name AS student_full_name, u.email AS student_email
       FROM announcement_targets at
       LEFT JOIN sections s ON s.id = at.section_id
       LEFT JOIN courses c ON c.id = at.course_id
       LEFT JOIN users u ON u.id = at.student_id
      WHERE at.announcement_id = $1
      ORDER BY at.created_at`,
    [announcement_id]
  );
  return rows;
};

export const countAnnouncements = async ({ type, author_id, status, q } = {}) => {
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
  if (typeof q === 'string' && q.trim() !== '') {
    params.push(`%${q.trim()}%`);
    const qIdx = params.length;
    conditions.push(`(title ILIKE $${qIdx} OR content ILIKE $${qIdx})`);
  }

  if (status === 'scheduled') {
    conditions.push(`publish_at IS NOT NULL AND publish_at > NOW()`);
  } else {
    conditions.push(SCHEDULING_FILTER);
  }

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

export const createClassWithTargets = async ({ author_id, title, content, image_url, status, publish_at, expires_at, section_ids, course_ids, student_ids }) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { rows: annRows } = await client.query(
      `INSERT INTO announcements (author_id, type, title, content, image_url, status, publish_at, expires_at)
       VALUES ($1, 'class', $2, $3, $4, $5, $6, $7)
       RETURNING ${ANNOUNCEMENT_COLUMNS}`,
      [author_id, title, content, image_url ?? null, status, publish_at ?? null, expires_at ?? null]
    );
    const announcement = annRows[0];

    const targets = [];
    for (const section_id of section_ids) {
      const { rows } = await client.query(
        `INSERT INTO announcement_targets (announcement_id, target_type, section_id)
         VALUES ($1, 'section', $2)
         RETURNING id, announcement_id, target_type, section_id, course_id, student_id, created_at`,
        [announcement.id, section_id]
      );
      targets.push(rows[0]);
    }
    for (const course_id of course_ids) {
      const { rows } = await client.query(
        `INSERT INTO announcement_targets (announcement_id, target_type, course_id)
         VALUES ($1, 'course', $2)
         RETURNING id, announcement_id, target_type, section_id, course_id, student_id, created_at`,
        [announcement.id, course_id]
      );
      targets.push(rows[0]);
    }
    for (const student_id of student_ids) {
      const { rows } = await client.query(
        `INSERT INTO announcement_targets (announcement_id, target_type, student_id)
         VALUES ($1, 'student', $2)
         RETURNING id, announcement_id, target_type, section_id, course_id, student_id, created_at`,
        [announcement.id, student_id]
      );
      targets.push(rows[0]);
    }

    await client.query('COMMIT');
    return { announcement, targets };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const updateWithTargets = async (id, { fields = {}, section_ids, course_ids, student_ids }) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    let announcement;
    if (Object.keys(fields).length > 0) {
      const sets = [];
      const params = [];
      for (const [key, value] of Object.entries(fields)) {
        params.push(value);
        sets.push(`${key} = $${params.length}`);
      }
      params.push(id);
      const { rows } = await client.query(
        `UPDATE announcements
           SET ${sets.join(', ')}, updated_at = NOW()
         WHERE id = $${params.length}
         RETURNING ${ANNOUNCEMENT_COLUMNS}`,
        params
      );
      announcement = rows[0];
    } else {
      announcement = await findById(id);
    }

    await client.query('DELETE FROM announcement_targets WHERE announcement_id = $1', [id]);

    const targets = [];
    for (const section_id of section_ids ?? []) {
      const { rows } = await client.query(
        `INSERT INTO announcement_targets (announcement_id, target_type, section_id)
         VALUES ($1, 'section', $2)
         RETURNING id, announcement_id, target_type, section_id, course_id, student_id, created_at`,
        [id, section_id]
      );
      targets.push(rows[0]);
    }
    for (const course_id of course_ids ?? []) {
      const { rows } = await client.query(
        `INSERT INTO announcement_targets (announcement_id, target_type, course_id)
         VALUES ($1, 'course', $2)
         RETURNING id, announcement_id, target_type, section_id, course_id, student_id, created_at`,
        [id, course_id]
      );
      targets.push(rows[0]);
    }
    for (const student_id of student_ids ?? []) {
      const { rows } = await client.query(
        `INSERT INTO announcement_targets (announcement_id, target_type, student_id)
         VALUES ($1, 'student', $2)
         RETURNING id, announcement_id, target_type, section_id, course_id, student_id, created_at`,
        [id, student_id]
      );
      targets.push(rows[0]);
    }

    await client.query('COMMIT');
    return { announcement, targets };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};