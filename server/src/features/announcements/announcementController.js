import * as announcementRepo from './announcementModel.js';
import { audit } from '../audit/auditService.js';
import { parseId } from '../../shared/utils/parseId.js';
import { readNonEmpty, readOptionalString, readOptionalDate } from '../../shared/utils/normalize.js';

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

    await audit(req, 'announcement.create', 'announcement', announcement.id, { type: 'general', title });

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

    const { announcement, targets } = await announcementRepo.createClassWithTargets({
      author_id: req.user.id,
      title,
      content,
      image_url,
      status,
      publish_at,
      expires_at,
      section_ids,
      course_ids,
      student_ids,
    });

    await audit(req, 'announcement.create', 'announcement', announcement.id, {
      type: 'class',
      title,
      targets: { section_ids, course_ids, student_ids },
    });

    return res.status(201).json({ announcement, targets });
  } catch (err) {
    return next(err);
  }
};

export const listAnnouncements = async (req, res, next) => {
  try {
    const statusRaw = req.query.status;
    const status = statusRaw === 'draft' || statusRaw === 'scheduled' || statusRaw === 'published' || statusRaw === 'archived'
      ? statusRaw
      : undefined;
    const upcomingRaw = req.query.upcoming;
    const isUpcoming = upcomingRaw === 'true';
    const rawQ = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const q = rawQ === '' ? undefined : rawQ;

    if (isUpcoming && status !== undefined) {
      return res.status(400).json({ status: 400, message: '?upcoming=true cannot be combined with ?status.' });
    }

    if (isUpcoming) {
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
      const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
      let announcements;
      let total;
      if (req.user.role === 'student') {
        announcements = await announcementRepo.listUpcomingForStudent({
          userId: req.user.id,
          section_id: req.user.section_id,
          course_id: req.user.course_id,
          limit,
          offset,
        });
        total = await announcementRepo.countUpcomingForStudent({
          userId: req.user.id,
          section_id: req.user.section_id,
          course_id: req.user.course_id,
        });
      } else {
        announcements = await announcementRepo.listUpcoming({ limit, offset });
        total = await announcementRepo.countUpcoming();
      }
      return res.json({ announcements, total });
    }

    const type = req.query.type === 'general' || req.query.type === 'class' ? req.query.type : undefined;
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
        q,
      });
      total = announcements.length;
    } else {
      announcements = await announcementRepo.listAnnouncements({ type, author_id: undefined, status, limit, offset, q });
      total = await announcementRepo.countAnnouncements({ type, author_id: undefined, status, q });
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

      const result = await announcementRepo.updateWithTargets(id, {
        fields,
        section_ids: existing.type === 'class' ? section_ids : [],
        course_ids: existing.type === 'class' ? course_ids : [],
        student_ids: existing.type === 'class' ? student_ids : [],
      });
      announcement = result.announcement;
      targets = result.targets;
    } else {
      announcement = await announcementRepo.updateAnnouncement(id, fields);
    }

    if (!targets.length && existing.type === 'class') {
      targets = await announcementRepo.getTargets(id);
    }

    await audit(req, 'announcement.update', 'announcement', id, { updated_fields: Object.keys(fields) });

    return res.json({ announcement, targets });
  } catch (err) {
    return next(err);
  }
};

export const tvAnnouncements = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const { rows } = await announcementRepo.findPublishedGeneral({ limit });
    const sanitized = rows.map(({ id, title, content, image_url, created_at }) => ({
      id,
      title,
      content,
      image_url,
      created_at,
    }));
    return res.json({ announcements: sanitized });
  } catch (err) {
    return next(err);
  }
};

export const uploadAnnouncementImage = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ status: 400, message: 'No image file provided.' });
    }
    const imageUrl = `/uploads/announcements/${file.filename}`;
    return res.status(201).json({ image_url: imageUrl });
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
    await audit(req, 'announcement.delete', 'announcement', id, { title: existing.title, type: existing.type });
    return res.json({ message: 'Announcement deleted.' });
  } catch (err) {
    return next(err);
  }
};