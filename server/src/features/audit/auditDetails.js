// Audit summaries deliberately exclude free text, credentials, URLs and request bodies.
const enums = {
  role: ['student', 'teacher', 'admin'], type: ['general', 'department', 'class'],
  status: ['draft', 'scheduled', 'published', 'archived', 'pending', 'approved', 'rejected', 'failed', 'partial_failure', 'configuration_blocked', 'accepted', 'skipped', 'mock', 'no_recipients'],
  media_type: ['image'],
};
const ids = new Set(['department_id', 'previous_department_id', 'section_id', 'previous_section_id', 'course_id', 'previous_course_id', 'category_id']);
const counts = new Set(['recipient_count', 'accepted_count', 'failed_count']);
const fields = new Set(['role', 'department_id', 'section_id', 'course_id', 'full_name', 'title', 'content', 'status', 'publish_at', 'expires_at', 'image_url']);

export function safeAuditDetails(details) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
  const safe = {};
  for (const [key, value] of Object.entries(details)) {
    if (enums[key]?.includes(value)) safe[key] = value;
    else if (ids.has(key) && (value === null || /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)))) safe[key] = value === null ? null : Number(value);
    else if (counts.has(key) && Number.isSafeInteger(value) && value >= 0) safe[key] = value;
    else if (['scheduled', 'direct_upload', 'featured'].includes(key) && typeof value === 'boolean') safe[key] = value;
    else if (key === 'updated_fields' && Array.isArray(value)) safe[key] = value.filter(v => fields.has(v));
  }
  return Object.keys(safe).length ? safe : null;
}
