import { query } from '../../shared/config/db.js';

export const listLogs = async ({ action, entity_type, user_id, limit, offset } = {}) => {
  const conditions = [];
  const params = [];

  if (typeof action === 'string' && action.trim() !== '') {
    params.push(action.trim());
    conditions.push(`l.action = $${params.length}`);
  }
  if (typeof entity_type === 'string' && entity_type.trim() !== '') {
    params.push(entity_type.trim());
    conditions.push(`l.entity_type = $${params.length}`);
  }
  const userId = Number(user_id);
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

  return { logs, total: countRows[0]?.total ?? 0 };
};

export default { listLogs };
