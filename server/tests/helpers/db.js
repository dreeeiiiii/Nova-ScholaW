import pool from '../../src/config/db.js';

export const EXPECTED_TABLES = Object.freeze([
  'users',
  'sections',
  'courses',
  'announcements',
  'announcement_targets',
  'gallery_media',
  'categories',
  'audit_logs',
]);

export const fetchExistingTables = async () => {
  const { rows } = await pool.query(
    `SELECT tablename
       FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename = ANY($1)
      ORDER BY tablename`,
    [EXPECTED_TABLES]
  );
  return rows.map((r) => r.tablename);
};

export const listMissingTables = async () => {
  const existing = await fetchExistingTables();
  return EXPECTED_TABLES.filter((t) => !existing.includes(t));
};

export const closePool = () => pool.end();