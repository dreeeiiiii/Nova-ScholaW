import { normalizeLimit, normalizeOffset } from '../../shared/utils/normalize.js';
import { listLogs } from './auditLogModel.js';

/**
 * GET /api/audit-logs (admin only)
 * Paginated list of recent audit logs, newest first.
 * Optional filters: ?action=…&entity_type=…&user_id=…
 */
export const listAuditLogs = async (req, res, next) => {
  try {
    const limit = normalizeLimit(req.query.limit);
    const offset = normalizeOffset(req.query.offset);

    const { logs, total } = await listLogs({
      action: req.query.action,
      entity_type: req.query.entity_type,
      user_id: req.query.user_id,
      limit,
      offset,
    });

    return res.json({ logs, total, limit, offset });
  } catch (err) {
    return next(err);
  }
};

export default { listAuditLogs };
