import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { query } from '../src/shared/config/db.js';
import { closePool } from '../src/shared/config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const run = async () => {
  const { rows } = await query(`SELECT id, file_url FROM gallery_media WHERE file_url LIKE '/uploads/%'`);
  let deleted = 0;
  let kept = 0;

  for (const row of rows) {
    const fileUrl = row.file_url;
    // Strip /uploads/ prefix
    const relative = fileUrl.replace(/^\/uploads\//, '');
    const fullPath = path.join(__dirname, '../uploads', relative);
    const exists = fs.existsSync(fullPath);
    if (!exists) {
      await query(`DELETE FROM gallery_media WHERE id = $1`, [row.id]);
      deleted++;
    } else {
      kept++;
    }
  }

  console.log(`Deleted ${deleted} orphaned rows, kept ${kept} with existing files`);
};

run()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Failed:', err.message);
    await closePool().catch(() => {});
    process.exit(1);
  });
