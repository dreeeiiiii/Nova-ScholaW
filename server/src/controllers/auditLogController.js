import { query } from '../config/db.js';

const normalizeLimit = (raw) => {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? Math.min(value, 200) : 50;
};

const normalizeOffset = (raw) => {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : 0;
};

/**
 * GET /api/audit-logs (admin only)
 * Paginated list of recent audit logs, newest first.
 * Optional filters: ?action=…&entity_type=…&user_id=…
 */
export const listAuditLogs = async (req, res, next) => {
  try {
    const limit = normalizeLimit(req.query.limit);
    const offset = normalizeOffset(req.query.offset);

    const conditions = [];
    const params = [];

    if (typeof req.query.action === 'string' && req.query.action.trim() !== '') {
      params.push(req.query.action.trim());
      conditions.push(`l.action = $${params.length}`);
    }
    if (typeof req.query.entity_type === 'string' && req.query.entity_type.trim() !== '') {
      params.push(req.query.entity_type.trim());
      conditions.push(`l.entity_type = $${params.length}`);
    }
    const userId = Number(req.query.user_id);
    if (Number.isInteger(userId) && userId > 0) {
      params.push(userId);
      conditions.push(`l.user_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit);
    const limitParam = params.length;
    params.push(offset);
    const offsetParam = params.length;

    const { rows: logs } = await query(
      `SELECT l.id, l.user_id, l.action, l.entity_type, l.entity_id,
              l.details, l.ip_address, l.created_at,
              u.email AS user_email, u.full_name AS user_name
         FROM audit_logs l
         LEFT JOIN users u ON u.id = l.user_id
         ${where}
         ORDER BY l.created_at DESC
         LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params
    );

    const { rows: countRows } = await query(
      `SELECT COUNT(*)::int AS total FROM audit_logs l ${where}`,
      params.slice(0, params.length - 2)
    );

    return res.json({ logs, total: countRows[0]?.total ?? 0, limit, offset });
  } catch (err) {
    return next(err);
  }
};

export default { listAuditLogs };
