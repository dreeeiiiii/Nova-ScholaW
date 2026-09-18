import { query } from '../../shared/config/db.js';

/**
 * Write an audit log row. Must NEVER block the main request:
 * on failure, logs to console and resolves (returns null).
 *
 * @param {object} params
 * @param {number|null} [params.userId] - acting user id (null = system/anonymous)
 * @param {string} params.action - e.g. 'auth.login_success', 'announcement.create'
 * @param {string} params.entityType - e.g. 'user', 'announcement', 'gallery_media', 'category', 'auth'
 * @param {number|null} [params.entityId]
 * @param {object|null} [params.details] - JSONB-serializable change summary
 * @param {string|null} [params.ipAddress]
 * @returns {Promise<object|null>} inserted row or null on failure
 */
export const logAction = async ({ userId = null, action, entityType, entityId = null, details = null, ipAddress = null } = {}) => {
  try {
    if (!action || !entityType) {
      console.error('[audit] missing required fields: action and entityType are required.');
      return null;
    }
    const { rows } = await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       RETURNING id, user_id, action, entity_type, entity_id, details, ip_address, created_at`,
      [
        userId ?? null,
        action,
        entityType,
        entityId ?? null,
        details === null || details === undefined ? null : JSON.stringify(details),
        ipAddress ?? null,
      ]
    );
    return rows[0] ?? null;
  } catch (err) {
    console.error('[audit] failed to write audit log:', err.message);
    return null;
  }
};

const getIp = (req) => req?.ip ?? req?.socket?.remoteAddress ?? null;

const getUserId = (req) => req?.user?.id ?? null;

/**
 * Convenience helper for controllers:
 *   await audit(req, 'announcement.create', 'announcement', id, { title });
 * Never throws — safe to await inline without try/catch.
 */
export const audit = async (req, action, entityType, entityId = null, details = null) => {
  try {
    return await logAction({
      userId: getUserId(req),
      action,
      entityType,
      entityId,
      details,
      ipAddress: getIp(req),
    });
  } catch (err) {
    console.error('[audit] audit helper failed:', err?.message ?? err);
    return null;
  }
};

export default { logAction, audit };
