import * as dashboardModel from './dashboardModel.js';

/**
 * GET /api/dashboard/stats (admin only)
 * Returns aggregate counts for the admin dashboard:
 * users by role, announcements by type, gallery media by status.
 */
export const getDashboardStats = async (_req, res, next) => {
  try {
    const [userRows, announcementRows, mediaRows] = await Promise.all([
      dashboardModel.getUsersByRole(),
      dashboardModel.getAnnouncementsByType(),
      dashboardModel.getGalleryByStatus(),
    ]);

    const byRole = { admin: 0, teacher: 0, student: 0 };
    for (const row of userRows) {
      if (row.role in byRole) byRole[row.role] = row.count;
    }

    const byType = { general: 0, class: 0 };
    for (const row of announcementRows) {
      if (row.type in byType) byType[row.type] = row.count;
    }

    const byStatus = { pending: 0, approved: 0, rejected: 0 };
    for (const row of mediaRows) {
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
