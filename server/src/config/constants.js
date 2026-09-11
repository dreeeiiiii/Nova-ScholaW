export const ROLES = Object.freeze({
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
});

export const ROLE_LIST = Object.freeze(Object.values(ROLES));

export const ANNOUNCEMENT_TYPES = Object.freeze({
  GENERAL: 'general',
  CLASS: 'class',
});

export const ANNOUNCEMENT_STATUSES = Object.freeze({
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
});

export const ANNOUNCEMENT_STATUS_LIST = Object.freeze(Object.values(ANNOUNCEMENT_STATUSES));

export const ANNOUNCEMENT_ALLOWED_TRANSITIONS = Object.freeze({
  draft: ['scheduled', 'published'],
  scheduled: ['published', 'draft'],
  published: ['archived'],
  archived: ['published'],
});

export const TARGET_TYPES = Object.freeze({
  SECTION: 'section',
  COURSE: 'course',
  STUDENT: 'student',
});

export const MEDIA_TYPES = Object.freeze({
  IMAGE: 'image',
  VIDEO: 'video',
});

export const MEDIA_STATUSES = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

export const MEDIA_STATUS_LIST = Object.freeze(Object.values(MEDIA_STATUSES));

export const FILE_RULES = Object.freeze({
  image: {
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeMb: 10,
  },
  video: {
    allowedExtensions: ['.mp4'],
    allowedMimeTypes: ['video/mp4'],
    maxSizeMb: 50,
    maxDurationSeconds: 120,
  },
});