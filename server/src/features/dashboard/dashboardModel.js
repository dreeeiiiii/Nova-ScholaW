import { query } from '../../shared/config/db.js';

export const getUsersByRole = async () => {
  const { rows } = await query(`SELECT role, COUNT(*)::int AS count FROM users GROUP BY role`);
  return rows;
};

export const getAnnouncementsByType = async () => {
  const { rows } = await query(`SELECT type, COUNT(*)::int AS count FROM announcements GROUP BY type`);
  return rows;
};

export const getGalleryByStatus = async () => {
  const { rows } = await query(`SELECT status, COUNT(*)::int AS count FROM gallery_media GROUP BY status`);
  return rows;
};

export default { getUsersByRole, getAnnouncementsByType, getGalleryByStatus };
