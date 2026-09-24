import { query, closePool } from '../src/shared/config/db.js';

// Dev helper — NOT wired into any npm script or startup path. Run manually:
//   node scripts/wipe-legacy-media-rows.js --yes
// Heuristic: new B2 keys start with 'announcements/' or 'gallery/'.
// A b2_key holding anything else is a legacy Cloudinary public ID.

const CONFIRMED = process.argv.includes('--yes');

const LEGACY_WHERE = `b2_key IS NOT NULL AND b2_key NOT LIKE 'announcements/%' AND b2_key NOT LIKE 'gallery/%'`;

const run = async () => {
  const [{ rows: annCount }, { rows: galCount }] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM announcements WHERE ${LEGACY_WHERE}`),
    query(`SELECT COUNT(*)::int AS total FROM gallery_media WHERE ${LEGACY_WHERE}`),
  ]);
  const total = annCount[0].total + galCount[0].total;
  console.log(`Legacy rows — announcements: ${annCount[0].total}, gallery_media: ${galCount[0].total}, total: ${total}`);

  if (!CONFIRMED) {
    console.log('Dry run — re-run with --yes to delete these rows.');
    return;
  }

  const [{ rows: delAnn }, { rows: delGal }] = await Promise.all([
    query(`DELETE FROM announcements WHERE ${LEGACY_WHERE} RETURNING id`),
    query(`DELETE FROM gallery_media WHERE ${LEGACY_WHERE} RETURNING id`),
  ]);
  console.log(`Deleted ${delAnn.length} announcements + ${delGal.length} gallery_media legacy rows (--yes confirmed).`);
};

run()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Failed:', err.message);
    await closePool().catch(() => {});
    process.exit(1);
  });
