import { query } from '../config/db.js';

/**
 * GET /api/dashboard/stats (admin only)
 * Returns aggregate counts for the admin dashboard:
 * users by role, announcements by type, gallery media by status.
 */
export const getDashboardStats = async (_req, res, next) => {
  try {
    const [userRows, announcementRows, mediaRows] = await Promise.all([
      query(
        `SELECT role, COUNT(*)::int AS count FROM users GROUP BY role`
      ),
      query(
        `SELECT type, COUNT(*)::int AS count FROM announcements GROUP BY type`
      ),
      query(
        `SELECT status, COUNT(*)::int AS count FROM gallery_media GROUP BY status`
      ),
    ]);

    const byRole = { admin: 0, teacher: 0, student: 0 };
    for (const row of userRows.rows) {
      if (row.role in byRole) byRole[row.role] = row.count;
    }

    const byType = { general: 0, class: 0 };
    for (const row of announcementRows.rows) {
      if (row.type in byType) byType[row.type] = row.count;
    }

    const byStatus = { pending: 0, approved: 0, rejected: 0 };
    for (const row of mediaRows.rows) {
      if (row.status in byStatus) byStatus[row.status] = row.count;
    }

    return res.json({
      users: {
        total: byRole.admin + byRole.teacher + byRole.student,
        ...byRole,
      },
      announcements: {
        total: byType.general + byType.class,
        ...byType,
      },
      gallery: {
        total: byStatus.pending + byStatus.approved + byStatus.rejected,
        ...byStatus,
      },
    });
  } catch (err) {
    return next(err);
  }
};

export default { getDashboardStats };
