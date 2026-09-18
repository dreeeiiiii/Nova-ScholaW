import { query } from '../../shared/config/db.js';

const MEDIA_COLUMNS = `
  id, uploader_id, category_id, media_type, file_url,
  original_filename, caption, duration_seconds, status,
  reviewed_by, reviewed_at, rejection_reason, featured, created_at, updated_at
`;

const GM_COLUMNS = `
  gm.id, gm.uploader_id, gm.category_id, gm.media_type, gm.file_url,
  gm.original_filename, gm.caption, gm.duration_seconds, gm.status,
  gm.reviewed_by, gm.reviewed_at, gm.rejection_reason, gm.featured, gm.created_at, gm.updated_at
`;

const GM_WITH_JOINS_COLUMNS = `
  gm.id, gm.uploader_id, gm.category_id, gm.media_type, gm.file_url,
  gm.original_filename, gm.caption, gm.duration_seconds, gm.status,
  gm.reviewed_by, gm.reviewed_at, gm.rejection_reason, gm.featured, gm.created_at, gm.updated_at,
  c.name AS category_name, u.full_name AS uploader_name, u.email AS uploader_email
`;

const MEDIA_JOINS = `
  LEFT JOIN categories c ON c.id = gm.category_id
  LEFT JOIN users u ON u.id = gm.uploader_id
`;

export const insertMedia = async ({ uploader_id, category_id, media_type, file_url, original_filename, caption }) => {
  const { rows } = await query(
    `INSERT INTO gallery_media (uploader_id, category_id, media_type, file_url, original_filename, caption, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING ${MEDIA_COLUMNS}`,
    [uploader_id, category_id, media_type, file_url, original_filename, caption]
  );
  return rows[0];
};

export const findById = async (id) => {
  const { rows } = await query(`SELECT * FROM gallery_media WHERE id = $1`, [id]);
  return rows[0] ?? null;
};

export const listPending = async () => {
  const { rows } = await query(
    `SELECT ${GM_WITH_JOINS_COLUMNS}
       FROM gallery_media gm
       ${MEDIA_JOINS}
      WHERE gm.status = 'pending'
      ORDER BY gm.created_at DESC`
  );
  return rows;
};

export const approve = async (id, reviewerId) => {
  const { rows } = await query(
    `UPDATE gallery_media
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
     WHERE id = $2
     RETURNING ${MEDIA_COLUMNS}`,
    [reviewerId, id]
  );
  return rows[0] ?? null;
};

export const reject = async (id, reviewerId, rejection_reason) => {
  const { rows } = await query(
    `UPDATE gallery_media
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), rejection_reason = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING ${MEDIA_COLUMNS}`,
    [reviewerId, rejection_reason, id]
  );
  return rows[0] ?? null;
};

export const listByUploader = async (uploaderId) => {
  const { rows } = await query(
    `SELECT ${GM_COLUMNS}
       FROM gallery_media gm
      WHERE gm.uploader_id = $1
      ORDER BY gm.created_at DESC`,
    [uploaderId]
  );
  return rows;
};

export const browse = async ({ category_id, year, month, media_type, featured, limit = 20, offset = 0 } = {}) => {
  const conditions = [`gm.status = 'approved'`];
  const params = [];
  let paramIndex = 1;

  if (category_id) {
    params.push(category_id);
    conditions.push(`gm.category_id = $${paramIndex++}`);
  }
  if (year) {
    params.push(year);
    conditions.push(`EXTRACT(YEAR FROM gm.created_at) = $${paramIndex++}`);
  }
  if (month) {
    params.push(month);
    conditions.push(`EXTRACT(MONTH FROM gm.created_at) = $${paramIndex++}`);
  }
  if (media_type) {
    params.push(media_type);
    conditions.push(`gm.media_type = $${paramIndex++}`);
  }
  if (featured === true) {
    conditions.push(`gm.featured = true`);
  }

  const limitNum = Math.min(Number(limit) || 20, 100);
  const offsetNum = Number(offset) || 0;

  params.push(limitNum);
  const limitParam = params.length;
  params.push(offsetNum);
  const offsetParam = params.length;

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: media } = await query(
    `SELECT ${GM_WITH_JOINS_COLUMNS}
       FROM gallery_media gm
       ${MEDIA_JOINS}
       ${whereClause}
       ORDER BY gm.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
    params
  );

  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total
       FROM gallery_media gm
       ${whereClause}`,
    params.slice(0, paramIndex - 1)
  );

  return { media, total: countRows[0].total };
};

export const findApprovedById = async (id) => {
  const { rows } = await query(
    `SELECT ${GM_WITH_JOINS_COLUMNS}
       FROM gallery_media gm
       ${MEDIA_JOINS}
      WHERE gm.id = $1 AND gm.status = 'approved'`,
    [id]
  );
  return rows[0] ?? null;
};

export const search = async (searchTerm, limit = 50) => {
  const pattern = `%${searchTerm}%`;
  const { rows: media } = await query(
    `SELECT ${GM_WITH_JOINS_COLUMNS}
       FROM gallery_media gm
       ${MEDIA_JOINS}
      WHERE gm.status = 'approved'
        AND (
          gm.caption ILIKE $1
          OR gm.original_filename ILIKE $1
          OR c.name ILIKE $1
        )
       ORDER BY gm.created_at DESC
       LIMIT $2`,
    [pattern, limit]
  );

  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total
       FROM gallery_media gm
       LEFT JOIN categories c ON c.id = gm.category_id
      WHERE gm.status = 'approved'
        AND (
          gm.caption ILIKE $1
          OR gm.original_filename ILIKE $1
          OR c.name ILIKE $1
        )`,
    [pattern]
  );

  return { media, total: countRows[0].total };
};

export const setFeatured = async (id, featured) => {
  const { rows } = await query(
    `UPDATE gallery_media
        SET featured = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING ${MEDIA_COLUMNS}`,
    [featured, id]
  );
  return rows[0] ?? null;
};

export default {
  insertMedia,
  findById,
  listPending,
  approve,
  reject,
  listByUploader,
  browse,
  findApprovedById,
  search,
};
