import { query } from '../../shared/config/db.js';

const MEDIA_COLUMNS = `
  id, uploader_id, category_id, media_type, file_url, b2_key,
  original_filename, caption, duration_seconds, status,
  reviewed_by, reviewed_at, rejection_reason, featured, created_at, updated_at
`;

const GM_COLUMNS = `
  gm.id, gm.uploader_id, gm.category_id, gm.media_type, gm.file_url, gm.b2_key,
  gm.original_filename, gm.caption, gm.duration_seconds, gm.status,
  gm.reviewed_by, gm.reviewed_at, gm.rejection_reason, gm.featured, gm.created_at, gm.updated_at
`;

const GM_WITH_JOINS_COLUMNS = `
  gm.id, gm.uploader_id, gm.category_id, gm.media_type, gm.file_url, gm.b2_key,
  gm.original_filename, gm.caption, gm.duration_seconds, gm.status,
  gm.reviewed_by, gm.reviewed_at, gm.rejection_reason, gm.featured, gm.created_at, gm.updated_at,
  c.name AS category_name, u.full_name AS uploader_name, u.email AS uploader_email
`;

const MEDIA_JOINS = `
  LEFT JOIN categories c ON c.id = gm.category_id
  LEFT JOIN users u ON u.id = gm.uploader_id
`;

export const insertMedia = async ({ uploader_id, category_id, media_type, file_url, b2_key, original_filename, caption, status = 'pending', reviewed_by = null, reviewed_at = null, rejection_reason = null, featured = false }) => {
  const { rows } = await query(
    `INSERT INTO gallery_media (uploader_id, category_id, media_type, file_url, b2_key, original_filename, caption, status, reviewed_by, reviewed_at, rejection_reason, featured)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING ${MEDIA_COLUMNS}`,
    [uploader_id, category_id, media_type, file_url, b2_key ?? null, original_filename, caption, status, reviewed_by, reviewed_at, rejection_reason, featured]
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
      WHERE gm.status = 'pending' AND gm.media_type = 'image'
      ORDER BY gm.created_at DESC`
  );
  return rows;
};

export const approve = async (id, reviewerId) => {
  const { rows } = await query(
    `UPDATE gallery_media
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
     WHERE id = $2 AND status = 'pending' AND media_type = 'image'
     RETURNING ${MEDIA_COLUMNS}`,
    [reviewerId, id]
  );
  return rows[0] ?? null;
};

export const reject = async (id, reviewerId, rejection_reason) => {
  const { rows } = await query(
    `UPDATE gallery_media
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), rejection_reason = $2, updated_at = NOW()
     WHERE id = $3 AND status = 'pending' AND media_type = 'image'
     RETURNING ${MEDIA_COLUMNS}`,
    [reviewerId, rejection_reason, id]
  );
  return rows[0] ?? null;
};

export const listByUploader = async (uploaderId) => {
  const { rows } = await query(
    `SELECT ${GM_COLUMNS}
       FROM gallery_media gm
      WHERE gm.uploader_id = $1 AND gm.media_type = 'image'
      ORDER BY gm.created_at DESC`,
    [uploaderId]
  );
  return rows;
};

export const browse = async ({ category_id, year, month, media_type, featured, limit = 20, offset = 0 } = {}) => {
  const conditions = [`gm.status = 'approved'`, `gm.media_type = 'image'`];
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

  const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const offsetNum = Math.max(Number(offset) || 0, 0);

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
      WHERE gm.id = $1 AND gm.status = 'approved' AND gm.media_type = 'image'`,
    [id]
  );
  return rows[0] ?? null;
};

export const search = async ({ q, category_id, year, media_type, limit = 20, offset = 0 } = {}) => {

  const pattern = `%${q}%`;
  const conditions = [`gm.status = 'approved'`, `gm.media_type = 'image'`, `(gm.caption ILIKE $1 OR gm.original_filename ILIKE $1 OR c.name ILIKE $1)`];
  const params = [pattern];
  let paramIndex = 2;

  if (category_id !== undefined && category_id !== null) {
    params.push(category_id);
    conditions.push(`gm.category_id = $${paramIndex++}`);
  }
  if (year !== undefined && year !== null) {
    params.push(year);
    conditions.push(`EXTRACT(YEAR FROM gm.created_at) = $${paramIndex++}`);
  }
  if (media_type) {
    params.push(media_type);
    conditions.push(`gm.media_type = $${paramIndex++}`);
  }

  const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const offsetNum = Math.max(Number(offset) || 0, 0);

  params.push(limitNum);
  const limitParam = params.length;
  params.push(offsetNum);
  const offsetParam = params.length;

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

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
       ${MEDIA_JOINS}
       ${whereClause}`,
    params.slice(0, paramIndex - 1)
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

export const updateCategory = async (id, categoryId) => {
  const { rows } = await query(
    `UPDATE gallery_media
        SET category_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING ${MEDIA_COLUMNS}`,
    [categoryId, id]
  );
  return rows[0] ?? null;
};

export const withdrawMedia = async id => (await query(
  "UPDATE gallery_media SET status='rejected',rejection_reason='Withdrawn from gallery',updated_at=NOW() WHERE id=$1 RETURNING *",[id])).rows[0]??null;

export const listRecent = async ({ limit = 50 } = {}) => {
  const limitNum = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const { rows } = await query(
    `SELECT ${GM_WITH_JOINS_COLUMNS}
       FROM gallery_media gm
       ${MEDIA_JOINS}
      WHERE gm.status = 'approved' AND gm.media_type = 'image'
        AND gm.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY gm.created_at DESC
      LIMIT $1`,
    [limitNum]
  );
  return rows;
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
  setFeatured,
  updateCategory,
  withdrawMedia,
  listRecent,
};
