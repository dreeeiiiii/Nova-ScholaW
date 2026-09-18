import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool, { closePool } from '../src/shared/config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.join(__dirname, '..');

const run = async () => {
  const g = await pool.query(
    "SELECT id, file_url, original_filename, status FROM gallery_media WHERE file_url LIKE '/uploads/%' ORDER BY id"
  );
  console.log(`gallery rows with /uploads/ prefix: ${g.rowCount}`);
  let missing = 0;
  for (const row of g.rows) {
    const diskPath = path.join(UPLOADS_ROOT, row.file_url.replace(/^\/+/, '').replace(/\//g, path.sep));
    const exists = fs.existsSync(diskPath);
    const size = exists ? fs.statSync(diskPath).size : -1;
    if (!exists) missing += 1;
    console.log(`${row.id} | ${row.status} | ${row.file_url} | exists=${exists} size=${size}`);
  }
  console.log(`gallery missing on disk: ${missing}/${g.rowCount}`);

  const a = await pool.query(
    "SELECT id, title, image_url FROM announcements WHERE image_url LIKE '/uploads/%' ORDER BY id"
  );
  console.log(`announcement rows with /uploads/ image: ${a.rowCount}`);
  let aMissing = 0;
  for (const row of a.rows) {
    const diskPath = path.join(UPLOADS_ROOT, row.image_url.replace(/^\/+/, '').replace(/\//g, path.sep));
    const exists = fs.existsSync(diskPath);
    const size = exists ? fs.statSync(diskPath).size : -1;
    if (!exists) aMissing += 1;
    console.log(`${row.id} | ${row.image_url} | size=${size} | ${row.title.substring(0, 45)}`);
  }
  console.log(`announcements missing on disk: ${aMissing}/${a.rowCount}`);

  // Duplicate file usage check
  const allUrls = [...g.rows.map((r) => r.file_url), ...a.rows.map((r) => r.image_url)];
  const dupes = allUrls.filter((u, i) => allUrls.indexOf(u) !== i);
  console.log(`duplicate file_url/image_url values: ${dupes.length ? dupes.join(', ') : 'none'}`);

  await closePool();
  if (missing + aMissing > 0) process.exit(1);
};

run().catch(async (err) => {
  console.error('[verify] Failed:', err.message);
  await closePool().catch(() => {});
  process.exit(1);
});
