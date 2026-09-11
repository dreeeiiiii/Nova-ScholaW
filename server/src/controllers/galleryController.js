import { query } from '../config/db.js';
import fs from 'node:fs';
import { uploadMedia, handleGalleryUploadError } from '../middleware/galleryUpload.js';
import { validateUploadedFile } from '../utils/validateMedia.js';

const parseId = (raw) => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const getFileUrl = (file) => {
  const isVideo = file.mimetype === 'video/mp4';
  const subfolder = isVideo ? 'videos' : 'images';
  return `/uploads/gallery/${subfolder}/${file.filename}`;
};

const determineMediaType = (file) => {
  if (file.mimetype === 'video/mp4') return 'video';
  return 'image';
};

export const uploadMediaHandler = [uploadMedia, handleGalleryUploadError, async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ status: 400, message: 'No file provided.' });
    }

    const categoryId = req.body.category_id;
    const title = req.body.title;
    const description = req.body.description || '';

    if (!categoryId) {
      fs.unlink(file.path, () => {});
      return res.status(400).json({ status: 400, message: 'category_id is required.' });
    }
    if (!title || title.trim() === '') {
      fs.unlink(file.path, () => {});
      return res.status(400).json({ status: 400, message: 'title is required.' });
    }

    const mediaType = determineMediaType(file);
    await validateUploadedFile(file, mediaType);

    const fileUrl = getFileUrl(file);

    try {
      const { rows } = await query(
        `INSERT INTO gallery_media (uploader_id, category_id, media_type, file_url, original_filename, caption, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         RETURNING id, uploader_id, category_id, media_type, file_url, original_filename, caption, duration_seconds, status, reviewed_by, reviewed_at, rejection_reason, created_at, updated_at`,
        [req.user.id, categoryId, mediaType, fileUrl, file.originalname, description]
      );

      return res.status(201).json({ media: rows[0] });
    } catch (dbErr) {
      if (dbErr.code === '23503') {
        fs.unlink(file.path, () => {});
        return res.status(400).json({ status: 400, message: 'category_id does not exist.' });
      }
      throw dbErr;
    }
  } catch (err) {
    if (err.message && (err.message.includes('Invalid file type') || err.message.includes('File too large') || err.message.includes('Could not validate') || err.message.includes('Could not determine') || err.message.includes('Unknown media type'))) {
      return res.status(400).json({ status: 400, message: err.message });
    }
    return next(err);
  }
}];

export const listPendingMedia = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT gm.id, gm.uploader_id, gm.category_id, gm.media_type, gm.file_url,
              gm.original_filename, gm.caption, gm.duration_seconds, gm.status,
              gm.reviewed_by, gm.reviewed_at, gm.rejection_reason, gm.created_at, gm.updated_at,
              c.name AS category_name, u.full_name AS uploader_name, u.email AS uploader_email
         FROM gallery_media gm
         LEFT JOIN categories c ON c.id = gm.category_id
         LEFT JOIN users u ON u.id = gm.uploader_id
        WHERE gm.status = 'pending'
        ORDER BY gm.created_at DESC`,
      []
    );
    return res.json({ media: rows });
  } catch (err) {
    return next(err);
  }
};

export const approveMedia = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid media id.' });
    }

    const existing = await query(
      `SELECT * FROM gallery_media WHERE id = $1`,
      [id]
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ status: 404, message: 'Media not found.' });
    }

    if (existing.rows[0].status !== 'pending') {
      return res.status(400).json({ status: 400, message: 'Media is not pending approval.' });
    }

    const { rows } = await query(
      `UPDATE gallery_media
         SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING id, uploader_id, category_id, media_type, file_url, original_filename, caption, duration_seconds, status, reviewed_by, reviewed_at, rejection_reason, created_at, updated_at`,
      [req.user.id, id]
    );

    return res.json({ media: rows[0] });
  } catch (err) {
    return next(err);
  }
};

export const rejectMedia = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid media id.' });
    }

    const { rejection_reason } = req.body || {};
    if (!rejection_reason || rejection_reason.trim() === '') {
      return res.status(400).json({ status: 400, message: 'rejection_reason is required.' });
    }

    const existing = await query(
      `SELECT * FROM gallery_media WHERE id = $1`,
      [id]
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ status: 404, message: 'Media not found.' });
    }

    if (existing.rows[0].status !== 'pending') {
      return res.status(400).json({ status: 400, message: 'Media is not pending approval.' });
    }

    const { rows } = await query(
      `UPDATE gallery_media
         SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), rejection_reason = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, uploader_id, category_id, media_type, file_url, original_filename, caption, duration_seconds, status, reviewed_by, reviewed_at, rejection_reason, created_at, updated_at`,
      [req.user.id, rejection_reason, id]
    );

    return res.json({ media: rows[0] });
  } catch (err) {
    return next(err);
  }
};

export const myUploads = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT gm.id, gm.uploader_id, gm.category_id, gm.media_type, gm.file_url,
              gm.original_filename, gm.caption, gm.duration_seconds, gm.status,
              gm.reviewed_by, gm.reviewed_at, gm.rejection_reason, gm.created_at, gm.updated_at
         FROM gallery_media gm
        WHERE gm.uploader_id = $1
        ORDER BY gm.created_at DESC`,
      [req.user.id]
    );
    return res.json({ media: rows });
  } catch (err) {
    return next(err);
  }
};

export const browseGallery = async (req, res, next) => {
  try {
    const { category_id, year, month, media_type, limit = 20, offset = 0 } = req.query;

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

    const limitNum = Math.min(Number(limit) || 20, 100);
    const offsetNum = Number(offset) || 0;

    params.push(limitNum);
    const limitParam = params.length;
    params.push(offsetNum);
    const offsetParam = params.length;

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows: media } = await query(
      `SELECT gm.id, gm.uploader_id, gm.category_id, gm.media_type, gm.file_url,
              gm.original_filename, gm.caption, gm.duration_seconds, gm.status,
              gm.reviewed_by, gm.reviewed_at, gm.rejection_reason, gm.created_at, gm.updated_at,
              c.name AS category_name, u.full_name AS uploader_name, u.email AS uploader_email
         FROM gallery_media gm
         LEFT JOIN categories c ON c.id = gm.category_id
         LEFT JOIN users u ON u.id = gm.uploader_id
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

    return res.json({ media, total: countRows[0].total });
  } catch (err) {
    return next(err);
  }
};

export const getGalleryItem = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid media id.' });
    }

    const { rows } = await query(
      `SELECT gm.id, gm.uploader_id, gm.category_id, gm.media_type, gm.file_url,
              gm.original_filename, gm.caption, gm.duration_seconds, gm.status,
              gm.reviewed_by, gm.reviewed_at, gm.rejection_reason, gm.created_at, gm.updated_at,
              c.name AS category_name, u.full_name AS uploader_name, u.email AS uploader_email
         FROM gallery_media gm
         LEFT JOIN categories c ON c.id = gm.category_id
         LEFT JOIN users u ON u.id = gm.uploader_id
        WHERE gm.id = $1 AND gm.status = 'approved'`,
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ status: 404, message: 'Media not found.' });
    }

    return res.json({ media: rows[0] });
  } catch (err) {
    return next(err);
  }
};

export const searchGallery = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.status(400).json({ status: 400, message: 'q query parameter is required.' });
    }

    const searchTerm = `%${q.trim()}%`;
    const limit = 50;

    const { rows: media } = await query(
      `SELECT gm.id, gm.uploader_id, gm.category_id, gm.media_type, gm.file_url,
              gm.original_filename, gm.caption, gm.duration_seconds, gm.status,
              gm.reviewed_by, gm.reviewed_at, gm.rejection_reason, gm.created_at, gm.updated_at,
              c.name AS category_name, u.full_name AS uploader_name, u.email AS uploader_email
         FROM gallery_media gm
         LEFT JOIN categories c ON c.id = gm.category_id
         LEFT JOIN users u ON u.id = gm.uploader_id
        WHERE gm.status = 'approved'
          AND (
            gm.caption ILIKE $1
            OR gm.original_filename ILIKE $1
            OR c.name ILIKE $1
          )
         ORDER BY gm.created_at DESC
         LIMIT $2`,
      [searchTerm, limit]
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
      [searchTerm]
    );

    return res.json({ media, total: countRows[0].total });
  } catch (err) {
    return next(err);
  }
};

export default {
  uploadMediaHandler,
  listPendingMedia,
  approveMedia,
  rejectMedia,
  myUploads,
  browseGallery,
  getGalleryItem,
  searchGallery,
};