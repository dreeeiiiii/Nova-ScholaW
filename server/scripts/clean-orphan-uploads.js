import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import config from '../src/shared/config/env.js';
import { query } from '../src/shared/config/db.js';
import { closePool } from '../src/shared/config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Safety: deleting B2 objects is irreversible. Default is dry-run;
// pass --yes to actually delete.
const CONFIRMED = process.argv.includes('--yes');

const s3 = new S3Client({
  endpoint: `https://${config.b2Endpoint}`,
  region: config.b2Region,
  credentials: {
    accessKeyId: config.b2KeyId,
    secretAccessKey: config.b2ApplicationKey,
  },
  forcePathStyle: true, // REQUIRED for Backblaze B2
});

const listAllB2Keys = async () => {
  const keys = [];
  let continuationToken;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: config.b2BucketName,
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of res.Contents ?? []) keys.push(obj.Key);
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
};

const run = async () => {
  // --- Pass 1 (B2): find B2 objects with no matching b2_key in Postgres ---
  const [{ rows: annRows }, { rows: galRows }] = await Promise.all([
    query(`SELECT b2_key FROM announcements WHERE b2_key IS NOT NULL`),
    query(`SELECT b2_key FROM gallery_media WHERE b2_key IS NOT NULL`),
  ]);
  const referenced = new Set(
    [...annRows, ...galRows].map((r) => r.b2_key).filter(Boolean)
  );

  const bucketKeys = await listAllB2Keys();
  const orphans = bucketKeys.filter((k) => !referenced.has(k));

  console.log(`B2 objects: ${bucketKeys.length}, referenced b2_keys: ${referenced.size}, orphans: ${orphans.length}`);
  if (!CONFIRMED) {
    console.log('Dry run — re-run with --yes to delete orphaned B2 objects.');
    for (const k of orphans.slice(0, 20)) console.log(`  orphan: ${k}`);
    if (orphans.length > 20) console.log(`  ...and ${orphans.length - 20} more`);
  } else {
    let deleted = 0;
    for (const k of orphans) {
      await s3.send(new DeleteObjectCommand({ Bucket: config.b2BucketName, Key: k }));
      deleted++;
    }
    console.log(`Deleted ${deleted} orphaned B2 objects (--yes confirmed).`);
  }

  // --- Pass 2 (legacy): drop gallery rows whose local /uploads/ file is gone ---
  const { rows } = await query(`SELECT id, file_url FROM gallery_media WHERE file_url LIKE '/uploads/%'`);
  let deletedRows = 0;
  let kept = 0;

  for (const row of rows) {
    const fileUrl = row.file_url;
    // Strip /uploads/ prefix
    const relative = fileUrl.replace(/^\/uploads\//, '');
    const fullPath = path.join(__dirname, '../uploads', relative);
    const exists = fs.existsSync(fullPath);
    if (!exists) {
      await query(`DELETE FROM gallery_media WHERE id = $1`, [row.id]);
      deletedRows++;
    } else {
      kept++;
    }
  }

  console.log(`Deleted ${deletedRows} orphaned rows, kept ${kept} with existing files`);
};

run()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Failed:', err.message);
    await closePool().catch(() => {});
    process.exit(1);
  });
