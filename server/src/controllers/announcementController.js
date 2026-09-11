import * as announcementRepo from '../models/announcementModel.js';

const parseId = (raw) => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const readNonEmpty = (value, label) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const readOptionalString = (value) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const readOptionalDate = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString();
};

const parseArrayOfIds = (value, label) => {
  if (!Array.isArray(value)) return null;
  const ids = value
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v > 0);
  if (ids.length === 0) return [];
  return ids;
};

const canUserSeeAnnouncement = (user, announcement, targets = []) => {
  if (user.role === 'admin' || user.role === 'teacher') return true;
  if (announcement.type === 'general') return true;
  if (announcement.type === 'class') {
    return targets.some(
      (t) =>
        (t.target_type === 'section' && t.section_id === user.section_id) ||
        (t.target_type === 'course' && t.course_id === user.course_id) ||
        (t.target_type === 'student' && t.student_id === user.id)
    );
  }
  return false;
};

const canUserModifyAnnouncement = (user, announcement) => {
  if (user.role === 'admin') return true;
  if (user.role === 'teacher' && announcement.author_id === user.id) return true;
  return false;
};

export const createGeneralAnnouncement = async (req, res, next) => {
  try {
    const title = readNonEmpty(req.body?.title, 'title');
    const content = readNonEmpty(req.body?.content, 'content');
    const image_url = readOptionalString(req.body?.image_url);
    const publish_at = readOptionalDate(req.body?.publish_at);
    const expires_at = readOptionalDate(req.body?.expires_at);

    if (title === null || content === null) {
      return res.status(400).json({
        status: 400,
        message: 'Title and content are required.',
      });
    }

    const now = new Date();
    const status = publish_at && new Date(publish_at) > now ? 'scheduled' : 'published';

    const announcement = await announcementRepo.createAnnouncement({
      author_id: req.user.id,
      type: 'general',
      title,
      content,
      image_url,
      status,
      publish_at,
      expires_at,
    });

    return res.status(201).json({ announcement });
  } catch (err) {
    return next(err);
  }
};

export const createClassAnnouncement = async (req, res, next) => {
  try {
    const title = readNonEmpty(req.body?.title, 'title');
    const content = readNonEmpty(req.body?.content, 'content');
    const image_url = readOptionalString(req.body?.image_url);
    const publish_at = readOptionalDate(req.body?.publish_at);
    const expires_at = readOptionalDate(req.body?.expires_at);

    const section_ids = parseArrayOfIds(req.body?.section_ids, 'section_ids') ?? [];
    const course_ids = parseArrayOfIds(req.body?.course_ids, 'course_ids') ?? [];
    const student_ids = parseArrayOfIds(req.body?.student_ids, 'student_ids') ?? [];

    if (title === null || content === null) {
      return res.status(400).json({
        status: 400,
        message: 'Title and content are required.',
      });
    }

    const totalTargets = section_ids.length + course_ids.length + student_ids.length;
    if (totalTargets === 0) {
      return res.status(400).json({
        status: 400,
        message: 'Class announcement must have at least one target (section_ids, course_ids, or student_ids).',
      });
    }

    const now = new Date();
    const status = publish_at && new Date(publish_at) > now ? 'scheduled' : 'published';

    const client = await (await import('../config/db.js')).getClient();
    try {
      await client.query('BEGIN');

      const { rows: annRows } = await client.query(
        `INSERT INTO announcements (author_id, type, title, content, image_url, status, publish_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, author_id, type, title, content, image_url, status, publish_at, expires_at, created_at, updated_at`,
        [req.user.id, 'class', title, content, image_url, status, publish_at, expires_at]
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

      return res.status(201).json({ announcement, targets });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return next(err);
  }
};

export const listAnnouncements = async (req, res, next) => {
  try {
    const type = req.query.type === 'general' || req.query.type === 'class' ? req.query.type : undefined;
    const status = req.query.status === 'draft' || req.query.status === 'scheduled' || req.query.status === 'published' || req.query.status === 'archived'
      ? req.query.status
      : undefined;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    let announcements;
    let total;

    if (req.user.role === 'student') {
      announcements = await announcementRepo.listForStudent({
        userId: req.user.id,
        section_id: req.user.section_id,
        course_id: req.user.course_id,
        limit,
        offset,
      });
      total = announcements.length;
    } else {
      announcements = await announcementRepo.listAnnouncements({ type, author_id: undefined, status, limit, offset });
      total = await announcementRepo.countAnnouncements({ type, author_id: undefined, status });
    }

    return res.json({ announcements, total });
  } catch (err) {
    return next(err);
  }
};

export const getAnnouncement = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid announcement id.' });
    }

    const announcement = await announcementRepo.findById(id);
    if (!announcement) {
      return res.status(404).json({ status: 404, message: 'Announcement not found.' });
    }

    const targets = await announcementRepo.getTargets(id);

    if (!canUserSeeAnnouncement(req.user, announcement, targets)) {
      return res.status(403).json({ status: 403, message: 'You do not have permission to view this announcement.' });
    }

    return res.json({ announcement, targets });
  } catch (err) {
    return next(err);
  }
};

export const updateAnnouncement = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid announcement id.' });
    }

    const existing = await announcementRepo.findById(id);
    if (!existing) {
      return res.status(404).json({ status: 404, message: 'Announcement not found.' });
    }

    if (!canUserModifyAnnouncement(req.user, existing)) {
      return res.status(403).json({ status: 403, message: 'You do not have permission to edit this announcement.' });
    }

    const title = readOptionalString(req.body?.title);
    const content = readOptionalString(req.body?.content);
    const image_url = readOptionalString(req.body?.image_url);
    const status = req.body?.status === 'draft' || req.body?.status === 'scheduled' || req.body?.status === 'published' || req.body?.status === 'archived'
      ? req.body.status
      : undefined;
    const publish_at = readOptionalDate(req.body?.publish_at);
    const expires_at = readOptionalDate(req.body?.expires_at);

    const section_ids = parseArrayOfIds(req.body?.section_ids, 'section_ids');
    const course_ids = parseArrayOfIds(req.body?.course_ids, 'course_ids');
    const student_ids = parseArrayOfIds(req.body?.student_ids, 'student_ids');

    const hasTargetUpdates = section_ids !== null || course_ids !== null || student_ids !== null;

    const fields = {};
    if (title !== null) fields.title = title;
    if (content !== null) fields.content = content;
    if (image_url !== null) fields.image_url = image_url;
    if (status !== undefined) fields.status = status;
    if (publish_at !== null) fields.publish_at = publish_at;
    if (expires_at !== null) fields.expires_at = expires_at;

    let announcement;
    let targets = [];

    if (hasTargetUpdates) {
      if (existing.type === 'class') {
        const totalTargets = (section_ids?.length ?? 0) + (course_ids?.length ?? 0) + (student_ids?.length ?? 0);
        if (totalTargets === 0) {
          return res.status(400).json({
            status: 400,
            message: 'Class announcement must have at least one target (section_ids, course_ids, or student_ids).',
          });
        }
      }

      const client = await (await import('../config/db.js')).getClient();
      try {
        await client.query('BEGIN');

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
             RETURNING id, author_id, type, title, content, image_url, status, publish_at, expires_at, created_at, updated_at`,
            params
          );
          announcement = rows[0];
        } else {
          announcement = existing;
        }

        await client.query('DELETE FROM announcement_targets WHERE announcement_id = $1', [id]);

        if (existing.type === 'class') {
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
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      announcement = await announcementRepo.updateAnnouncement(id, fields);
    }

    if (!targets.length && existing.type === 'class') {
      targets = await announcementRepo.getTargets(id);
    }

    return res.json({ announcement, targets });
  } catch (err) {
    return next(err);
  }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid announcement id.' });
    }

    const existing = await announcementRepo.findById(id);
    if (!existing) {
      return res.status(404).json({ status: 404, message: 'Announcement not found.' });
    }

    if (!canUserModifyAnnouncement(req.user, existing)) {
      return res.status(403).json({ status: 403, message: 'You do not have permission to delete this announcement.' });
    }

    await announcementRepo.deleteAnnouncement(id);
    return res.json({ message: 'Announcement deleted.' });
  } catch (err) {
    return next(err);
  }
};